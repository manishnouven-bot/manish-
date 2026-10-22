import * as THREE from 'three';
import { calculateComboMultiplier, calculateClearPoints, calculateCoinsEarned } from './rules';

export interface SnowParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

export class SnowSystem {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public snowTexture: THREE.CanvasTexture;
  public snowMesh: THREE.Mesh | null = null;

  // Grid for gameplay statistics
  public gridWidth: number = 80;
  public gridHeight: number = 80;
  public worldSize: number = 120; // -60 to +60 in X and Z
  public roadSnowGrid: Uint8Array; // 0 = not snow target, 1 = snow covered, 2 = cleared
  public totalSnowCells: number = 0;
  public clearedSnowCells: number = 0;

  // Combo system
  public comboCount: number = 0;
  public comboMultiplier: number = 1.0;
  public comboTimer: number = 0; // decays when not plowing

  // Snow particles (pooled)
  public particlePool: SnowParticle[] = [];
  public maxParticles: number = 180;
  public particleInstancedMesh: THREE.InstancedMesh | null = null;
  private dummyObj: THREE.Object3D = new THREE.Object3D();

  // Falling ambient snowflakes
  public ambientSnowSystem: THREE.Points | null = null;
  private ambientPositions: Float32Array | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d')!;

    this.snowTexture = new THREE.CanvasTexture(this.canvas);
    this.snowTexture.colorSpace = THREE.SRGBColorSpace;
    this.snowTexture.minFilter = THREE.LinearFilter;
    this.snowTexture.magFilter = THREE.LinearFilter;

    this.roadSnowGrid = new Uint8Array(this.gridWidth * this.gridHeight);

    // Initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push({
        pos: new THREE.Vector3(0, -100, 0),
        vel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 1.0,
        scale: 1.0,
      });
    }
  }

  public initSnowField(scene: THREE.Scene, worldBounds: { size: number }, targetRects: { x: number; z: number; w: number; d: number }[]) {
    this.worldSize = worldBounds.size;
    this.totalSnowCells = 0;
    this.clearedSnowCells = 0;
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    // Clear canvas with transparent
    this.ctx.clearRect(0, 0, 512, 512);

    // Fill canvas initially with transparent
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    this.ctx.fillRect(0, 0, 512, 512);

    // Clear grid
    this.roadSnowGrid.fill(0);

    // Paint snow layer onto the canvas where roads, driveways, and plazas are
    // We render a soft, sparkling crisp snow texture on drivable surfaces
    this.ctx.fillStyle = '#f8fafc'; // Crisp snow white

    for (const rect of targetRects) {
      // Map world coords to canvas coords [0, 512]
      const cx = ((rect.x - rect.w / 2 + this.worldSize / 2) / this.worldSize) * 512;
      const cy = ((rect.z - rect.d / 2 + this.worldSize / 2) / this.worldSize) * 512;
      const cw = (rect.w / this.worldSize) * 512;
      const cd = (rect.d / this.worldSize) * 512;

      // Draw rounded road snow surface
      this.ctx.beginPath();
      this.ctx.roundRect(cx, cy, cw, cd, 4);
      this.ctx.fill();

      // Mark in logic grid
      const minGx = Math.max(0, Math.floor(((rect.x - rect.w / 2 + this.worldSize / 2) / this.worldSize) * this.gridWidth));
      const maxGx = Math.min(this.gridWidth - 1, Math.floor(((rect.x + rect.w / 2 + this.worldSize / 2) / this.worldSize) * this.gridWidth));
      const minGz = Math.max(0, Math.floor(((rect.z - rect.d / 2 + this.worldSize / 2) / this.worldSize) * this.gridHeight));
      const maxGz = Math.min(this.gridHeight - 1, Math.floor(((rect.z + rect.d / 2 + this.worldSize / 2) / this.worldSize) * this.gridHeight));

      for (let gz = minGz; gz <= maxGz; gz++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          const idx = gz * this.gridWidth + gx;
          if (this.roadSnowGrid[idx] === 0) {
            this.roadSnowGrid[idx] = 1; // Uncleared snow
            this.totalSnowCells++;
          }
        }
      }
    }

    // Add subtle procedural noise sparkles onto the snow canvas
    const imgData = this.ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 10) {
        // Vary snow brightness slightly for sparkling realism
        const n = (Math.random() - 0.5) * 12;
        data[i] = Math.min(255, Math.max(220, 248 + n));
        data[i + 1] = Math.min(255, Math.max(225, 250 + n));
        data[i + 2] = 255;
      }
    }
    this.ctx.putImageData(imgData, 0, 0);
    this.snowTexture.needsUpdate = true;

    // Create Snow Overlay Plane Mesh above the asphalt
    if (this.snowMesh) {
      scene.remove(this.snowMesh);
      this.snowMesh.geometry.dispose();
      (this.snowMesh.material as THREE.Material).dispose();
    }

    const snowGeom = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
    snowGeom.rotateX(-Math.PI / 2);

    const snowMat = new THREE.MeshStandardMaterial({
      map: this.snowTexture,
      transparent: true,
      roughness: 0.85,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });

    this.snowMesh = new THREE.Mesh(snowGeom, snowMat);
    this.snowMesh.position.y = 0.05; // Resting just above the road geometry
    scene.add(this.snowMesh);

    // Setup 3D Particle Spray Mesh
    this.setupParticleSystem(scene);
    this.setupAmbientSnowflakes(scene);
  }

  private setupParticleSystem(scene: THREE.Scene) {
    if (this.particleInstancedMesh) {
      scene.remove(this.particleInstancedMesh);
      this.particleInstancedMesh.geometry.dispose();
      (this.particleInstancedMesh.material as THREE.Material).dispose();
    }

    const sphereGeom = new THREE.DodecahedronGeometry(0.18, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });

    this.particleInstancedMesh = new THREE.InstancedMesh(sphereGeom, particleMat, this.maxParticles);
    this.particleInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleInstancedMesh.frustumCulled = false;

    // Initialize all off-screen
    const m = new THREE.Matrix4().makeTranslation(0, -50, 0);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particleInstancedMesh.setMatrixAt(i, m);
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.particleInstancedMesh);
  }

  private setupAmbientSnowflakes(scene: THREE.Scene) {
    if (this.ambientSnowSystem) {
      scene.remove(this.ambientSnowSystem);
      this.ambientSnowSystem.geometry.dispose();
      (this.ambientSnowSystem.material as THREE.Material).dispose();
    }

    const count = 1200;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 1] = Math.random() * 26 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.ambientPositions = positions;

    const pointsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.ambientSnowSystem = new THREE.Points(geom, pointsMat);
    scene.add(this.ambientSnowSystem);
  }

  // Clear snow at the plow blade position
  public plowSnow(
    bladeLeft: { x: number; z: number },
    bladeRight: { x: number; z: number },
    bladeCenter: { x: number; z: number },
    truckSpeed: number,
    heading: number,
    clearingPower: number,
    plowWidth: number,
    dt: number
  ): { newlyCleared: number; pointsAwarded: number; coinsAwarded: number; isPlowing: boolean } {
    if (truckSpeed <= 0.5) {
      return { newlyCleared: 0, pointsAwarded: 0, coinsAwarded: 0, isPlowing: false };
    }

    // Convert blade positions to canvas space
    const toCanvasX = (wx: number) => ((wx + this.worldSize / 2) / this.worldSize) * 512;
    const toCanvasY = (wz: number) => ((wz + this.worldSize / 2) / this.worldSize) * 512;

    const x1 = toCanvasX(bladeLeft.x);
    const y1 = toCanvasY(bladeLeft.z);
    const x2 = toCanvasX(bladeRight.x);
    const y2 = toCanvasY(bladeRight.z);

    // Erase snow from canvas mask with dynamic blade width
    const strokeWidth = Math.max(14, Math.round((plowWidth / this.worldSize) * 512 * 1.18));
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.lineWidth = strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.restore();

    this.snowTexture.needsUpdate = true;

    // Check cells cleared in the logic grid
    let newlyClearedCount = 0;
    const sampleSteps = 8;
    for (let s = 0; s <= sampleSteps; s++) {
      const t = s / sampleSteps;
      const wx = bladeLeft.x + (bladeRight.x - bladeLeft.x) * t;
      const wz = bladeLeft.z + (bladeRight.z - bladeLeft.z) * t;

      const gx = Math.floor(((wx + this.worldSize / 2) / this.worldSize) * this.gridWidth);
      const gz = Math.floor(((wz + this.worldSize / 2) / this.worldSize) * this.gridHeight);

      // Check small 3x3 footprint
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = gx + dx;
          const cz = gz + dz;
          if (cx >= 0 && cx < this.gridWidth && cz >= 0 && cz < this.gridHeight) {
            const idx = cz * this.gridWidth + cx;
            if (this.roadSnowGrid[idx] === 1) {
              this.roadSnowGrid[idx] = 2; // Marked cleared
              this.clearedSnowCells++;
              newlyClearedCount++;
            }
          }
        }
      }
    }

    const isPlowing = newlyClearedCount > 0;

    // Combo management
    if (isPlowing) {
      this.comboCount += newlyClearedCount;
      this.comboMultiplier = calculateComboMultiplier(this.comboCount);
      this.comboTimer = 2.4; // 2.4s window before combo drops

      // Spawn snow spray particles to the right/side of blade
      this.spawnSnowSpray(bladeRight, bladeCenter, heading, truckSpeed);
    } else {
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboCount = 0;
          this.comboMultiplier = 1.0;
        }
      }
    }

    let pointsAwarded = 0;
    let coinsAwarded = 0;
    if (newlyClearedCount > 0) {
      pointsAwarded = calculateClearPoints(newlyClearedCount, this.comboMultiplier, clearingPower);
      coinsAwarded = calculateCoinsEarned(newlyClearedCount, clearingPower);
    }

    return {
      newlyCleared: newlyClearedCount,
      pointsAwarded,
      coinsAwarded,
      isPlowing,
    };
  }

  private spawnSnowSpray(
    bladeSide: { x: number; z: number },
    bladeCenter: { x: number; z: number },
    heading: number,
    speed: number
  ) {
    // Determine plow eject direction (angled to the right side of the blade)
    const ejectAngle = heading + Math.PI * 0.42;
    const sprayCount = Math.min(4, Math.floor(speed * 0.25) + 1);

    for (let i = 0; i < sprayCount; i++) {
      // Find inactive particle
      const p = this.particlePool.find((part) => part.life <= 0);
      if (!p) break;

      const spread = (Math.random() - 0.5) * 0.4;
      const arcSpeed = 3.5 + Math.random() * speed * 0.45;

      p.pos.set(bladeSide.x + (Math.random() - 0.5) * 0.4, 0.45, bladeSide.z + (Math.random() - 0.5) * 0.4);
      p.vel.set(Math.sin(ejectAngle + spread) * arcSpeed, 2.2 + Math.random() * 2.8, Math.cos(ejectAngle + spread) * arcSpeed);
      p.maxLife = 0.55 + Math.random() * 0.35;
      p.life = p.maxLife;
      p.scale = 0.8 + Math.random() * 0.7;
    }
  }

  public updateParticles(dt: number) {
    if (!this.particleInstancedMesh) return;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particlePool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vel.y -= 9.8 * dt; // Gravity
        p.pos.addScaledVector(p.vel, dt);

        if (p.pos.y <= 0.1) {
          p.pos.y = 0.1;
          p.vel.set(0, 0, 0);
        }

        const lifeRatio = p.life / p.maxLife;
        const currentScale = p.scale * Math.max(0.01, lifeRatio);

        this.dummyObj.position.copy(p.pos);
        this.dummyObj.scale.set(currentScale, currentScale, currentScale);
        this.dummyObj.updateMatrix();
        this.particleInstancedMesh.setMatrixAt(i, this.dummyObj.matrix);
      } else {
        this.dummyObj.position.set(0, -100, 0);
        this.dummyObj.updateMatrix();
        this.particleInstancedMesh.setMatrixAt(i, this.dummyObj.matrix);
      }
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;

    // Animate falling ambient snowflakes
    if (this.ambientSnowSystem && this.ambientPositions) {
      const count = this.ambientPositions.length / 3;
      for (let i = 0; i < count; i++) {
        // Fall down
        this.ambientPositions[i * 3 + 1] -= (2.5 + (i % 5) * 0.5) * dt;
        // Drift slightly in wind
        this.ambientPositions[i * 3 + 0] += Math.sin(i + dt) * 0.4 * dt;

        if (this.ambientPositions[i * 3 + 1] < 0.2) {
          this.ambientPositions[i * 3 + 1] = 25.0; // Reset to sky
        }
      }
      this.ambientSnowSystem.geometry.attributes.position.needsUpdate = true;
    }
  }

  public getClearedPercent(): number {
    if (this.totalSnowCells === 0) return 0;
    return Math.min(100, Math.floor((this.clearedSnowCells / this.totalSnowCells) * 100));
  }
}
