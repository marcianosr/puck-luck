import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT } from '@/data/kits';
import { launch, type Flick } from './actions';
import { createGame, nextRound, startRun } from './game';
import { step } from './physics';
import { buyOffer } from './shop';
import type { Game, GameEvent } from './types';

const MAX_TICKS = 60 * 60;
const STRAIGHT_UP: Flick = { x: 200, y: 620, vx: 0.4, vy: -16, rawSpeed: 16, spin: 0 };
const EASY_QUOTA = 1;
const IMPOSSIBLE_QUOTA = Number.MAX_SAFE_INTEGER;

function newRun(seed = 7): { game: Game; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const game = createGame({ seed, emit: e => events.push(e) });
  startRun(game, DEFAULT_KIT, seed);
  return { game, events };
}

/** Shoots every striker in the hand straight up and lets each shot settle. */
function playOutRound(game: Game, quota: number): void {
  game.round.quota = quota;
  while (game.round.phase === 'aim' && launch(game, STRAIGHT_UP)) {
    for (let t = 0; t < MAX_TICKS && game.round.shot; t++) step(game, null);
  }
}

describe('round flow', () => {
  it('starts a run in play', () => {
    expect(newRun().game.runPhase).toBe('playing');
  });

  it('settles a cleared round and opens the shop', () => {
    const { game } = newRun(), coinsBefore = game.run.coins;
    playOutRound(game, EASY_QUOTA);
    const earned = game.shop?.earnings.reduce((sum, e) => sum + e.coins, 0) ?? 0;
    expect(game.runPhase).toBe('shop');
    expect(earned).toBeGreaterThan(0);
    expect(game.run.coins).toBeGreaterThanOrEqual(coinsBefore + earned);
    expect(game.shop?.strikers.length).toBeGreaterThan(0);
  });

  it('ends the run when the quota is missed', () => {
    const { game } = newRun();
    playOutRound(game, IMPOSSIBLE_QUOTA);
    expect(game.runPhase).toBe('over');
    expect(game.shop).toBeNull();
  });

  it('leaves the shop for the next round', () => {
    const { game } = newRun();
    playOutRound(game, EASY_QUOTA);
    nextRound(game);
    expect([game.runPhase, game.run.round, game.round.phase, game.shop]).toEqual(['playing', 2, 'aim', null]);
  });

  it('ignores a next-round request outside the shop', () => {
    const { game } = newRun();
    nextRound(game);
    expect(game.run.round).toBe(1);
  });

  it('announces a purchase so the HUD and shop can refresh', () => {
    const { game, events } = newRun();
    playOutRound(game, EASY_QUOTA);
    game.run.coins = 99;
    events.length = 0;
    expect(buyOffer(game, 'striker', 0)).toBe(true);
    expect(events.map(e => e.type)).toEqual(expect.arrayContaining(['coins', 'shop', 'buzz']));
  });

  it('replays two rounds and the shop between them exactly from the same seed', () => {
    const twoRounds = () => {
      const { game } = newRun(2024);
      playOutRound(game, EASY_QUOTA);
      const offers = game.shop?.strikers.map(o => o.id);
      nextRound(game);
      playOutRound(game, EASY_QUOTA);
      return { offers, total: game.run.total, coins: game.run.coins, maxChain: game.run.maxChain };
    };
    expect(twoRounds()).toEqual(twoRounds());
  });
});
