export interface TruckStats {
  engineLevel: number;    // 1-5
  plowWidthLevel: number; // 1-5
  powerLevel: number;     // 1-5 (clearing efficiency & snowbank resistance)
  boostLevel: number;     // 1-5 (turbo duration & recharge)
  skinId: string;
}

export interface TruckConfig {
  maxSpeed: number;
  acceleration: number;
  reverseSpeed: number;
  turnSpeed: number;
  plowWidth: number;
  clearingPower: number;
  boostMax: number;
  boostRecharge: number;
  color: string;
  cabinColor: string;
  bladeColor: string;
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  targetPercent: number; // e.g. 85 for 85%
  timeLimitSec: number;  // 0 for untimed or positive seconds
  mapType: 'suburb' | 'square' | 'clocktower' | 'chalet';
  weather: 'morning' | 'sunset' | 'night' | 'blizzard';
  snowDepth: number;     // 1 to 3
  rewardCoins: number;
  unlockedByDefault: boolean;
}

export interface PlayerProgress {
  coins: number;
  highScore: number;
  stats: TruckStats;
  completedMissions: Record<string, { stars: number; bestTime: number; bestPercent: number }>;
}

export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover' | 'garage';

export interface UpgradesMeta {
  engine: { name: string; desc: string; maxLevel: number; costs: number[] };
  plowWidth: { name: string; desc: string; maxLevel: number; costs: number[] };
  power: { name: string; desc: string; maxLevel: number; costs: number[] };
  boost: { name: string; desc: string; maxLevel: number; costs: number[] };
}
