import type { Rarity } from './constants';

/** Identity only; what each striker does lives in its module under sim/strikers. */
interface StrikerDef {
  name: string;
  rarity: Rarity;
  /** Name of the upgraded card. */
  up: string;
}

export const STRIKERS = {
  basic:    { name: 'Basic',    rarity: 'common',    up: 'Hook' },
  heavy:    { name: 'Heavy',    rarity: 'common',    up: 'Wrecker' },
  splitter: { name: 'Splitter', rarity: 'rare',      up: 'Trident' },
  magnet:   { name: 'Magnet',   rarity: 'rare',      up: 'Tractor' },
  ghost:    { name: 'Ghost',    rarity: 'rare',      up: 'Phantom' },
  bomb:     { name: 'Bomb',     rarity: 'rare',      up: 'Big Bomb' },
  comet:    { name: 'Comet',    rarity: 'legendary', up: 'Supernova' },
  prism:    { name: 'Prism',    rarity: 'legendary', up: 'Spectrum' },
} as const satisfies Record<string, StrikerDef>;

export type StrikerId = keyof typeof STRIKERS;
/** Shards are spawned by a Splitter; they never live in a deck. */
export type StrikerType = StrikerId | 'shard';
export type UpgradedCard = `${StrikerId}+`;
export type Card = StrikerId | UpgradedCard;

export const STRIKER_IDS = Object.keys(STRIKERS).filter(isStrikerId);

export function isStrikerId(value: string): value is StrikerId {
  return value in STRIKERS;
}

export const isUpgraded = (card: Card): card is UpgradedCard => card.endsWith('+');

export function baseOf(card: Card): StrikerId {
  const base = card.replace('+', '');
  if (!isStrikerId(base)) throw new Error(`Unknown striker card: ${card}`);
  return base;
}

export const upgradeOf = (card: StrikerId): UpgradedCard => `${card}+`;

export function isCard(value: string): value is Card {
  return isStrikerId(value.replace(/\+$/, ''));
}

export function strikerName(card: Card | 'shard'): string {
  if (card === 'shard') return 'Shard';
  const def = STRIKERS[baseOf(card)];
  return isUpgraded(card) ? def.up : def.name;
}
