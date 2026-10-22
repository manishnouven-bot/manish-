import * as THREE from 'three';
import { Mission } from '../types';
import { ObstacleBox } from './physics';

export interface WorldData {
  obstacles: ObstacleBox[];
  targetRoadRects: { x: number; z: number; w: number; d: number }[];
  spawn: { x: number; z: number; rot: number };
  worldBounds: { size: number; minX: number; maxX: number; minZ: number; maxZ: number };
}

export function buildMissionWorld(scene: THREE.Scene, mission: Mission): WorldData {
  const obstacles: ObstacleBox[] = [];
  const targetRoadRects: { x: number; z: number; w: number; d: number }[] = [];

  const worldSize = 110;
  const worldBounds = {
    size: worldSize,
    minX: -worldSize / 2,
    maxX: worldSize / 2,
    minZ: -worldSize / 2,
    maxZ: worldSize / 2,
  };

  // Weather and lighting palettes
  let skyColor = 0xdbeafe;
  let sunColor = 0xffedd5;
  let hemiSky = 0x93c5fd;
  let hemiGround = 0xe0f2fe;
  let sunIntensity = 1.35;
  let fogDensity = 0.012;

  if (mission.weather === 'morning') {
    skyColor = 0xcfe2f3;
    sunColor = 0xffe8d6;
    hemiSky = 0xbfdbfe;
    hemiGround = 0xe2e8f0;
    sunIntensity = 1.4;
    fogDensity = 0.011;
  } else if (mission.weather === 'sunset') {
    skyColor = 0xfbcfe8;
    sunColor = 0xfdba74;
    hemiSky = 0xf472b6;
    hemiGround = 0x93c5fd;
    sunIntensity = 1.2;
    fogDensity = 0.013;
  } else if (mission.weather === 'blizzard') {
    skyColor = 0x94a3b8;
    sunColor = 0xe2e8f0;
    hemiSky = 0x64748b;
    hemiGround = 0xcbd5e1;
    sunIntensity = 0.85;
    fogDensity = 0.024;
  } else if (mission.weather === 'night') {
    skyColor = 0x0f172a;
    sunColor = 0x38bdf8;
    hemiSky = 0x1e293b;
    hemiGround = 0x090d16;
    sunIntensity = 0.55;
    fogDensity = 0.015;
  }

  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(skyColor, fogDensity);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, 0.7);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(sunColor, sunIntensity);
  keyLight.position.set(45, 60, 35);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 10;
  keyLight.shadow.camera.far = 160;
  keyLight.shadow.camera.left = -55;
  keyLight.shadow.camera.right = 55;
  keyLight.shadow.camera.top = 55;
  keyLight.shadow.camera.bottom = -55;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // Reusable Shared Materials
  const snowTerrainMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.9,
    metalness: 0.02,
  });

  const asphaltRoadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark tarmac asphalt
    roughness: 0.85,
    metalness: 0.08,
  });

  const cobblestoneMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Rich cobblestone
    roughness: 0.8,
    metalness: 0.12,
  });

  const woodFenceMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
  });

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: mission.weather === 'night' || mission.weather === 'blizzard' ? 1.6 : 0.85,
    roughness: 0.2,
  });

  const treeBarkMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.9,
  });

  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.85,
  });

  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
  });

  // Base ground terrain
  const groundGeom = new THREE.PlaneGeometry(worldSize * 1.5, worldSize * 1.5);
  groundGeom.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeom, snowTerrainMat);
  groundMesh.receiveShadow = true;
  groundMesh.position.y = 0;
  scene.add(groundMesh);

  // Helper to add road rectangle
  function addRoad(x: number, z: number, w: number, d: number, isStone: boolean = false) {
    const roadGeom = new THREE.PlaneGeometry(w, d);
    roadGeom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(roadGeom, isStone ? cobblestoneMat : asphaltRoadMat);
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Subtle road curb edges
    const curbGeom = new THREE.BoxGeometry(w + 0.3, 0.08, d + 0.3);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const curbMesh = new THREE.Mesh(curbGeom, curbMat);
    curbMesh.position.set(x, 0.01, z);
    scene.add(curbMesh);

    targetRoadRects.push({ x, z, w, d });
  }

  // Helper to construct a cozy composite house (3-8 parts)
  function addHouse(x: number, z: number, rotY: number, wallColor: number, roofColor: number) {
    const houseGroup = new THREE.Group();
    houseGroup.position.set(x, 0, z);
    houseGroup.rotation.y = rotY;

    const w = 6.2;
    const h = 4.2;
    const d = 5.6;

    // Foundation & Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });
    const wallGeom = new THREE.BoxGeometry(w, h, d);
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.y = h / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    houseGroup.add(wallMesh);

    // Gabled Roof
    const roofGeom = new THREE.ConeGeometry(4.8, 2.5, 4);
    roofGeom.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.65 });
    const roofMesh = new THREE.Mesh(roofGeom, roofMat);
    roofMesh.position.set(0, h + 1.2, 0);
    roofMesh.scale.set(w * 0.17, 1.0, d * 0.2);
    roofMesh.castShadow = true;
    houseGroup.add(roofMesh);

    // Snow mantle on roof
    const snowRoofGeom = new THREE.ConeGeometry(4.9, 0.8, 4);
    snowRoofGeom.rotateY(Math.PI / 4);
    const snowRoofMesh = new THREE.Mesh(snowRoofGeom, snowCapMat);
    snowRoofMesh.position.set(0, h + 2.1, 0);
    snowRoofMesh.scale.set(w * 0.175, 1.0, d * 0.205);
    houseGroup.add(snowRoofMesh);

    // Chimney with snow brim
    const chimneyGeom = new THREE.BoxGeometry(0.8, 2.2, 0.8);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 });
    const chimneyMesh = new THREE.Mesh(chimneyGeom, chimneyMat);
    chimneyMesh.position.set(w * 0.3, h + 1.6, -d * 0.2);
    chimneyMesh.castShadow = true;
    houseGroup.add(chimneyMesh);

    // Glowing Windows
    const winGeom = new THREE.PlaneGeometry(1.0, 1.2);
    const win1 = new THREE.Mesh(winGeom, windowGlowMat);
    win1.position.set(-1.6, 2.2, d / 2 + 0.05);
    houseGroup.add(win1);

    const win2 = new THREE.Mesh(winGeom, windowGlowMat);
    win2.position.set(1.6, 2.2, d / 2 + 0.05);
    houseGroup.add(win2);

    // Front Door
    const doorGeom = new THREE.PlaneGeometry(1.2, 2.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const doorMesh = new THREE.Mesh(doorGeom, doorMat);
    doorMesh.position.set(0, 1.15, d / 2 + 0.05);
    houseGroup.add(doorMesh);

    scene.add(houseGroup);

    obstacles.push({
      x,
      z,
      width: w,
      depth: d,
      type: 'house',
    });
  }

  // Helper for multi-tiered low-poly snow pine tree
  function addPineTree(x: number, z: number, scale: number = 1) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);
    treeGroup.scale.set(scale, scale, scale);

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.25, 0.38, 1.6, 6);
    const trunkMesh = new THREE.Mesh(trunkGeom, treeBarkMat);
    trunkMesh.position.y = 0.8;
    trunkMesh.castShadow = true;
    treeGroup.add(trunkMesh);

    // 3 Foliage tiers with snow caps
    const tiers = [
      { r: 2.2, h: 2.2, y: 2.1 },
      { r: 1.7, h: 1.9, y: 3.4 },
      { r: 1.2, h: 1.6, y: 4.5 },
    ];

    tiers.forEach((t) => {
      const coneGeom = new THREE.ConeGeometry(t.r, t.h, 7);
      const coneMesh = new THREE.Mesh(coneGeom, pineFoliageMat);
      coneMesh.position.y = t.y;
      coneMesh.castShadow = true;
      treeGroup.add(coneMesh);

      // Snow cap
      const capGeom = new THREE.ConeGeometry(t.r * 0.95, t.h * 0.45, 7);
      const capMesh = new THREE.Mesh(capGeom, snowCapMat);
      capMesh.position.y = t.y + t.h * 0.3;
      treeGroup.add(capMesh);
    });

    scene.add(treeGroup);
    obstacles.push({
      x,
      z,
      width: 1.8 * scale,
      depth: 1.8 * scale,
      type: 'tree',
    });
  }

  // Streetlight with warm point light
  function addStreetlight(x: number, z: number) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);

    // Post
    const postGeom = new THREE.CylinderGeometry(0.09, 0.12, 4.2, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
    const postMesh = new THREE.Mesh(postGeom, postMat);
    postMesh.position.y = 2.1;
    lampGroup.add(postMesh);

    // Lantern Head
    const headGeom = new THREE.OctahedronGeometry(0.35);
    const headMesh = new THREE.Mesh(headGeom, windowGlowMat);
    headMesh.position.y = 4.2;
    lampGroup.add(headMesh);

    // Point Light
    const lampLight = new THREE.PointLight(0xfef08a, 1.8, 14);
    lampLight.position.y = 4.0;
    lampGroup.add(lampLight);

    scene.add(lampGroup);
    obstacles.push({
      x,
      z,
      width: 0.6,
      depth: 0.6,
      type: 'fence',
    });
  }

  // Parked Car with snow blanket
  function addParkedCar(x: number, z: number, rotY: number, color: number) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = rotY;

    const carBodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
    const carGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    // Lower Chassis
    const lowerGeom = new THREE.BoxGeometry(1.8, 0.7, 3.8);
    const lowerMesh = new THREE.Mesh(lowerGeom, carBodyMat);
    lowerMesh.position.y = 0.55;
    lowerMesh.castShadow = true;
    carGroup.add(lowerMesh);

    // Upper Cabin
    const cabinGeom = new THREE.BoxGeometry(1.6, 0.65, 2.1);
    const cabinMesh = new THREE.Mesh(cabinGeom, carGlassMat);
    cabinMesh.position.set(0, 1.15, -0.2);
    carGroup.add(cabinMesh);

    // Snow layer on car roof
    const snowCarGeom = new THREE.BoxGeometry(1.62, 0.16, 2.15);
    const snowCarMesh = new THREE.Mesh(snowCarGeom, snowCapMat);
    snowCarMesh.position.set(0, 1.5, -0.2);
    carGroup.add(snowCarMesh);

    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    wheelGeom.rotateZ(Math.PI / 2);
    const w1 = new THREE.Mesh(wheelGeom, tireMat);
    w1.position.set(-0.95, 0.32, 1.1);
    const w2 = new THREE.Mesh(wheelGeom, tireMat);
    w2.position.set(0.95, 0.32, 1.1);
    const w3 = new THREE.Mesh(wheelGeom, tireMat);
    w3.position.set(-0.95, 0.32, -1.1);
    const w4 = new THREE.Mesh(wheelGeom, tireMat);
    w4.position.set(0.95, 0.32, -1.1);
    carGroup.add(w1, w2, w3, w4);

    scene.add(carGroup);
    obstacles.push({
      x,
      z,
      width: 2.2,
      depth: 4.2,
      type: 'car',
    });
  }

  // Wooden fence run
  function addFence(x1: number, z1: number, x2: number, z2: number) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const fenceGroup = new THREE.Group();
    fenceGroup.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    fenceGroup.rotation.y = angle;

    // Rails
    const railGeom = new THREE.BoxGeometry(0.12, 0.1, dist);
    const rail1 = new THREE.Mesh(railGeom, woodFenceMat);
    rail1.position.y = 0.55;
    const rail2 = new THREE.Mesh(railGeom, woodFenceMat);
    rail2.position.y = 0.95;
    fenceGroup.add(rail1, rail2);

    // Posts
    const postCount = Math.max(2, Math.floor(dist / 2.5));
    const postGeom = new THREE.BoxGeometry(0.18, 1.15, 0.18);
    for (let i = 0; i < postCount; i++) {
      const p = new THREE.Mesh(postGeom, woodFenceMat);
      p.position.set(0, 0.58, -dist / 2 + (i / (postCount - 1)) * dist);
      p.castShadow = true;
      fenceGroup.add(p);
    }

    scene.add(fenceGroup);
    obstacles.push({
      x: (x1 + x2) / 2,
      z: (z1 + z2) / 2,
      width: Math.abs(dx) + 0.6,
      depth: Math.abs(dz) + 0.6,
      type: 'fence',
    });
  }

  // Big Snowbank Mound
  function addSnowbank(x: number, z: number, rx: number, rz: number, height: number = 1.4) {
    const bankGeom = new THREE.SphereGeometry(1, 10, 8);
    bankGeom.scale(rx, height, rz);
    const bankMesh = new THREE.Mesh(bankGeom, snowTerrainMat);
    bankMesh.position.set(x, 0, z);
    bankMesh.castShadow = true;
    scene.add(bankMesh);

    obstacles.push({
      x,
      z,
      width: rx * 1.7,
      depth: rz * 1.7,
      type: 'snowbank',
    });
  }

  // Distinct Map Layouts based on mapType
  let spawn = { x: 0, z: -32, rot: 0 };

  if (mission.mapType === 'suburb') {
    // Mission 1: Pine Hill Lane
    // Main avenue running North-South, crossroad, 3 driveways
    addRoad(0, 0, 9.5, 78); // Main Road
    addRoad(0, 12, 60, 9.5); // Crossroad

    // Driveways
    addRoad(-18, -12, 14, 5.5);
    addRoad(18, -12, 14, 5.5);
    addRoad(-18, 28, 14, 5.5);
    addRoad(18, 28, 14, 5.5);

    // Houses
    addHouse(-24, -12, 0, 0xb91c1c, 0x1e293b); // Red cottage
    addHouse(24, -12, Math.PI, 0x1d4ed8, 0x334155); // Blue house
    addHouse(-24, 28, 0, 0x047857, 0x1f2937); // Green chalet
    addHouse(24, 28, Math.PI, 0xd97706, 0x3f3f46); // Amber villa

    // Parked Cars
    addParkedCar(-12, -12, Math.PI / 2, 0xef4444);
    addParkedCar(13, 28, -Math.PI / 2, 0x3b82f6);
    addParkedCar(3.2, -5, 0, 0x64748b);

    // Streetlights
    addStreetlight(-5.8, -25);
    addStreetlight(5.8, -5);
    addStreetlight(-5.8, 18);
    addStreetlight(5.8, 34);

    // Fences
    addFence(-7, -2, -7, -22);
    addFence(7, -2, 7, -22);
    addFence(-7, 20, -7, 36);

    // Pine Trees
    addPineTree(-16, -26, 1.2);
    addPineTree(-22, -24, 1.5);
    addPineTree(18, -24, 1.3);
    addPineTree(24, -20, 1.6);
    addPineTree(-24, 5, 1.4);
    addPineTree(25, 6, 1.3);

    // Snowbanks
    addSnowbank(-12, 18, 2.5, 3.5);
    addSnowbank(14, -18, 3.0, 2.5);

    spawn = { x: 0, z: -34, rot: 0 };
  } else if (mission.mapType === 'square') {
    // Mission 2: Town Hall Plaza
    // Central wide cobblestone plaza 42x42 with grand fountain obstacle
    addRoad(0, 0, 44, 44, true); // Plaza
    addRoad(0, -32, 10, 26); // North Avenue
    addRoad(0, 32, 10, 26); // South Avenue
    addRoad(-32, 0, 26, 10); // West Street
    addRoad(32, 0, 26, 10); // East Street

    // Centerpiece Fountain
    const fountainGroup = new THREE.Group();
    const basinGeom = new THREE.CylinderGeometry(4.2, 4.5, 0.9, 16);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const basinMesh = new THREE.Mesh(basinGeom, basinMat);
    basinMesh.position.y = 0.45;
    fountainGroup.add(basinMesh);

    // Frozen water ice
    const iceGeom = new THREE.CylinderGeometry(3.9, 3.9, 0.1, 16);
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1, metalness: 0.4 });
    const iceMesh = new THREE.Mesh(iceGeom, iceMat);
    iceMesh.position.y = 0.85;
    fountainGroup.add(iceMesh);

    // Fountain spire
    const spireGeom = new THREE.CylinderGeometry(0.5, 0.8, 3.2, 8);
    const spireMesh = new THREE.Mesh(spireGeom, basinMat);
    spireMesh.position.y = 2.0;
    fountainGroup.add(spireMesh);

    // Snow atop fountain
    const snowSpire = new THREE.ConeGeometry(0.8, 0.6, 8);
    const snowSpireMesh = new THREE.Mesh(snowSpire, snowCapMat);
    snowSpireMesh.position.y = 3.8;
    fountainGroup.add(snowSpireMesh);

    scene.add(fountainGroup);
    obstacles.push({
      x: 0,
      z: 0,
      width: 8.8,
      depth: 8.8,
      type: 'fountain',
    });

    // Town Hall Grand House
    addHouse(0, -28, 0, 0x854d0e, 0x1e293b);
    addHouse(-26, -26, Math.PI / 4, 0x991b1b, 0x334155);
    addHouse(26, -26, -Math.PI / 4, 0x1e40af, 0x1f2937);
    addHouse(-26, 26, (3 * Math.PI) / 4, 0x065f46, 0x374151);
    addHouse(26, 26, (-3 * Math.PI) / 4, 0x831843, 0x111827);

    // Parked Delivery vans & cars
    addParkedCar(-16, -14, Math.PI / 3, 0xf59e0b);
    addParkedCar(17, 15, -Math.PI / 6, 0x10b981);

    // Streetlamps at 4 corners of plaza
    addStreetlight(-18, -18);
    addStreetlight(18, -18);
    addStreetlight(-18, 18);
    addStreetlight(18, 18);

    // Perimeter Trees
    addPineTree(-32, -18, 1.4);
    addPineTree(32, -18, 1.5);
    addPineTree(-32, 18, 1.3);
    addPineTree(32, 18, 1.6);

    spawn = { x: 0, z: 35, rot: Math.PI };
  } else if (mission.mapType === 'clocktower') {
    // Mission 3: Clocktower Crossing
    // Grid with 2 intersecting avenues and center clocktower
    addRoad(0, 0, 11, 74);
    addRoad(0, 0, 74, 11);
    addRoad(0, -20, 48, 8.5);
    addRoad(0, 20, 48, 8.5);

    // Historic Clocktower at corner intersection
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-10, 0, -10);

    const baseGeom = new THREE.BoxGeometry(4.5, 9.0, 4.5);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const baseMesh = new THREE.Mesh(baseGeom, towerMat);
    baseMesh.position.y = 4.5;
    towerGroup.add(baseMesh);

    // Spire
    const spireGeom = new THREE.ConeGeometry(3.2, 5.0, 4);
    spireGeom.rotateY(Math.PI / 4);
    const spireMesh = new THREE.Mesh(spireGeom, snowCapMat);
    spireMesh.position.y = 11.5;
    towerGroup.add(spireMesh);

    // Clock faces
    const dialGeom = new THREE.CircleGeometry(1.2, 16);
    const dialMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
    const dial1 = new THREE.Mesh(dialGeom, dialMat);
    dial1.position.set(0, 7.5, 2.3);
    towerGroup.add(dial1);

    scene.add(towerGroup);
    obstacles.push({ x: -10, z: -10, width: 5.2, depth: 5.2, type: 'house' });

    // Surrounding houses
    addHouse(18, -18, -Math.PI / 4, 0x7c2d12, 0x1f2937);
    addHouse(-18, 18, (3 * Math.PI) / 4, 0x1e3a8a, 0x0f172a);
    addHouse(18, 18, Math.PI / 4, 0x14532d, 0x1e293b);

    // Parked cars
    addParkedCar(-4, -14, 0, 0xef4444);
    addParkedCar(4, 14, Math.PI, 0x06b6d4);
    addParkedCar(14, -4, Math.PI / 2, 0x8b5cf6);

    // Streetlamps
    addStreetlight(-6.5, -28);
    addStreetlight(6.5, 28);
    addStreetlight(-28, -6.5);
    addStreetlight(28, 6.5);

    // Snowbanks in tight turns
    addSnowbank(-14, -3, 3.2, 2.8);
    addSnowbank(14, 3, 3.0, 3.0);
    addSnowbank(3, -15, 2.6, 3.2);

    spawn = { x: 0, z: -32, rot: 0 };
  } else {
    // Mission 4: Mountain Chalet Haven
    // Serpentine mountain road + chalet parking loop
    addRoad(0, 0, 36, 36); // Resort parking courtyard
    addRoad(0, -32, 11, 30); // Entry pass
    addRoad(-24, 0, 20, 10); // Chalet lane left
    addRoad(24, 0, 20, 10); // Chalet lane right
    addRoad(0, 28, 10, 24); // Ski lodge road

    // Grand Ski Lodge Chalet
    addHouse(0, 28, Math.PI, 0x78350f, 0x1e293b);
    addHouse(-26, 0, Math.PI / 2, 0x991b1b, 0x334155);
    addHouse(26, 0, -Math.PI / 2, 0x166534, 0x18181b);

    // Parked SUVs
    addParkedCar(-8, -6, Math.PI / 2, 0x475569);
    addParkedCar(-8, 6, Math.PI / 2, 0xd97706);
    addParkedCar(8, -6, -Math.PI / 2, 0x2563eb);
    addParkedCar(8, 6, -Math.PI / 2, 0xdc2626);

    // Bridge stone railings
    const bridgeRailingGeom = new THREE.BoxGeometry(0.8, 0.9, 14);
    const bridgeRailingMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const rL = new THREE.Mesh(bridgeRailingGeom, bridgeRailingMat);
    rL.position.set(-6, 0.45, -25);
    const rR = new THREE.Mesh(bridgeRailingGeom, bridgeRailingMat);
    rR.position.set(6, 0.45, -25);
    scene.add(rL, rR);
    obstacles.push({ x: -6, z: -25, width: 1.2, depth: 14.5, type: 'fence' });
    obstacles.push({ x: 6, z: -25, width: 1.2, depth: 14.5, type: 'fence' });

    // Deep Alpine Snowbanks
    addSnowbank(-16, -18, 4.0, 3.5, 1.8);
    addSnowbank(16, -18, 4.0, 3.5, 1.8);
    addSnowbank(-15, 18, 3.5, 3.5, 1.8);
    addSnowbank(15, 18, 3.5, 3.5, 1.8);

    // Dense Pine Groves
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist = 38 + (i % 3) * 5;
      addPineTree(Math.sin(angle) * dist, Math.cos(angle) * dist, 1.2 + (i % 4) * 0.2);
    }

    addStreetlight(-6, -12);
    addStreetlight(6, -12);
    addStreetlight(-14, 0);
    addStreetlight(14, 0);

    spawn = { x: 0, z: -38, rot: 0 };
  }

  // Dense perimeter boundary pine trees & snowy cliffs (natural barriers instead of floating indoor walls!)
  const perimeterCount = 26;
  for (let i = 0; i < perimeterCount; i++) {
    const angle = (i / perimeterCount) * Math.PI * 2;
    const r = 52 + (i % 3) * 2;
    addPineTree(Math.sin(angle) * r, Math.cos(angle) * r, 1.5 + (i % 3) * 0.25);
  }

  return {
    obstacles,
    targetRoadRects,
    spawn,
    worldBounds,
  };
}
