import { BEST_STATS, type StatKey } from '@/data/checklist';
import { load, save } from '@/lib/storage';
import type { Run } from '@/sim/types';

/** Everything that carries over between runs. */
export interface Profile {
  stats: Record<StatKey, number>;
  /** Ids of cleared Checklist tiles. */
  cleared: string[];
}

/** What one finished run adds to the profile, in the profile's own stat names. */
export type RunSummary = Omit<Record<StatKey, number>, 'runs'>;

const PROFILE_KEY = 'chainSmashProfile';

const STAT_KEYS: readonly StatKey[] = [
  'runs', 'roundsCleared', 'chain', 'shot', 'runScore', 'clashes', 'sinks', 'curls', 'banks', 'perfects', 'shatters', 'bounties',
];

export const emptyProfile = (): Profile => ({
  stats: { runs: 0, roundsCleared: 0, chain: 0, shot: 0, runScore: 0, clashes: 0, sinks: 0, curls: 0, banks: 0, perfects: 0, shatters: 0, bounties: 0 },
  cleared: [],
});

export function summarizeRun(run: Run, roundsCleared: number): RunSummary {
  return {
    roundsCleared, chain: run.maxChain, shot: run.bestShot, runScore: run.total, clashes: run.clashes, sinks: run.sunk,
    curls: run.curls, banks: run.banks, perfects: run.perfects, shatters: run.shatters, bounties: run.bountiesDone,
  };
}

/** Adds one run to the profile: records keep the best, counts add up. */
export function foldRun(profile: Profile, summary: RunSummary): Profile {
  const stats = { ...profile.stats, runs: profile.stats.runs + 1 };
  for (const [key, value] of Object.entries(summary)) {
    if (!isStatKey(key)) continue;
    stats[key] = BEST_STATS.has(key) ? Math.max(stats[key], value) : stats[key] + value;
  }
  return { ...profile, stats };
}

function isStatKey(key: string): key is StatKey {
  return STAT_KEYS.some(k => k === key);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isProfile(v: unknown): v is Profile {
  if (!isRecord(v) || !isRecord(v.stats) || !Array.isArray(v.cleared)) return false;
  const stats = v.stats;
  return STAT_KEYS.every(k => typeof stats[k] === 'number') && v.cleared.every(id => typeof id === 'string');
}

export const loadProfile = (): Profile => load(PROFILE_KEY, isProfile, emptyProfile());
export const saveProfile = (profile: Profile): void => save(PROFILE_KEY, profile);
