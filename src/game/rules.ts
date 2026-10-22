import { TruckStats } from '../types';
import { UPGRADE_DATA } from './constants';

export function calculateComboMultiplier(consecutiveClears: number): number {
  if (consecutiveClears < 10) return 1.0;
  if (consecutiveClears < 25) return 1.5;
  if (consecutiveClears < 50) return 2.0;
  if (consecutiveClears < 90) return 3.0;
  if (consecutiveClears < 140) return 4.0;
  return 5.0; // Max 5x combo multiplier
}

export function calculateClearPoints(cellsCleared: number, multiplier: number, powerBonus: number): number {
  const baseRate = 10;
  return Math.round(cellsCleared * baseRate * multiplier * powerBonus);
}

export function calculateCoinsEarned(cellsCleared: number, powerBonus: number): number {
  // Every ~15 cleared cells yields 1 coin, augmented by blade power
  return Math.max(1, Math.round((cellsCleared / 15) * powerBonus));
}

export function calculateStarRating(clearedPercent: number, targetPercent: number, timeSpent: number, timeLimit: number): number {
  if (clearedPercent < targetPercent) return 0;
  let stars = 1; // Completed target objective
  if (clearedPercent >= Math.min(100, targetPercent + 8)) {
    stars = 2; // High clearance
  }
  if (clearedPercent >= 96 && (timeLimit === 0 || timeSpent <= timeLimit * 0.75)) {
    stars = 3; // Flawless clearance and prompt time
  }
  return stars;
}

export function canAffordUpgrade(coins: number, category: keyof typeof UPGRADE_DATA, currentLevel: number): boolean {
  const data = UPGRADE_DATA[category];
  if (!data) return false;
  if (currentLevel >= data.maxLevel) return false;
  const cost = data.costs[currentLevel]; // Cost for next level
  return coins >= cost;
}

export function applyUpgrade(
  stats: TruckStats,
  category: 'engine' | 'plowWidth' | 'power' | 'boost',
  coins: number
): { success: boolean; newStats: TruckStats; newCoins: number; cost: number } {
  const data = UPGRADE_DATA[category];
  const levelKey = (category === 'engine'
    ? 'engineLevel'
    : category === 'plowWidth'
    ? 'plowWidthLevel'
    : category === 'power'
    ? 'powerLevel'
    : 'boostLevel') as keyof TruckStats;

  const currentLevel = stats[levelKey] as number;
  if (currentLevel >= data.maxLevel) {
    return { success: false, newStats: stats, newCoins: coins, cost: 0 };
  }

  const cost = data.costs[currentLevel];
  if (coins < cost) {
    return { success: false, newStats: stats, newCoins: coins, cost: 0 };
  }

  const newStats = {
    ...stats,
    [levelKey]: currentLevel + 1,
  };

  return {
    success: true,
    newStats,
    newCoins: coins - cost,
    cost,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
