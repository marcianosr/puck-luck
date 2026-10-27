import { describe, it } from 'vitest';
import { KITS } from '@/data/kits';
import { BOTS, percentile, playRun, type RunStats } from './autoplay';

// Only `pnpm balance` sets this; the report is too slow and too noisy for the regular test run.
const SEEDS = Number(import.meta.env.BALANCE_SEEDS ?? 0);
const REPORT_ROUNDS = 8;

const round1 = (n: number) => Math.round(n * 10) / 10;
const share = (runs: readonly RunStats[], ok: (s: RunStats) => boolean) => `${Math.round((runs.filter(ok).length / runs.length) * 100)}%`;

function summarise(runs: readonly RunStats[]) {
  const cleared = runs.map(s => s.roundsCleared);
  const row: Record<string, string | number> = {
    median: percentile(cleared, 0.5),
    p90: percentile(cleared, 0.9),
    mean: round1(cleared.reduce((a, b) => a + b, 0) / runs.length),
  };
  for (let r = 1; r <= REPORT_ROUNDS; r++) row[`clr R${r}`] = share(runs, s => s.roundsCleared >= r);
  return row;
}

function ratiosByRound(runs: readonly RunStats[]) {
  const row: Record<string, number> = {};
  for (let r = 0; r < REPORT_ROUNDS; r++) {
    const reached = runs.flatMap(s => s.ratios[r] ?? []);
    if (reached.length) row[`R${r + 1}`] = round1(percentile(reached, 0.5));
  }
  return row;
}

describe.runIf(SEEDS > 0)('balance report', () => {
  it('prints rounds cleared and score/quota per kit and bot', () => {
    const seeds = Array.from({ length: SEEDS }, (_, i) => i + 1);
    const cleared: Record<string, ReturnType<typeof summarise>> = {};
    const ratios: Record<string, ReturnType<typeof ratiosByRound>> = {};
    for (const bot of Object.values(BOTS)) {
      for (const kit of KITS) {
        const runs = seeds.map(seed => playRun(kit, seed, bot));
        cleared[`${kit.id}/${bot.name}`] = summarise(runs);
        ratios[`${kit.id}/${bot.name}`] = ratiosByRound(runs);
      }
    }
    console.log(`\nRounds cleared over ${SEEDS} seeds (clr Rn = share of runs that cleared round n)`);
    console.table(cleared);
    console.log('\nMedian score ÷ quota, among runs that reached the round');
    console.table(ratios);
  });
});
