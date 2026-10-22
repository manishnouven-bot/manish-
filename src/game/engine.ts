import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Mission, TruckConfig, TruckStats } from '../types';
import { computeTruckConfig } from './constants';
import { PhysicsEngine } from './physics';
import { SnowSystem } from './snowSystem';
import { buildMissionWorld, WorldData } from './worldBuilder';
import { createPlowTruck, TruckMeshComponents } from './truckBuilder';
import { soundManager } from './audio';
import { calculateStarRating } from './rules';

export interface GameEngineCallbacks {
  onProgressUpdate: (data: {
    clearedPercent: number;
    score: number;
    coins: number;
    combo: number;
    speed: number;
    boostFuel: number;
    timeRemaining: number;
  }) => void;
  onMissionVictory: (data: {
    clearedPercent: number;
    score: number;
    coinsEarned: number;
    timeSpent: number;
    stars: number;
  }) => void;
  onGameOver: (data: {
    clearedPercent: number;
    score: number;
    timeSpent: number;
  }) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;

  private clock: THREE.Clock = new THREE.Clock();
  private animFrameId: number = 0;
  private timeoutId: number = 0;
  private isRunning: boolean = false;

  private physics: PhysicsEngine = new PhysicsEngine();
  private snowSystem: SnowSystem = new SnowSystem();
  private worldData: WorldData | null = null;
  private truckMesh: TruckMeshComponents | null = null;

  public currentMission: Mission;
  public truckStats: TruckStats;
  public truckConfig: TruckConfig;

  // Run stats
  public currentScore: number = 0;
  public sessionCoinsEarned: number = 0;
  public missionTimeElapsed: number = 0;
  public gameState: 'title' | 'playing' | 'paused' | 'victory' | 'gameover' = 'title';

  // Input state
  public inputs = {
    throttle: 0,
    steer: 0,
    brake: false,
    boost: false,
  };
  private heldKeys: Set<string> = new Set();

  // Camera damping targets
  private camOffset = new THREE.Vector3(22, 24, 22); // Isometric angle
  private camLookTarget = new THREE.Vector3(0, 0, 0);

  // Camera Shake
  private trauma: number = 0;

  // Title camera tour
  private titleTourAngle: number = 0;

  private callbacks: GameEngineCallbacks;
  private lastUiPushTime: number = 0;

  constructor(container: HTMLElement, mission: Mission, stats: TruckStats, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.currentMission = mission;
    this.truckStats = stats;
    this.truckConfig = computeTruckConfig(stats);
    this.callbacks = callbacks;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Isometric-feel camera with moderate FOV (38 degrees)
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 300);
    this.camera.position.set(28, 30, 28);
    this.camera.lookAt(0, 0, 0);

