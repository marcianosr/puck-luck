import { PERFECT_BAND, SWEEP_TICKS, TICKS_PER_SECOND, type Rarity } from './constants';

export type CurlStyle = 'standard' | 'late' | 'snake' | 'ricochet' | 'boomerang';

/** Every number or switch a perk can change. The sim reads these; it never asks which perks are owned. */
export interface Modifiers {
  liveBoards: boolean;
  startChain: number;
  frictionBonus: number;
  extraTargets: number;
  roundBonusCoins: number;
  strikerScale: number;
  contractBonusCoins: number;
  clashMult: number;
  chainCap: number;
  goldTargets: number;
  curlBend: number;
  curlShotMult: number;
  carryOver: boolean;
  extraDraws: number;
  bankMult: number;
  sinkPoints: number;
  sinkCoins: number;
  weatherHitMult: number;
  longChainFrom: number;
  longChainMult: number;
  sweepMult: number;
  perfectAllHits: boolean;
  abilityTaps: number;
  secondWind: boolean;
  curlStyle: CurlStyle;
  /** Clash multiplier gained per clash landed this run. */
  clashGrowth: number;
  /** Score multiplier gained per round cleared this run. */
  momentumGrowth: number;
  /** Final multiplier on every hit; only ever set by growth, never by a perk directly. */
  scoreMult: number;
}

export const BASE_MODIFIERS: Readonly<Modifiers> = {
  liveBoards: false,
  startChain: 0,
  frictionBonus: 0,
  extraTargets: 0,
  roundBonusCoins: 0,
  strikerScale: 1,
  contractBonusCoins: 0,
  clashMult: 10,
  chainCap: 24,
  goldTargets: 0,
  curlBend: 1,
  curlShotMult: 1.5,
  carryOver: false,
  extraDraws: 0,
  bankMult: 2,
  sinkPoints: 200,
  sinkCoins: 1,
  weatherHitMult: 1,
  longChainFrom: 10,
  longChainMult: 1,
  sweepMult: 1,
  perfectAllHits: false,
  abilityTaps: 1,
  secondWind: false,
  curlStyle: 'standard',
  clashGrowth: 0,
  momentumGrowth: 0,
  scoreMult: 1,
};

const HIT_VALUE_PER_CHAIN = 10;
const base = BASE_MODIFIERS;
const sweepSeconds = (m: Modifiers) => ((SWEEP_TICKS * m.sweepMult) / TICKS_PER_SECOND).toFixed(1);
const percent = (n: number) => Math.round(n * 100);

interface PerkDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Perks in the same group replace each other. */
  group?: 'curl';
  mods: Partial<Modifiers>;
  /** Text gets this perk's modifiers applied on top of the base, so numbers in copy can't drift from behaviour. */
  desc: (m: Modifiers) => string;
  nums?: (m: Modifiers) => string[];
}

