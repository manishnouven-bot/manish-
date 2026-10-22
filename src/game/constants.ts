import { Mission, TruckConfig, TruckStats } from '../types';

export const SKINS = [
  { id: 'yellow', name: 'Safety Yellow', color: '#f59e0b', cabin: '#1e293b', blade: '#cbd5e1', cost: 0 },
  { id: 'blue', name: 'Blizzard Frost', color: '#0284c7', cabin: '#0f172a', blade: '#94a3b8', cost: 150 },
  { id: 'red', name: 'Nordic Fire', color: '#dc2626', cabin: '#18181b', blade: '#e2e8f0', cost: 300 },
  { id: 'green', name: 'Pine Forest', color: '#15803d', cabin: '#292524', blade: '#d6d3d1', cost: 450 },
  { id: 'midnight', name: 'Midnight Shadow', color: '#334155', cabin: '#09090b', blade: '#f1f5f9', cost: 600 },
];

export const UPGRADE_DATA = {
  engine: {
    name: 'Heavy Duty Engine',
    desc: 'Increases top speed and acceleration through heavy snow.',
    maxLevel: 5,
    costs: [0, 80, 160, 260, 420],
  },
  plowWidth: {
    name: 'Wide Steel Blade',
    desc: 'Expands the clearing path width to plow more road per pass.',
    maxLevel: 5,
    costs: [0, 100, 200, 320, 500],
  },
  power: {
    name: 'Plow Blade Power',
    desc: 'Reduces drag from deep snowbanks and boosts coin earnings.',
    maxLevel: 5,
    costs: [0, 90, 180, 300, 460],
  },
  boost: {
    name: 'Nitro Turbo Tank',
    desc: 'Extends boost duration and accelerates turbo gauge refill.',
    maxLevel: 5,
    costs: [0, 110, 220, 340, 520],
  },
};

export const MISSIONS: Mission[] = [
  {
    id: 'm1_pine_hill',
    title: 'Pine Hill Lane',
    subtitle: 'Morning Calm in Suburbia',
    description: 'Clear the residential roads and 3 neighborhood driveways before school buses arrive.',
    targetPercent: 80,
    timeLimitSec: 180,
    mapType: 'suburb',
    weather: 'morning',
    snowDepth: 1,
    rewardCoins: 120,
    unlockedByDefault: true,
  },
  {
    id: 'm2_town_square',
    title: 'Town Hall Plaza',
    subtitle: 'Market Day Preparation',
    description: 'The town square and central streets are buried in snow. Clear the plaza around the grand fountain.',
    targetPercent: 85,
    timeLimitSec: 210,
    mapType: 'square',
    weather: 'sunset',
    snowDepth: 2,
    rewardCoins: 220,
    unlockedByDefault: false,
  },
  {
    id: 'm3_clocktower',
    title: 'Clocktower Crossing',
    subtitle: 'Evening Blizzard',
    description: 'Heavy snowfall in the historic district. Navigate narrow corners, parked cars, and steep snowbanks.',
    targetPercent: 88,
    timeLimitSec: 240,
    mapType: 'clocktower',
    weather: 'blizzard',
    snowDepth: 3,
    rewardCoins: 350,
    unlockedByDefault: false,
  },
  {
    id: 'm4_chalet',
    title: 'Mountain Chalet Haven',
    subtitle: 'Alpine Starlight Route',
    description: 'Clear the scenic alpine resort roads, hotel parking bays, and stone bridge before the ski rush.',
    targetPercent: 90,
    timeLimitSec: 260,
    mapType: 'chalet',
    weather: 'night',
    snowDepth: 2,
    rewardCoins: 500,
    unlockedByDefault: false,
  },
];

export function computeTruckConfig(stats: TruckStats): TruckConfig {
  const skin = SKINS.find((s) => s.id === stats.skinId) || SKINS[0];

  // Base parameters scaled by upgrade levels (1 to 5)
  const maxSpeed = 14 + (stats.engineLevel - 1) * 3.2; // 14 to ~26.8
  const acceleration = 12 + (stats.engineLevel - 1) * 3.0;
  const reverseSpeed = 7 + (stats.engineLevel - 1) * 1.5;
  const turnSpeed = 2.4 + (stats.engineLevel - 1) * 0.15;

  // Plow width from 2.6m to 4.6m
  const plowWidth = 2.7 + (stats.plowWidthLevel - 1) * 0.48;

  // Clearing power (reduces snow resistance factor)
  const clearingPower = 1.0 + (stats.powerLevel - 1) * 0.4;

  // Boost parameters
  const boostMax = 100 + (stats.boostLevel - 1) * 25; // 100 to 200
  const boostRecharge = 15 + (stats.boostLevel - 1) * 6; // per sec

  return {
    maxSpeed,
    acceleration,
    reverseSpeed,
    turnSpeed,
    plowWidth,
    clearingPower,
    boostMax,
    boostRecharge,
    color: skin.color,
    cabinColor: skin.cabin,
    bladeColor: skin.blade,
  };
}
