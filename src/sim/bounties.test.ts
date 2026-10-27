import { describe, expect, it } from 'vitest';
import { BOUNTIES, type BountyId } from '@/data/bounties';
import { createRng } from '@/lib/rng';
import { rollBounties } from './bounties';
import { createGame } from './game';
import { record } from './playLog';
import { addPerk } from './run';
import type { Game, GameEvent } from './types';

function gameWithBounty(id: BountyId, goal: number): { game: Game; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const game = createGame({ seed: 1, emit: e => events.push(e) });
  const def = BOUNTIES.find(c => c.id === id);
  if (!def) throw new Error(`no bounty ${id}`);
  game.round.bounties = [{ def, goal, prog: 0, done: false }];
  game.run.coins = 0;
  return { game, events };
}

describe('bounty progress from the play log', () => {
  it('counts up and pays out once on reaching the goal', () => {
    const { game } = gameWithBounty('bank', 2);
    record(game, { type: 'bank' });
    expect(game.run.coins).toBe(0);
    record(game, { type: 'bank' });
    record(game, { type: 'bank' });
    expect(game.round.bounties[0]?.done).toBe(true);
    expect(game.run.coins).toBe(3);
    expect(game.run.bountiesDone).toBe(1);
  });

  it('keeps the best value for record bounties instead of summing', () => {
    const { game } = gameWithBounty('chain', 9);
    record(game, { type: 'link', chain: 5 });
    record(game, { type: 'link', chain: 3 });
    expect(game.round.bounties[0]?.prog).toBe(5);
  });

  it('pays the Fine Print bonus and the upgrade token', () => {
    const { game } = gameWithBounty('full', 1);
    addPerk(game.run, 'clerk');
    record(game, { type: 'fullClear' });
    expect([game.run.coins, game.run.tokens]).toEqual([5, 1]);
  });

  it('ignores progress for bounties that are not in play', () => {
    const { game, events } = gameWithBounty('bank', 2);
    record(game, { type: 'sink' });
    expect(events).toEqual([]);
  });
});

describe('rollBounties', () => {
  it('only offers bounties the rink can support', () => {
    const noPockets = { pockets: 0, bumpers: 0, armored: 0, quota: 1500 };
    for (let seed = 0; seed < 50; seed++) {
      const ids = rollBounties(createRng(seed), 1, noPockets).map(c => c.def.id);
      expect(ids).not.toContain('sink');
      expect(ids).not.toContain('bumper');
      expect(ids).not.toContain('shatter');
    }
  });

  it('sets the one-shot goal to 35% of the quota', () => {
    const shot = BOUNTIES.find(c => c.id === 'shot');
    expect(shot?.goal(0, { pockets: 0, bumpers: 0, armored: 0, quota: 3600 })).toBe(1250);
  });
});
