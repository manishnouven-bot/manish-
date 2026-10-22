import * as THREE from 'three';
import { TruckConfig } from '../types';

export interface ObstacleBox {
  x: number;
  z: number;
  width: number;
  depth: number;
  type: 'house' | 'tree' | 'car' | 'fence' | 'fountain' | 'snowbank';
}

export interface TruckState {
  x: number;
  z: number;
  rotation: number;     // Yaw angle in radians
  speed: number;        // Current linear velocity (positive forward, negative reverse)
  steerAngle: number;   // Current steering wheel angle
  isBraking: boolean;
  isBoosting: boolean;
  boostFuel: number;    // 0 to boostMax
  collisionCooldown: number; // brief immunity/bounce recovery
}

export class PhysicsEngine {
  public truck: TruckState = {
    x: 0,
    z: 0,
    rotation: 0,
    speed: 0,
    steerAngle: 0,
    isBraking: false,
    isBoosting: false,
    boostFuel: 100,
    collisionCooldown: 0,
  };

  public obstacles: ObstacleBox[] = [];
  public mapBounds = { minX: -65, maxX: 65, minZ: -65, maxZ: 65 };

  public initTruck(spawnX: number, spawnZ: number, rotation: number, boostMax: number) {
    this.truck.x = spawnX;
    this.truck.z = spawnZ;
    this.truck.rotation = rotation;
    this.truck.speed = 0;
    this.truck.steerAngle = 0;
    this.truck.isBraking = false;
    this.truck.isBoosting = false;
    this.truck.boostFuel = boostMax;
    this.truck.collisionCooldown = 0;
  }

  public setObstacles(obstacles: ObstacleBox[], bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    this.obstacles = obstacles;
    this.mapBounds = bounds;
  }

  public update(
    dt: number,
    inputs: { throttle: number; steer: number; brake: boolean; boost: boolean },
    config: TruckConfig
  ): { collided: boolean; collisionType?: string; hitSpeed: number } {
    const clampedDt = Math.min(dt, 0.05);
    const { truck } = this;

    if (truck.collisionCooldown > 0) {
      truck.collisionCooldown -= clampedDt;
    }

    // Boost logic
    let isBoostingActive = false;
    if (inputs.boost && truck.boostFuel > 5 && inputs.throttle > 0) {
      isBoostingActive = true;
      truck.boostFuel = Math.max(0, truck.boostFuel - 28 * clampedDt);
    } else {
      truck.boostFuel = Math.min(config.boostMax, truck.boostFuel + config.boostRecharge * clampedDt);
    }
    truck.isBoosting = isBoostingActive;
    truck.isBraking = inputs.brake;

    // Steering smoothing
    const targetSteer = inputs.steer * 0.58; // max wheel turn ~33 degrees
    truck.steerAngle = THREE.MathUtils.damp(truck.steerAngle, targetSteer, 14, clampedDt);

    // Speed target and acceleration
    const topSpeed = isBoostingActive ? config.maxSpeed * 1.55 : config.maxSpeed;
    const accelRate = (isBoostingActive ? config.acceleration * 1.8 : config.acceleration) * (inputs.throttle >= 0 ? 1 : 0.8);

    if (inputs.brake) {
      // Strong braking
      truck.speed = THREE.MathUtils.damp(truck.speed, 0, 8.5, clampedDt);
    } else if (inputs.throttle > 0) {
      // Forward drive
      if (truck.speed < 0) {
        truck.speed = THREE.MathUtils.damp(truck.speed, 0, 10, clampedDt);
      } else {
        const target = topSpeed * inputs.throttle;
        truck.speed = THREE.MathUtils.damp(truck.speed, target, accelRate * 0.18, clampedDt);
      }
    } else if (inputs.throttle < 0) {
      // Reverse drive
      if (truck.speed > 0) {
        truck.speed = THREE.MathUtils.damp(truck.speed, 0, 10, clampedDt);
      } else {
        const target = -config.reverseSpeed * Math.abs(inputs.throttle);
        truck.speed = THREE.MathUtils.damp(truck.speed, target, accelRate * 0.16, clampedDt);
      }
    } else {
      // Natural rolling resistance and winter snow friction
      truck.speed = THREE.MathUtils.damp(truck.speed, 0, 2.5, clampedDt);
    }

    // Kinematic steering (Bicycle model / Ackermann approximation)
    const wheelbase = 2.8;
    if (Math.abs(truck.speed) > 0.1) {
      const angularVelocity = (truck.speed / wheelbase) * Math.sin(truck.steerAngle) * config.turnSpeed * 0.7;
      truck.rotation += angularVelocity * clampedDt;
    }

    // Displacement
    const moveDist = truck.speed * clampedDt;
    const nextX = truck.x + Math.sin(truck.rotation) * moveDist;
    const nextZ = truck.z + Math.cos(truck.rotation) * moveDist;

    // Collision check
    const truckRadius = 1.35;
    let hasCollision = false;
    let collisionType = '';
    const prevSpeed = truck.speed;

    // Boundary check
    if (
      nextX < this.mapBounds.minX + 1.5 ||
      nextX > this.mapBounds.maxX - 1.5 ||
      nextZ < this.mapBounds.minZ + 1.5 ||
      nextZ > this.mapBounds.maxZ - 1.5
    ) {
      hasCollision = true;
      collisionType = 'snowbank';
    }

    // Obstacle check
    if (!hasCollision) {
      for (const obs of this.obstacles) {
        const halfW = obs.width / 2 + truckRadius;
        const halfD = obs.depth / 2 + truckRadius;
        const dx = Math.abs(nextX - obs.x);
        const dz = Math.abs(nextZ - obs.z);

        if (dx < halfW && dz < halfD) {
          hasCollision = true;
          collisionType = obs.type;
          break;
        }
      }
    }

    if (hasCollision && truck.collisionCooldown <= 0) {
      // Bounce impulse
      truck.speed = -prevSpeed * 0.35;
      truck.collisionCooldown = 0.35;
      return { collided: true, collisionType, hitSpeed: Math.abs(prevSpeed) };
    } else if (!hasCollision) {
      truck.x = nextX;
      truck.z = nextZ;
    }

    return { collided: false, hitSpeed: 0 };
  }

  // Get plow blade world position and endpoints for clearing geometry
  public getPlowBladeWorld(plowWidth: number): {
    center: { x: number; z: number };
    left: { x: number; z: number };
    right: { x: number; z: number };
    angle: number;
  } {
    const forwardOffset = 2.45; // Front of truck chassis
    const sin = Math.sin(this.truck.rotation);
    const cos = Math.cos(this.truck.rotation);

    const centerX = this.truck.x + sin * forwardOffset;
    const centerZ = this.truck.z + cos * forwardOffset;

    // Perpendicular vector for blade span
    const perpX = cos;
    const perpZ = -sin;
    const halfW = plowWidth / 2;

    return {
      center: { x: centerX, z: centerZ },
      left: { x: centerX - perpX * halfW, z: centerZ - perpZ * halfW },
      right: { x: centerX + perpX * halfW, z: centerZ + perpZ * halfW },
      angle: this.truck.rotation,
    };
  }
}