    // Studio reflection environment
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    this.setupListeners();
    this.loadMission(mission, stats);
    this.startLoop();
  }

  public loadMission(mission: Mission, stats: TruckStats) {
    this.currentMission = mission;
    this.truckStats = stats;
    this.truckConfig = computeTruckConfig(stats);

    // Reset scores & time
    this.currentScore = 0;
    this.sessionCoinsEarned = 0;
    this.missionTimeElapsed = 0;

    // Clear previous scene children except camera
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
    }

    // Build 3D World
    this.worldData = buildMissionWorld(this.scene, mission);
    this.physics.setObstacles(this.worldData.obstacles, this.worldData.worldBounds);

    // Spawn Truck
    this.physics.initTruck(
      this.worldData.spawn.x,
      this.worldData.spawn.z,
      this.worldData.spawn.rot,
      this.truckConfig.boostMax
    );

    // Build 3D Truck Mesh
    this.truckMesh = createPlowTruck(this.truckConfig);
    this.scene.add(this.truckMesh.group);
    this.truckMesh.group.position.set(this.physics.truck.x, 0, this.physics.truck.z);
    this.truckMesh.group.rotation.y = this.physics.truck.rotation;

    // Initialize Snow Field & Target Road Grid
    this.snowSystem.initSnowField(this.scene, this.worldData.worldBounds, this.worldData.targetRoadRects);

    // Initial camera position snap
    this.camLookTarget.set(this.physics.truck.x, 0, this.physics.truck.z);
    this.camera.position.copy(this.camLookTarget).add(this.camOffset);
    this.camera.lookAt(this.camLookTarget);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public setGameState(state: 'title' | 'playing' | 'paused' | 'victory' | 'gameover') {
    this.gameState = state;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = state;
    }
    if (state === 'playing') {
      soundManager.resume();
      this.heldKeys.clear();
      this.inputs.throttle = 0;
      this.inputs.steer = 0;
      this.inputs.brake = false;
      this.inputs.boost = false;
    }
  }

  public setTouchInputs(steer: number, throttle: number, brake: boolean, boost: boolean) {
    this.inputs.steer = steer;
    this.inputs.throttle = throttle;
    this.inputs.brake = brake;
    this.inputs.boost = boost;
  }

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.heldKeys.add(e.code);

    if (this.gameState === 'title') {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.setGameState('playing');
        return;
      }
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.gameState === 'playing') {
        this.setGameState('paused');
      } else if (this.gameState === 'paused') {
        this.setGameState('playing');
      }
    }

    if (e.code === 'KeyM') {
      soundManager.toggleMute();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handleWindowBlur = () => {
    this.heldKeys.clear();
    this.inputs.throttle = 0;
    this.inputs.steer = 0;
    this.inputs.brake = false;
    this.inputs.boost = false;
  };

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private processKeyboardInputs() {
    if (this.gameState !== 'playing') {
      this.inputs.throttle = 0;
      this.inputs.steer = 0;
      this.inputs.brake = false;
      this.inputs.boost = false;
      return;
    }

    let throttle = 0;
    let steer = 0;

    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) {
      throttle += 1;
    }
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) {
      throttle -= 1;
    }
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) {
      steer += 1;
    }
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) {
      steer -= 1;
    }

    const brake = this.heldKeys.has('Space');
    const boost = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight');

    // Merge with touch if touch is active
    this.inputs.throttle = throttle !== 0 ? throttle : this.inputs.throttle;
    this.inputs.steer = steer !== 0 ? steer : this.inputs.steer;
    this.inputs.brake = brake || this.inputs.brake;
    this.inputs.boost = boost || this.inputs.boost;
  }

  private startLoop() {
    this.isRunning = true;
    this.clock.start();

    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.timeoutId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.timeoutId = window.setTimeout(cb, 80);
        }
      };
      this.timeoutId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (!this.isRunning) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.updateSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.animFrameId = requestAnimationFrame(tick);
    }
  }

  private updateSimulation(dt: number) {
    if (this.gameState === 'title') {
      // Atmospheric slow camera orbit pan around the cozy town
      this.titleTourAngle += dt * 0.15;
      const r = 36;
      this.camera.position.set(
        Math.sin(this.titleTourAngle) * r,
        25 + Math.sin(this.titleTourAngle * 0.5) * 4,
        Math.cos(this.titleTourAngle) * r
      );
      this.camera.lookAt(0, 1.5, 0);

      // Ambient snowflakes still flutter
      this.snowSystem.updateParticles(dt);
      return;
    }

    if (this.gameState === 'paused') {
      soundManager.updateTruckAudio(0, false, false);
      return;
    }

    if (this.gameState === 'victory' || this.gameState === 'gameover') {
      this.snowSystem.updateParticles(dt);
      soundManager.updateTruckAudio(0, false, false);
      return;
    }

    // --- Active Playing State ---
    this.missionTimeElapsed += dt;
    this.processKeyboardInputs();

    // 1. Vehicle Physics Update
    const collisionResult = this.physics.update(dt, this.inputs, this.truckConfig);
    if (collisionResult.collided) {
      soundManager.playBump();
      this.trauma = Math.min(1.0, this.trauma + 0.45);
    }

    // 2. Snow Plowing Logic
    const bladeWorld = this.physics.getPlowBladeWorld(this.truckConfig.plowWidth);
    const plowResult = this.snowSystem.plowSnow(
      bladeWorld.left,
      bladeWorld.right,
      bladeWorld.center,
      this.physics.truck.speed,
      this.physics.truck.rotation,
      this.truckConfig.clearingPower,
      this.truckConfig.plowWidth,
      dt
    );

    if (plowResult.newlyCleared > 0) {
      this.currentScore += plowResult.pointsAwarded;
      this.sessionCoinsEarned += plowResult.coinsAwarded;

      // Audio feedback
      if (this.snowSystem.comboCount % 15 === 0) {
        soundManager.playComboUp(this.snowSystem.comboMultiplier);
      }
      if (this.sessionCoinsEarned % 8 === 0 && plowResult.coinsAwarded > 0) {
        soundManager.playCoinDing();
      }
    }

    if (this.physics.truck.isBoosting) {
      soundManager.playBoost();
    }

    // Sound manager update
    const speedRatio = Math.abs(this.physics.truck.speed) / this.truckConfig.maxSpeed;
    soundManager.updateTruckAudio(speedRatio, plowResult.isPlowing, this.physics.truck.isBoosting);

    // 3. Update 3D Truck Mesh
    if (this.truckMesh) {
      this.truckMesh.group.position.set(this.physics.truck.x, 0, this.physics.truck.z);
      this.truckMesh.group.rotation.y = this.physics.truck.rotation;
      this.truckMesh.updateVisuals(
        this.physics.truck.steerAngle,
        this.physics.truck.speed,
        dt,
        this.physics.truck.isBoosting
      );
    }

    // 4. Update Snow Spray & Ambient Particles
    this.snowSystem.updateParticles(dt);

    // 5. Isometric Camera Follow with Smooth Damping
    const targetLookX = this.physics.truck.x;
    const targetLookZ = this.physics.truck.z;

    this.camLookTarget.x = THREE.MathUtils.damp(this.camLookTarget.x, targetLookX, 7.5, dt);
    this.camLookTarget.z = THREE.MathUtils.damp(this.camLookTarget.z, targetLookZ, 7.5, dt);

    // Camera follow position (smooth damping)
    const targetCamX = this.camLookTarget.x + this.camOffset.x;
    const targetCamY = this.camOffset.y;
    const targetCamZ = this.camLookTarget.z + this.camOffset.z;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 7.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 7.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 7.5, dt);

    // Camera shake decay (trauma * trauma)
    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma * 0.45;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.z += (Math.random() - 0.5) * shake;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }

    this.camera.lookAt(this.camLookTarget);

    // 6. Check Win/Loss Conditions
    const clearedPercent = this.snowSystem.getClearedPercent();
    const timeRemaining = this.currentMission.timeLimitSec > 0
      ? Math.max(0, this.currentMission.timeLimitSec - this.missionTimeElapsed)
      : 999;

    // Victory check
    if (clearedPercent >= this.currentMission.targetPercent) {
      this.setGameState('victory');
      soundManager.playVictoryFanfare();
      const stars = calculateStarRating(
        clearedPercent,
        this.currentMission.targetPercent,
        this.missionTimeElapsed,
        this.currentMission.timeLimitSec
      );
      this.callbacks.onMissionVictory({
        clearedPercent,
        score: this.currentScore,
        coinsEarned: this.sessionCoinsEarned + this.currentMission.rewardCoins,
        timeSpent: this.missionTimeElapsed,
        stars,
      });
      return;
    }

    // Time limit defeat check
    if (this.currentMission.timeLimitSec > 0 && timeRemaining <= 0) {
      this.setGameState('gameover');
      soundManager.playBump();
      this.callbacks.onGameOver({
        clearedPercent,
        score: this.currentScore,
        timeSpent: this.missionTimeElapsed,
      });
      return;
    }

    // 7. Push UI state throttled to ~10Hz
    const now = performance.now();
    if (now - this.lastUiPushTime > 85) {
      this.lastUiPushTime = now;
      this.callbacks.onProgressUpdate({
        clearedPercent,
        score: this.currentScore,
        coins: this.sessionCoinsEarned,
        combo: this.snowSystem.comboMultiplier,
        speed: Math.abs(this.physics.truck.speed),
        boostFuel: this.physics.truck.boostFuel,
        timeRemaining,
      });
    }
  }

  public restartCurrentMission() {
    this.loadMission(this.currentMission, this.truckStats);
    this.setGameState('playing');
  }

  public destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    clearTimeout(this.timeoutId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleResize);

    if (this.renderer && this.renderer.domElement) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
  }
}
