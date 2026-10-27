import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { record } from './playLog';

describe('record', () => {
  it('keeps the longest chain as the run record', () => {
    const game = createGame({ seed: 1 });
    record(game, { type: 'link', chain: 7 });
    record(game, { type: 'link', chain: 4 });
    expect(game.run.maxChain).toBe(7);
  });

  it('keeps the best shot total, not the latest', () => {
    const game = createGame({ seed: 1 });
    record(game, { type: 'shotPoints', points: 900 });
    record(game, { type: 'shotPoints', points: 300 });
    expect(game.run.bestShot).toBe(900);
  });

  it('counts clashes and sinks for the run', () => {
    const game = createGame({ seed: 1 });
    record(game, { type: 'clash' });
    record(game, { type: 'sink' });
    record(game, { type: 'sink' });
    expect([game.run.clashes, game.run.sunk]).toEqual([1, 2]);
  });
});
