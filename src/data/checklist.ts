import { formatNumber } from '@/lib/math';
import { PERKS, type PerkId } from './perks';
import type { StrikerId } from './strikers';

/** Lifetime numbers the Checklist reads. Best-of stats keep a record; the rest add up across runs. */
export type StatKey =
  | 'runs' | 'roundsCleared' | 'chain' | 'shot' | 'runScore'
  | 'clashes' | 'sinks' | 'curls' | 'banks' | 'perfects' | 'shatters' | 'bounties';

export const BEST_STATS: ReadonlySet<StatKey> = new Set(['roundsCleared', 'chain', 'shot', 'runScore']);

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export const GOAL_TEXT: Record<StatKey, (n: number) => string> = {
  runs: n => `Play ${plural(n, 'run')}`,
  roundsCleared: n => `Clear round ${n} in one run`,
  chain: n => `Land a ${n}-chain`,
  shot: n => `Score ${formatNumber(n)} in one shot`,
  runScore: n => `Score ${formatNumber(n)} in one run`,
  clashes: n => `Land ${plural(n, 'striker clash', 'striker clashes')}`,
  sinks: n => `Sink ${plural(n, 'target')}`,
  curls: n => `Land ${plural(n, 'Curl Shot')}`,
  banks: n => `Land ${plural(n, 'Bank Shot')}`,
  perfects: n => `Make ${plural(n, 'Perfect release')}`,
  shatters: n => `Shatter ${plural(n, 'armored target')}`,
  bounties: n => `Finish ${plural(n, 'bounty', 'bounties')}`,
};

const thousands = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** Fits inside a grid tile; the full goal shows when the tile is tapped. */
export const SHORT_GOAL: Record<StatKey, (n: number) => string> = {
  runs: n => `${n} runs`,
  roundsCleared: n => `Round ${n}`,
  chain: n => `${n}-chain`,
  shot: n => `${thousands(n)} shot`,
  runScore: n => `${thousands(n)} run`,
  clashes: n => `${n} clashes`,
  sinks: n => `${n} sink${n === 1 ? '' : 's'}`,
  curls: n => `${n} curls`,
  banks: n => `${n} banks`,
  perfects: n => `${n} perfect`,
  shatters: n => `${n} shatter`,
  bounties: n => `${n} bounty`,
};

export type Reward =
  | { kind: 'kit'; id: string }
  | { kind: 'striker'; id: StrikerId }
  | { kind: 'perk'; id: PerkId };

export interface Tile {
  id: string;
  need: { stat: StatKey; atLeast: number };
  /** Trophy tiles have no reward yet; cosmetics will fill them. */
  reward?: Reward;
}

const tile = (stat: StatKey, atLeast: number, reward?: Reward): Tile => ({ id: `${stat}-${atLeast}`, need: { stat, atLeast }, reward });
const kit = (id: string): Reward => ({ kind: 'kit', id });
const striker = (id: StrikerId): Reward => ({ kind: 'striker', id });
const perk = (id: PerkId): Reward => ({ kind: 'perk', id });

/**
 * The Checklist, row by row. The top row is visible from the start; clearing a tile reveals its neighbours.
 * Easy goals sit top-left, hard ones bottom-right, and the left column is a curl-shot ladder.
 */
export const CHECKLIST: readonly (readonly Tile[])[] = [
  [tile('runs', 2, striker('bomb')), tile('roundsCleared', 2), tile('chain', 8, perk('fever')), tile('clashes', 3, perk('collector')), tile('banks', 5), tile('sinks', 1)],
  [tile('curls', 5, perk('late')), tile('roundsCleared', 3, kit('bruiser')), tile('perfects', 5, perk('tactician')), tile('bounties', 3, perk('carry')), tile('sinks', 5, perk('hustler')), tile('runs', 5, perk('wind'))],
  [tile('curls', 10, perk('snake')), tile('shatters', 10, kit('demo')), tile('chain', 12, striker('ghost')), tile('roundsCleared', 4, perk('storm')), tile('sinks', 15, kit('lodestone')), tile('banks', 25)],
  [tile('curls', 15, kit('trickster')), tile('perfects', 20, perk('sharp')), tile('shot', 2000, striker('comet')), tile('bounties', 10, kit('gambler')), tile('clashes', 25, kit('shatter')), tile('runs', 10)],
  [tile('curls', 25, perk('ricochet')), tile('roundsCleared', 5, perk('momentum')), tile('chain', 20, striker('prism')), tile('runScore', 30_000, perk('midas')), tile('roundsCleared', 6, kit('starlight')), tile('sinks', 40)],
  [tile('curls', 50, perk('boomerang')), tile('chain', 25, perk('reactor')), tile('shot', 5000), tile('clashes', 50), tile('bounties', 25), tile('roundsCleared', 8)],
];

const STARTER_RARES: readonly PerkId[] = ['cap', 'hands', 'gold', 'curl', 'banker'];

/** What a brand-new player has before clearing any tile. */
export const STARTING_CONTENT = {
  kits: ['classic'],
  strikers: ['basic', 'heavy', 'splitter', 'magnet'] satisfies StrikerId[],
  perks: [...PERKS.filter(p => p.rarity === 'common').map(p => p.id), ...STARTER_RARES],
};
