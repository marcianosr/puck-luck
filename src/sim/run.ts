import { HAND } from '@/data/constants';
import type { Kit } from '@/data/kits';
import { modifiersFor, perkById, PERKS, type PerkId } from '@/data/perks';
import type { Card } from '@/data/strikers';
import { FIRST_THEME, LATER_THEMES, THEMES, type Theme } from '@/data/themes';
import { shuffle, type Rng } from '@/lib/rng';
import type { Run } from './types';

const ROUNDS_PER_ACT = 3;
const BASE_QUOTA = 1500;
const QUOTA_GROWTH = 1.55;
const MIN_HAND = 2;

export function createRun(kit: Kit, rng: Rng): Run {
  const perks = new Set<PerkId>(kit.perks);
  return {
    kit, round: 1, total: 0, perks, mods: modifiersFor(perks), deck: [...kit.deck], coins: kit.coins, tokens: 0, carry: 0,
    lastFormation: '', handDelta: kit.handDelta ?? 0, themes: [FIRST_THEME, ...shuffle(rng, LATER_THEMES)],
    maxChain: 0, clashes: 0, sunk: 0, bestShot: 0, contractsDone: 0,
  };
}

export const quotaFor = (round: number, kit: Kit): number =>
  Math.round((BASE_QUOTA * Math.pow(QUOTA_GROWTH, round - 1) * (kit.quotaMul ?? 1)) / 50) * 50;

/** Every three rounds is an act: new rink, more armor, better shop odds. */
export const actIndex = (round: number): number => Math.floor((round - 1) / ROUNDS_PER_ACT);

export function themeFor(run: Run, round: number): Theme {
  const id = run.themes[actIndex(round) % run.themes.length] ?? FIRST_THEME;
  return THEMES[id];
}

export const handSize = (run: Run): number => Math.max(MIN_HAND, HAND + run.mods.extraDraws + run.handDelta);

/** Draws without replacement, reshuffling the deck whenever it runs out mid-draw. */
export function drawHand(rng: Rng, run: Run): Card[] {
  const size = handSize(run), pool: Card[] = [];
  while (pool.length < size) pool.push(...shuffle(rng, run.deck));
  return pool.slice(0, size);
}

export function addPerk(run: Run, id: PerkId): void {
  const perk = perkById(id);
  if (perk.group) PERKS.filter(p => p.group === perk.group).forEach(p => run.perks.delete(p.id));
  run.perks.add(id);
  run.mods = modifiersFor(run.perks);
}
