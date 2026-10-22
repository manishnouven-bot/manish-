import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateComboMultiplier,
  calculateClearPoints,
  calculateCoinsEarned,
  calculateStarRating,
  canAffordUpgrade,
  applyUpgrade,
  formatTime,
} from './rules';
import { TruckStats } from '../types';

test('calculateComboMultiplier ramps from 1.0x to 5.0x correctly', () => {
  assert.equal(calculateComboMultiplier(0), 1.0);
  assert.equal(calculateComboMultiplier(5), 1.0);
  assert.equal(calculateComboMultiplier(12), 1.5);
  assert.equal(calculateComboMultiplier(30), 2.0);
  assert.equal(calculateComboMultiplier(60), 3.0);
  assert.equal(calculateComboMultiplier(100), 4.0);
  assert.equal(calculateComboMultiplier(200), 5.0);
});

test('calculateClearPoints scales by multiplier and blade power', () => {
  const pts = calculateClearPoints(20, 2.0, 1.2);
  assert.equal(pts, Math.round(20 * 10 * 2.0 * 1.2));
});

test('calculateCoinsEarned scales with cleared snow cells', () => {
  assert.equal(calculateCoinsEarned(30, 1.0), 2);
  assert.equal(calculateCoinsEarned(5, 1.0), 1); // Minimum 1 coin on small burst
});

test('calculateStarRating handles thresholds properly', () => {
  assert.equal(calculateStarRating(75, 80, 100, 180), 0); // Failed target
  assert.equal(calculateStarRating(82, 80, 100, 180), 1); // Target met
  assert.equal(calculateStarRating(90, 80, 170, 180), 2); // Met with bonus %
  assert.equal(calculateStarRating(98, 80, 100, 180), 3); // High % and fast time
});

test('canAffordUpgrade checks coin costs properly', () => {
  // UPGRADE_DATA.engine.costs = [0, 80, 160, 260, 420]
  assert.equal(canAffordUpgrade(70, 'engine', 1), false);
  assert.equal(canAffordUpgrade(80, 'engine', 1), true);
  assert.equal(canAffordUpgrade(200, 'engine', 5), false); // Already max level
});

test('applyUpgrade deducts coins and increments stat level', () => {
  const initialStats: TruckStats = {
    engineLevel: 1,
    plowWidthLevel: 1,
    powerLevel: 1,
    boostLevel: 1,
    skinId: 'yellow',
  };

  const result = applyUpgrade(initialStats, 'engine', 100);
  assert.equal(result.success, true);
  assert.equal(result.newStats.engineLevel, 2);
  assert.equal(result.cost, 80);
  assert.equal(result.newCoins, 20);

  // Insufficient funds
  const failResult = applyUpgrade(result.newStats, 'engine', 50);
  assert.equal(failResult.success, false);
  assert.equal(failResult.newStats.engineLevel, 2);
});

test('formatTime formats minutes and seconds', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(120), '2:00');
});
