import * as THREE from 'three';
import { TruckConfig } from '../types';

export interface TruckMeshComponents {
  group: THREE.Group;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  plowBladeGroup: THREE.Group;
  beaconLight: THREE.PointLight;
  beaconMesh: THREE.Mesh;
  headlightL: THREE.SpotLight;
  headlightR: THREE.SpotLight;
  bodyMesh: THREE.Mesh;
  exhaustPipe: THREE.Mesh;
  updateVisuals: (steerAngle: number, speed: number, dt: number, isBoosting: boolean) => void;
}

export function createPlowTruck(config: TruckConfig): TruckMeshComponents {
  const rootGroup = new THREE.Group();

  // Materials with varied roughness and metalness
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.color),
    roughness: 0.35,
    metalness: 0.45,
  });

  const cabinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.cabinColor),
    roughness: 0.5,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.75,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.3,
    metalness: 0.8,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9,
    metalness: 0.1,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.85,
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.bladeColor),
    roughness: 0.28,
    metalness: 0.75,
  });

  const beaconAmberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  // 1. Chassis Frame
  const chassisGeom = new THREE.BoxGeometry(1.6, 0.4, 3.8);
  const chassisMesh = new THREE.Mesh(chassisGeom, metalMat);
  chassisMesh.position.y = 0.55;
  chassisMesh.castShadow = true;
  rootGroup.add(chassisMesh);

  // 2. Main Truck Cab
  const cabGeom = new THREE.BoxGeometry(1.56, 1.25, 1.5);
  const bodyMesh = new THREE.Mesh(cabGeom, bodyMat);
  bodyMesh.position.set(0, 1.35, 0.4);
  bodyMesh.castShadow = true;
  rootGroup.add(bodyMesh);

  // 3. Cabin Windshield & Windows
  const windshieldGeom = new THREE.BoxGeometry(1.58, 0.65, 0.85);
  const windshieldMesh = new THREE.Mesh(windshieldGeom, glassMat);
  windshieldMesh.position.set(0, 1.55, 0.65);
  rootGroup.add(windshieldMesh);

  // 4. Engine Hood / Nose
  const hoodGeom = new THREE.BoxGeometry(1.52, 0.8, 1.3);
  const hoodMesh = new THREE.Mesh(hoodGeom, bodyMat);
  hoodMesh.position.set(0, 0.95, 1.7);
  hoodMesh.castShadow = true;
  rootGroup.add(hoodMesh);

  // Front Radiator Grille
  const grilleGeom = new THREE.BoxGeometry(1.3, 0.55, 0.1);
  const grilleMesh = new THREE.Mesh(grilleGeom, metalMat);
  grilleMesh.position.set(0, 0.95, 2.36);
  rootGroup.add(grilleMesh);

  // 5. Rear Cargo / Salt Spreader Box
  const rearBoxGeom = new THREE.BoxGeometry(1.54, 0.9, 1.3);
  const rearBoxMesh = new THREE.Mesh(rearBoxGeom, cabinMat);
  rearBoxMesh.position.set(0, 1.0, -1.05);
  rearBoxMesh.castShadow = true;
  rootGroup.add(rearBoxMesh);

  // Salt Dome pile in back
  const saltGeom = new THREE.ConeGeometry(0.65, 0.5, 6);
  const saltMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
  const saltMesh = new THREE.Mesh(saltGeom, saltMat);
  saltMesh.position.set(0, 1.55, -1.05);
  rootGroup.add(saltMesh);

  // 6. Flashing Amber Roof Beacon
  const beaconBaseGeom = new THREE.CylinderGeometry(0.16, 0.18, 0.12, 8);
  const beaconBaseMesh = new THREE.Mesh(beaconBaseGeom, metalMat);
  beaconBaseMesh.position.set(0, 2.02, 0.4);
  rootGroup.add(beaconBaseMesh);

  const beaconCapGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 8);
  const beaconMesh = new THREE.Mesh(beaconCapGeom, beaconAmberMat);
  beaconMesh.position.set(0, 2.14, 0.4);
  rootGroup.add(beaconMesh);

  const beaconLight = new THREE.PointLight(0xf59e0b, 1.5, 9);
  beaconLight.position.set(0, 2.2, 0.4);
  rootGroup.add(beaconLight);

  // 7. Exhaust Stack Pipe
  const exhaustGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
  const exhaustPipe = new THREE.Mesh(exhaustGeom, metalMat);
  exhaustPipe.position.set(0.8, 1.6, -0.3);
  rootGroup.add(exhaustPipe);

  // 8. Headlights & Spotlights
  const hlGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
  hlGeom.rotateX(Math.PI / 2);

  const hlLeftMesh = new THREE.Mesh(hlGeom, headlightMat);
  hlLeftMesh.position.set(-0.55, 1.0, 2.38);
  rootGroup.add(hlLeftMesh);

  const hlRightMesh = new THREE.Mesh(hlGeom, headlightMat);
  hlRightMesh.position.set(0.55, 1.0, 2.38);
  rootGroup.add(hlRightMesh);

  const headlightL = new THREE.SpotLight(0xfef08a, 2.5, 24, Math.PI * 0.22, 0.45);
  headlightL.position.set(-0.55, 1.1, 2.35);
  headlightL.target.position.set(-0.55, 0.2, 10);
  rootGroup.add(headlightL);
  rootGroup.add(headlightL.target);

  const headlightR = new THREE.SpotLight(0xfef08a, 2.5, 24, Math.PI * 0.22, 0.45);
  headlightR.position.set(0.55, 1.1, 2.35);
  headlightR.target.position.set(0.55, 0.2, 10);
  rootGroup.add(headlightR);
  rootGroup.add(headlightR.target);

  // 9. Wheels Function
  function createWheel(): { group: THREE.Group; tire: THREE.Mesh } {
    const wheelGroup = new THREE.Group();
    const tireGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16);
    tireGeom.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeom, tireMat);
    tire.castShadow = true;

    const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.33, 8);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, rimMat);
    tire.add(rim);

    wheelGroup.add(tire);
    return { group: wheelGroup, tire };
  }

  const fl = createWheel();
  fl.group.position.set(-0.95, 0.42, 1.3);
  rootGroup.add(fl.group);

  const fr = createWheel();
  fr.group.position.set(0.95, 0.42, 1.3);
  rootGroup.add(fr.group);

  const rl = createWheel();
  rl.group.position.set(-0.95, 0.42, -1.1);
  rootGroup.add(rl.group);

  const rr = createWheel();
  rr.group.position.set(0.95, 0.42, -1.1);
  rootGroup.add(rr.group);

  // 10. Heavy Front Snowplow Blade Assembly
  const plowBladeGroup = new THREE.Group();
  plowBladeGroup.position.set(0, 0.45, 2.45);

  // Hydraulic mount arms
  const armGeom = new THREE.BoxGeometry(0.12, 0.12, 0.7);
  const armL = new THREE.Mesh(armGeom, metalMat);
  armL.position.set(-0.55, 0.05, 0.3);
  plowBladeGroup.add(armL);

  const armR = new THREE.Mesh(armGeom, metalMat);
  armR.position.set(0.55, 0.05, 0.3);
  plowBladeGroup.add(armR);

  // Steel curved plow blade
  const bladeWidth = config.plowWidth;
  const bladeGeom = new THREE.CylinderGeometry(0.45, 0.45, bladeWidth, 12, 1, false, 0, Math.PI * 0.65);
  bladeGeom.rotateZ(Math.PI / 2);
  bladeGeom.rotateY(Math.PI / 2);
  bladeGeom.rotateX(0.2); // angled plow curl

  const bladeMesh = new THREE.Mesh(bladeGeom, bladeMat);
  bladeMesh.position.set(0, 0.15, 0.65);
  bladeMesh.castShadow = true;
  // Angled push so snow deflects nicely to the side
  bladeMesh.rotation.y = -0.22;
  plowBladeGroup.add(bladeMesh);

  // Blade edge reinforcement strip
  const edgeGeom = new THREE.BoxGeometry(bladeWidth * 1.02, 0.08, 0.08);
  const edgeMesh = new THREE.Mesh(edgeGeom, metalMat);
  edgeMesh.position.set(0, -0.05, 0.75);
  edgeMesh.rotation.y = -0.22;
  plowBladeGroup.add(edgeMesh);

  rootGroup.add(plowBladeGroup);

  // Contact shadow disc under truck
  const shadowGeom = new THREE.PlaneGeometry(2.4, 4.4);
  shadowGeom.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.position.y = 0.04;
  rootGroup.add(shadowMesh);

  // Animation state
  let beaconTime = 0;
  let wheelRoll = 0;

  const updateVisuals = (steerAngle: number, speed: number, dt: number, isBoosting: boolean) => {
    // Steer front wheels
    fl.group.rotation.y = steerAngle;
    fr.group.rotation.y = steerAngle;

    // Roll wheels
    const rollSpeed = (speed / 0.42) * dt;
    wheelRoll += rollSpeed;
    fl.tire.rotation.x = wheelRoll;
    fr.tire.rotation.x = wheelRoll;
    rl.tire.rotation.x = wheelRoll;
    rr.tire.rotation.x = wheelRoll;

    // Amber roof beacon pulse / rotation
    beaconTime += dt * (isBoosting ? 14 : 7);
    const pulse = 0.6 + Math.sin(beaconTime) * 0.4;
    beaconLight.intensity = pulse * 2.2;
    beaconAmberMat.emissiveIntensity = pulse * 1.5;

    // Subtle truck body suspension bob based on speed
    bodyMesh.position.y = 1.35 + Math.sin(wheelRoll * 2) * 0.015;
    hoodMesh.position.y = 0.95 + Math.sin(wheelRoll * 2 + 0.5) * 0.012;
  };

  return {
    group: rootGroup,
    frontLeftWheel: fl.group,
    frontRightWheel: fr.group,
    rearLeftWheel: rl.group,
    rearRightWheel: rr.group,
    plowBladeGroup,
    beaconLight,
    beaconMesh,
    headlightL,
    headlightR,
    bodyMesh,
    exhaustPipe,
    updateVisuals,
  };
}
