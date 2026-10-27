import { describe, expect, it } from 'vitest';
import { createGame, startRun } from './game';
import { DEFAULT_KIT } from '@/data/kits';
import { launch } from './actions';
import { addChainLink } from './scoring';
import type { Game } from './types';

const unscored = (points: number) => ({ points, tags: [] });

function rollingGame(): Game {
  const game = createGame({ seed: 1 });
  startRun(game, DEFAULT_KIT, 1);
  launch(game, { x: 200, y: 620, vx: 0, vy: -10, rawSpeed: 10, spin: 0 });
  return game;
}

describe('addChainLink', () => {
  it('raises the chain and scores the chain value', () => {
    const game = rollingGame();
    addChainLink(game, 0, 0, unscored);
    addChainLink(game, 0, 0, unscored);
    expect(game.round.shot?.chain).toBe(2);
    expect(game.round.score).toBe(10 + 20);
  });

  it('counts links from any cause toward the longest chain', () => {
    const game = rollingGame();
    for (let i = 0; i < 4; i++) addChainLink(game, 0, 0, points => ({ points, tags: ['Bumper'] }));
    expect(game.run.maxChain).toBe(4);
  });

  it('freezes and shakes on every 10th link', () => {
    const game = rollingGame();
    for (let i = 0; i < 9; i++) addChainLink(game, 0, 0, unscored);
    game.round.freeze = 0;
    game.round.fx.shake = 0;
    addChainLink(game, 0, 0, unscored);
    expect(game.round.freeze).toBeGreaterThan(0);
    expect(game.round.fx.shake).toBeGreaterThan(0);
  });
});