// Order matters when two perks set the same modifier: the later one wins (Midas after Gold Disc).
const PERK_DEFS = [
  { id: 'boards', name: 'Live Boards', rarity: 'common', mods: { liveBoards: true }, desc: () => 'Wall bounces count as chain hits.' },
  { id: 'hot', name: 'Hot Start', rarity: 'common', mods: { startChain: 2 }, desc: m => `Each shot starts at a ${m.startChain}-chain.` },
  { id: 'slick', name: 'Slick Floor', rarity: 'common', mods: { frictionBonus: 0.004 }, desc: () => 'Everything glides further.' },
  { id: 'crowd', name: 'Packed Rink', rarity: 'common', mods: { extraTargets: 3 }, desc: m => `+${m.extraTargets} extra targets each round.` },
  { id: 'piggy', name: 'Piggy Bank', rarity: 'common', mods: { roundBonusCoins: 2 }, desc: m => `+${m.roundBonusCoins} coins after every round.` },
  { id: 'wide', name: 'Wide Strikers', rarity: 'common', mods: { strikerScale: 1.25 }, desc: m => `All strikers are ${percent(m.strikerScale - 1)}% bigger.` },
  { id: 'clerk', name: 'Fine Print', rarity: 'common', mods: { contractBonusCoins: 2 }, desc: m => `Contracts pay +${m.contractBonusCoins} coins each.` },
  {
    id: 'fever', name: 'Clash Fever', rarity: 'rare', mods: { clashMult: 15 },
    desc: m => `Clashes pay ×${m.clashMult} instead of ×${base.clashMult}.`,
    nums: m => [`Clash <b>×${m.clashMult}</b> (normally ×${base.clashMult})`],
  },
  {
    id: 'cap', name: 'Long Chains', rarity: 'rare', mods: { chainCap: 40 },
    desc: m => `Hit value cap rises from ${base.chainCap * HIT_VALUE_PER_CHAIN} to ${m.chainCap * HIT_VALUE_PER_CHAIN}.`,
    nums: m => [`Max hit value <b>${m.chainCap * HIT_VALUE_PER_CHAIN}</b> (normally ${base.chainCap * HIT_VALUE_PER_CHAIN})`],
  },
  { id: 'gold', name: 'Gold Disc', rarity: 'rare', mods: { goldTargets: 1 }, desc: () => 'One target each round is gold. Hits on it pay ×3.' },
  {
    id: 'curl', name: 'Curl Master', rarity: 'rare', mods: { curlBend: 1.7, curlShotMult: 2 },
    desc: m => `Spin bends ${percent(m.curlBend - 1)}% harder. Curl Shots pay ×${m.curlShotMult}.`,
    nums: m => [`Bend <b>×${m.curlBend}</b>`, `Curl Shot <b>×${m.curlShotMult}</b> (normally ×${base.curlShotMult})`],
  },
  { id: 'carry', name: 'Overtime', rarity: 'rare', mods: { carryOver: true }, desc: () => 'Score above the quota carries into the next round.' },
  { id: 'hands', name: 'Big Hands', rarity: 'rare', mods: { extraDraws: 1 }, desc: m => `Draw ${m.extraDraws} extra striker each round.` },
  {
    id: 'banker', name: 'Bank Master', rarity: 'rare', mods: { bankMult: 3 },
    desc: m => `Bank Shots pay ×${m.bankMult} instead of ×${base.bankMult}.`,
    nums: m => [`Bank Shot <b>×${m.bankMult}</b> (normally ×${base.bankMult})`],
  },
  {
    id: 'hustler', name: 'Pocket Hustler', rarity: 'rare', mods: { sinkPoints: 500, sinkCoins: 2 },
    desc: m => `Sinking a target pays ${m.sinkPoints} and ${m.sinkCoins} coins.`,
    nums: m => [`Sink: <b>${m.sinkPoints}</b> points and <b>${m.sinkCoins}</b> coins (normally ${base.sinkPoints} and ${base.sinkCoins})`],
  },
  {
    id: 'storm', name: 'Storm Chaser', rarity: 'rare', mods: { weatherHitMult: 1.5 },
    desc: m => `Weather rounds pay ×${m.weatherHitMult} on every hit.`,
    nums: m => [`Every hit <b>×${m.weatherHitMult}</b> in weather rounds`],
  },
  {
    id: 'reactor', name: 'Chain Reactor', rarity: 'legendary', mods: { longChainMult: 2 },
    desc: m => `Every hit after a ${m.longChainFrom}-chain is worth ×${m.longChainMult}.`,
    nums: m => [`Hit ${m.longChainFrom + 1} and up: <b>×${m.longChainMult}</b>`],
  },
  { id: 'midas', name: 'Midas', rarity: 'legendary', mods: { goldTargets: 3 }, desc: m => `${m.goldTargets} gold targets every round.` },
  {
    id: 'sweeper', name: 'Pro Sweeper', rarity: 'common', mods: { sweepMult: 2 },
    desc: () => 'Sweep lasts twice as long.',
    nums: m => [`Sweep time: <b>${sweepSeconds(m)} s</b> per shot (normally ${sweepSeconds(base)} s)`],
  },
  {
    id: 'sharp', name: 'Sharpshooter', rarity: 'rare', mods: { perfectAllHits: true },
    desc: () => 'Perfect releases make every hit of that shot ×1.5.',
    nums: () => [
      `Perfect band: <b>${percent(PERFECT_BAND.min)}–${percent(PERFECT_BAND.max)}%</b> power`,
      'Every hit of a Perfect shot <b>×1.5</b> (normally only the first)',
    ],
  },
  { id: 'tactician', name: 'Tactician', rarity: 'rare', mods: { abilityTaps: 2 }, desc: () => 'Strikers can use their tap ability twice per shot.' },
  {
    id: 'collector', name: 'Clash Collector', rarity: 'rare', mods: { clashGrowth: 1 },
    desc: m => `Clashes pay +${m.clashGrowth}× for every clash landed this run.`,
  },
  {
    id: 'momentum', name: 'Momentum', rarity: 'legendary', mods: { momentumGrowth: 0.15 },
    desc: m => `Every hit pays +${percent(m.momentumGrowth)}% per round cleared this run.`,
  },
  { id: 'wind', name: 'Second Wind', rarity: 'legendary', mods: { secondWind: true }, desc: () => 'Miss the quota? Get one bonus striker, once per round.' },
  {
    id: 'late', name: 'Late Break', rarity: 'rare', group: 'curl', mods: { curlStyle: 'late' },
    desc: () => 'Curl style. Shots run straight, then break hard as they slow.',
    nums: () => ['Bend: <b>0.2×</b> at full speed, up to <b>3×</b> as it slows'],
  },
  {
    id: 'snake', name: 'Snake Spin', rarity: 'rare', group: 'curl', mods: { curlStyle: 'snake' },
    desc: () => 'Curl style. Spin swings side to side in an S-curve.',
    nums: () => ['Bend swings between <b>−1.9×</b> and <b>+1.9×</b> about 3× a second'],
  },
  {
    id: 'ricochet', name: 'Ricochet Spin', rarity: 'rare', group: 'curl', mods: { curlStyle: 'ricochet' },
    desc: () => 'Curl style. Wall bounces flip your spin and make it stronger.',
    nums: () => ['Each wall bounce: spin <b>×1.4</b> and flipped, up to <b>150%</b>'],
  },
  {
    id: 'boomerang', name: 'Boomerang', rarity: 'legendary', group: 'curl', mods: { curlStyle: 'boomerang' },
    desc: () => 'Curl style. Spin grows instead of fading, so shots hook back.',
    nums: () => ['Spin grows <b>0.4%</b> per frame instead of fading, up to <b>160%</b>'],
  },
] as const satisfies readonly PerkDef[];

