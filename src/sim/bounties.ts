import { BOUNTIES, BOUNTIES_PER_ROUND, type BountyDef, type RinkLayout } from '@/data/bounties';
import { shuffle, type Rng } from '@/lib/rng';
import { showBanner } from './effects';
import type { Play } from './playLog';
import { actIndex } from './run';
import type { Bounty, Game, Round } from './types';

export const layoutOf = (round: Round): RinkLayout => ({
  pockets: round.pockets.length,
  bumpers: round.bumpers.length,
  armored: round.discs.filter(d => d.kind === 'target' && d.maxHp > 1).length,
  quota: round.quota,
});

export function rollBounties(rng: Rng, roundNumber: number, layout: RinkLayout): Bounty[] {
  const act = actIndex(roundNumber);
  const possible = BOUNTIES.filter(c => !c.isPossibleOn || c.isPossibleOn(layout));
  return shuffle(rng, possible).slice(0, BOUNTIES_PER_ROUND).map(def => ({ def, goal: def.goal(act, layout), prog: 0, done: false }));
}

export const bountyCoins = (def: BountyDef, bonus: number): number => def.coins + bonus;

/** Moves every open bounty by what `play` is worth to it; record bounties keep the best value seen. */
export function progressBounties(game: Game, play: Play): void {
  const { run, round } = game;
  let changed = false;
  for (const k of round.bounties) {
    const amount = k.def.progress(play);
    if (k.done || !amount) continue;
    const before = k.prog;
    k.prog = k.def.tracksRecord ? Math.max(k.prog, amount) : k.prog + amount;
    if (k.prog !== before) changed = true;
    if (k.prog < k.goal) continue;
    k.done = true;
    k.prog = k.goal;
    run.bountiesDone++;
    const coins = bountyCoins(k.def, run.mods.bountyBonusCoins), tokens = k.def.token ?? 0;
    run.coins += coins;
    run.tokens += tokens;
    game.emit({ type: 'coins' });
    showBanner(game, { text: 'Bounty done!', sub: `${k.def.text(k.goal)} · +${coins} coins${tokens ? ' · +1 upgrade token' : ''}`, t: 1.8 });
    game.emit({ type: 'buzz', pattern: [20, 30, 20] });
  }
  if (changed) game.emit({ type: 'bounties' });
}
