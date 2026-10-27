import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT } from '@/data/kits';
import { BASE_MODIFIERS } from '@/data/perks';
import type { Card } from '@/data/strikers';
import { launch, useAbility } from '../actions';
import { createGame, startRun } from '../game';
import { createTarget } from '../round';
import { addChainLink } from '../scoring';
import type { Game, Striker, Target } from '../types';
import { buildOf, describeStriker } from '.';
import { createRng } from '@/lib/rng';

/** A rink holding only the launched striker, rolling slowly up from the launch zone. */
function launched(card: Card): { game: Game; striker: Striker } {
  const game = createGame({ seed: 1 });
  startRun(game, DEFAULT_KIT, 1);
  Object.assign(game.round, { discs: [], pockets: [], bumpers: [], wells: [], hand: [card], used: 0 });
  const striker = launch(game, { x: 200, y: 400, vx: 0, vy: -4, rawSpeed: 4, spin: 0 });
  if (!striker) throw new Error('launch failed');
  return { game, striker };
}

function addTarget(game: Game, x: number, y: number): Target {
  const t = createTarget(++game.nextId, x, y, createRng(1));
  game.round.discs.push(t);
  return t;
}

const strikers = (game: Game) => game.round.discs.filter(d => d.kind === 'striker');

describe('Heavy', () => {
  it('weighs 2.5× a Basic of the same size, 3.5× when upgraded', () => {
    expect(buildOf('heavy', false).massMult).toBe(2.5);
    expect(buildOf('heavy', true).massMult).toBe(3.5);
  });

  it('only shatters armor in one hit once upgraded', () => {
    expect([buildOf('heavy', false).breaker, buildOf('heavy', true).breaker]).toEqual([false, true]);
  });

  it('describes the mass it really has', () => {
    expect(describeStriker('heavy', true, BASE_MODIFIERS)).toContain(`${buildOf('heavy', true).massMult}×`);
  });

  it('anchors to a dead stop on tap', () => {
    const { game, striker } = launched('heavy');
    useAbility(game);
    expect([striker.vx, striker.vy]).toEqual([0, 0]);
  });
});

describe('Bomb', () => {
  it('detonates on tap for 50 points and leaves the ice', () => {
    const { game, striker } = launched('bomb');
    useAbility(game);
    expect(game.round.score).toBe(50);
    expect(game.round.discs).not.toContain(striker);
  });

  it('is worth 150 once upgraded', () => {
    const { game } = launched('bomb+');
    useAbility(game);
    expect(game.round.score).toBe(150);
  });

  it('blasts nearby targets away', () => {
    const { game, striker } = launched('bomb');
    const t = addTarget(game, striker.x, striker.y - 60);
    useAbility(game);
    expect(t.vy).toBeLessThan(0);
  });
});

describe('Splitter', () => {
  it('breaks into two shards on tap, three once upgraded', () => {
    const plain = launched('splitter'), upgraded = launched('splitter+');
    useAbility(plain.game);
    useAbility(upgraded.game);
    expect(strikers(plain.game).map(s => s.type)).toEqual(['shard', 'shard']);
    expect(strikers(upgraded.game)).toHaveLength(3);
  });

  it('marks itself to split when it bounces', () => {
    const { striker } = launched('splitter');
    striker.behaviour.onBounce?.(striker);
    expect(striker.dead).toBe('split');
  });
});

describe('Ghost', () => {
  it('phases through its first two targets and bounces off the third', () => {
    const { game, striker } = launched('ghost');
    const [a, b, c] = [addTarget(game, 0, 0), addTarget(game, 50, 0), addTarget(game, 100, 0)];
    const passes = [a, b, c].map(t => striker.behaviour.passesThrough?.(game, striker, t, true));
    expect(passes).toEqual([true, true, false]);
  });

  it('scores each target it phases through', () => {
    const { game, striker } = launched('ghost');
    striker.behaviour.passesThrough?.(game, striker, addTarget(game, 0, 0), true);
    expect(game.round.score).toBeGreaterThan(0);
  });

  it('turns solid once its phases are used up', () => {
    const { game, striker } = launched('ghost');
    for (let i = 0; i < 2; i++) striker.behaviour.passesThrough?.(game, striker, addTarget(game, i * 50, 0), true);
    expect(striker.behaviour.look(striker).translucent).toBe(false);
  });
});

describe('Magnet', () => {
  it('pulses nearby targets towards itself on tap', () => {
    const { game, striker } = launched('magnet');
    const t = addTarget(game, striker.x + 80, striker.y);
    useAbility(game);
    expect(t.vx).toBeLessThan(0);
  });
});

describe('Comet', () => {
  it('doubles every chain link of its shot', () => {
    const { game } = launched('comet');
    addChainLink(game, 0, 0, points => ({ points, tags: [] }));
    expect(game.round.score).toBe(20);
  });
});

describe('Prism', () => {
  it('turns every 5th hit into a clash, every 4th once upgraded', () => {
    expect([buildOf('prism', false).clashEvery, buildOf('prism', true).clashEvery]).toEqual([5, 4]);
  });

  it('quotes the clash multiplier the run really has', () => {
    expect(describeStriker('prism', false, { ...BASE_MODIFIERS, clashMult: 15 })).toContain('×15');
  });
});
