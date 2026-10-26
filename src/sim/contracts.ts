import { CONTRACTS, CONTRACTS_PER_ROUND, type ContractDef, type ContractId, type RinkLayout } from '@/data/contracts';
import { shuffle, type Rng } from '@/lib/rng';
import { showBanner } from './effects';
import { actIndex } from './run';
import type { Contract, Game, Round } from './types';

export const layoutOf = (round: Round): RinkLayout => ({
  pockets: round.pockets.length,
  bumpers: round.bumpers.length,
  armored: round.discs.filter(d => d.kind === 'target' && d.maxHp > 1).length,
  quota: round.quota,
});

export function rollContracts(rng: Rng, roundNumber: number, layout: RinkLayout): Contract[] {
  const act = actIndex(roundNumber);
  const possible = CONTRACTS.filter(c => !c.isPossibleOn || c.isPossibleOn(layout));
  return shuffle(rng, possible).slice(0, CONTRACTS_PER_ROUND).map(def => ({ def, goal: def.goal(act, layout), prog: 0, done: false }));
}

export const contractCoins = (def: ContractDef, bonus: number): number => def.coins + bonus;

/** Adds `amount` to matching contracts, or with `asRecord` keeps the best value seen (longest chain, best shot). */
export function progressContract(game: Game, id: ContractId, amount = 1, asRecord = false): void {
  const { run, round } = game;
  let changed = false;
  for (const k of round.contracts) {
    if (k.done || k.def.id !== id) continue;
    const before = k.prog;
    k.prog = asRecord ? Math.max(k.prog, amount) : k.prog + amount;
    if (k.prog !== before) changed = true;
    if (k.prog < k.goal) continue;
    k.done = true;
    k.prog = k.goal;
    run.contractsDone++;
    const coins = contractCoins(k.def, run.mods.contractBonusCoins), tokens = k.def.token ?? 0;
    run.coins += coins;
    run.tokens += tokens;
    game.emit({ type: 'coins' });
    showBanner(game, { text: 'Contract done!', sub: `${k.def.text(k.goal)} · +${coins} coins${tokens ? ' · +1 upgrade token' : ''}`, t: 1.8 });
    game.emit({ type: 'buzz', pattern: [20, 30, 20] });
  }
  if (changed) game.emit({ type: 'contracts' });
}
