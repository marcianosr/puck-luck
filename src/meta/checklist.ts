import { CHECKLIST, GOAL_TEXT, STARTING_CONTENT, type Reward, type Tile } from '@/data/checklist';
import type { PerkId } from '@/data/perks';
import type { StrikerId } from '@/data/strikers';
import type { ContentPool } from '@/sim/types';
import { foldRun, type Profile, type RunSummary } from './profile';

const TILES: readonly Tile[] = CHECKLIST.flat();

export const goalOf = (tile: Tile): string => GOAL_TEXT[tile.need.stat](tile.need.atLeast);

export const isMet = (tile: Tile, profile: Profile): boolean => profile.stats[tile.need.stat] >= tile.need.atLeast;

/** Folds a finished run into the profile and clears every tile it now meets. Returns only the newly cleared tiles. */
export function applyRun(profile: Profile, summary: RunSummary): { profile: Profile; cleared: Tile[] } {
  const next = foldRun(profile, summary);
  const cleared = TILES.filter(t => !next.cleared.includes(t.id) && isMet(t, next));
  return { profile: { ...next, cleared: [...next.cleared, ...cleared.map(t => t.id)] }, cleared };
}

/** A tile's goal can be read once it is cleared, sits next to a cleared tile, or is in the top row. */
export function isRevealed(row: number, col: number, cleared: ReadonlySet<string>): boolean {
  if (row === 0) return true;
  const at = (r: number, c: number) => CHECKLIST[r]?.[c];
  return [at(row, col), at(row - 1, col), at(row + 1, col), at(row, col - 1), at(row, col + 1)]
    .some(t => t !== undefined && cleared.has(t.id));
}

export interface Unlocks {
  kits: ReadonlySet<string>;
  pool: ContentPool;
}

/** The starting content plus every reward of a cleared tile. */
export function unlocksFor(profile: Profile): Unlocks {
  const kits = new Set<string>(STARTING_CONTENT.kits);
  const strikers = new Set<StrikerId>(STARTING_CONTENT.strikers);
  const perks = new Set<PerkId>(STARTING_CONTENT.perks);
  for (const reward of TILES.filter(t => profile.cleared.includes(t.id)).flatMap(t => t.reward ?? [])) {
    if (reward.kind === 'kit') kits.add(reward.id);
    if (reward.kind === 'striker') strikers.add(reward.id);
    if (reward.kind === 'perk') perks.add(reward.id);
  }
  return { kits, pool: { strikers, perks } };
}

const sameReward = (a: Reward, b: Reward) => a.kind === b.kind && a.id === b.id;

/** The tile that unlocks `reward`, with its grid position, or null for starting content. */
export function tileFor(reward: Reward): { tile: Tile; row: number; col: number } | null {
  for (const [row, tiles] of CHECKLIST.entries()) {
    for (const [col, tile] of tiles.entries()) if (tile.reward && sameReward(tile.reward, reward)) return { tile, row, col };
  }
  return null;
}