export type PerkId = (typeof PERK_DEFS)[number]['id'];

export interface Perk {
  id: PerkId;
  name: string;
  rarity: Rarity;
  group?: 'curl';
  mods: Partial<Modifiers>;
  desc: string;
  nums: string[];
}

export const PERKS: readonly Perk[] = PERK_DEFS.map((def: PerkDef & { id: PerkId }) => {
  const own = { ...BASE_MODIFIERS, ...def.mods };
  return { id: def.id, name: def.name, rarity: def.rarity, group: def.group, mods: def.mods, desc: def.desc(own), nums: def.nums?.(own) ?? [] };
});

export function perkById(id: PerkId): Perk {
  const perk = PERKS.find(p => p.id === id);
  if (!perk) throw new Error(`Unknown perk: ${id}`);
  return perk;
}

export function isPerkId(value: string): value is PerkId {
  return PERKS.some(p => p.id === value);
}

export function modifiersFor(owned: ReadonlySet<PerkId>): Modifiers {
  return PERKS.filter(p => owned.has(p.id)).reduce<Modifiers>((mods, p) => ({ ...mods, ...p.mods }), { ...BASE_MODIFIERS });
}

export const CURL_STYLE_LABEL: Record<CurlStyle, string> = {
  standard: 'curl',
  late: 'late break',
  snake: 'snake',
  ricochet: 'ricochet',
  boomerang: 'boomerang',
};
