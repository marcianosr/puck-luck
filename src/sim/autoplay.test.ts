import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT } from '@/data/kits';
import { aimAtDensestCluster, aimStraightUp, BOTS, percentile, playRun, sweepToPackThenTap } from './autoplay';
import { createGame, startRun } from './game';

describe('playRun', () => {
  it('replays the same stats from the same kit, seed and bot', () => {
    expect(playRun(DEFAULT_KIT, 7, BOTS.cluster)).toEqual(playRun(DEFAULT_KIT, 7, BOTS.cluster));
  });

  it('ends the run on the first missed quota', () => {
    const stats = playRun(DEFAULT_KIT, 7, BOTS.straight);
    expect(stats.ratios).toHaveLength(stats.roundsCleared + 1);
    expect(stats.ratios.at(-1)).toBeLessThan(1);
    expect(stats.ratios.slice(0, -1).every(r => r >= 1)).toBe(true);
  });

  it('stops at the round cap even when every quota is met', () => {
    const stats = playRun(DEFAULT_KIT, 7, BOTS.cluster, 1);
    expect(stats.ratios.length).toBeLessThanOrEqual(1);
  });
});

describe('bots', () => {
  const freshGame = () => {
    const game = createGame({ seed: 1 });
    startRun(game, DEFAULT_KIT, 1);
    return game;
  };

  it('aims the straight bot at the top wall above the launch spot', () => {
    expect(aimStraightUp()).toEqual({ x: 200, y: 0 });
  });

  it('aims the cluster bot at a live target', () => {
    const game = freshGame();
    const at = aimAtDensestCluster(game);
    expect(game.round.discs.some(d => d.kind === 'target' && d.x === at.x && d.y === at.y)).toBe(true);
  });

  it('keeps hands off when no striker is rolling', () => {
    expect(sweepToPackThenTap(freshGame(), { x: 200, y: 100 })).toEqual({ sweep: null, tap: false });
  });
});

describe('percentile', () => {
  it('returns the median of an odd-length list', () => {
    expect(percentile([5, 1, 3], 0.5)).toBe(3);
  });

  it('returns the top value for the 100th percentile', () => {
    expect(percentile([2, 9, 4], 1)).toBe(9);
  });

  it('returns 0 for an empty list', () => {
    expect(percentile([], 0.5)).toBe(0);
  });
});
