import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT } from '@/data/kits';
import { launch } from './actions';
import { createGame, startRun } from './game';
import { step } from './physics';
import type { Game } from './types';

const TICKS = 40;

/** A round with nothing on the ice but the launched striker, so only friction slows it. */
function emptyRinkShot(): Game {
  const game = createGame({ seed: 1 });
  startRun(game, DEFAULT_KIT, 1);
  Object.assign(game.round, { discs: [], pockets: [], bumpers: [], patches: [], wells: [], weather: null });
  launch(game, { x: 200, y: 620, vx: 0, vy: -6, rawSpeed: 6, spin: 0 });
  return game;
}

const strikerSpeed = (game: Game) => Math.hypot(game.round.shot?.striker.vx ?? 0, game.round.shot?.striker.vy ?? 0);

describe('sweeping', () => {
  it('keeps a swept striker gliding faster than an unswept one', () => {
    const swept = emptyRinkShot(), unswept = emptyRinkShot();
    for (let t = 0; t < TICKS; t++) {
      step(swept, swept.round.shot?.striker ?? null);
      step(unswept, null);
    }
    expect(strikerSpeed(swept)).toBeGreaterThan(strikerSpeed(unswept));
  });

  it('ignores a finger held far away from the striker', () => {
    const game = emptyRinkShot();
    step(game, { x: 0, y: 0 });
    expect(game.round.shot?.sweeping).toBe(false);
  });

  it('spends the sweep meter while sweeping', () => {
    const game = emptyRinkShot(), start = game.round.shot?.sweepLeft ?? 0;
    for (let t = 0; t < 10; t++) step(game, game.round.shot?.striker ?? null);
    expect(game.round.shot?.sweepLeft).toBeLessThan(start);
  });
});
