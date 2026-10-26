import { describe, expect, it } from 'vitest';
import { CONTRACTS, type ContractId } from '@/data/contracts';
import { createRng } from '@/lib/rng';
import { progressContract, rollContracts } from './contracts';
import { createGame } from './game';
import { addPerk } from './run';
import type { Game, GameEvent } from './types';

function gameWithContract(id: ContractId, goal: number): { game: Game; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const game = createGame({ seed: 1, emit: e => events.push(e) });
  const def = CONTRACTS.find(c => c.id === id);
  if (!def) throw new Error(`no contract ${id}`);
  game.round.contracts = [{ def, goal, prog: 0, done: false }];
  game.run.coins = 0;
  return { game, events };
}

describe('progressContract', () => {
  it('counts up and pays out once on reaching the goal', () => {
    const { game } = gameWithContract('bank', 2);
    progressContract(game, 'bank');
    expect(game.run.coins).toBe(0);
    progressContract(game, 'bank');
    progressContract(game, 'bank');
    expect(game.round.contracts[0]?.done).toBe(true);
    expect(game.run.coins).toBe(3);
    expect(game.run.contractsDone).toBe(1);
  });

  it('keeps the best value for record contracts instead of summing', () => {
    const { game } = gameWithContract('chain', 9);
    progressContract(game, 'chain', 5, true);
    progressContract(game, 'chain', 3, true);
    expect(game.round.contracts[0]?.prog).toBe(5);
  });

  it('pays the Fine Print bonus and the upgrade token', () => {
    const { game } = gameWithContract('full', 1);
    addPerk(game.run, 'clerk');
    progressContract(game, 'full');
    expect([game.run.coins, game.run.tokens]).toEqual([5, 1]);
  });

  it('ignores progress for contracts that are not in play', () => {
    const { game, events } = gameWithContract('bank', 2);
    progressContract(game, 'sink');
    expect(events).toEqual([]);
  });
});

describe('rollContracts', () => {
  it('only offers contracts the rink can support', () => {
    const noPockets = { pockets: 0, bumpers: 0, armored: 0, quota: 1500 };
    for (let seed = 0; seed < 50; seed++) {
      const ids = rollContracts(createRng(seed), 1, noPockets).map(c => c.def.id);
      expect(ids).not.toContain('sink');
      expect(ids).not.toContain('bumper');
      expect(ids).not.toContain('shatter');
    }
  });

  it('sets the one-shot goal to 35% of the quota', () => {
    const shot = CONTRACTS.find(c => c.id === 'shot');
    expect(shot?.goal(0, { pockets: 0, bumpers: 0, armored: 0, quota: 3600 })).toBe(1250);
  });
});
