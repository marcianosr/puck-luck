import type { Rarity } from './constants';

interface StrikerDef {
  name: string;
  rarity: Rarity;
  desc: string;
  up: string;
  upDesc: string;
}

export const STRIKERS = {
  basic:    { name: 'Basic',    rarity: 'common',    desc: 'A plain striker.', up: 'Hook', upDesc: 'Curl bends 80% harder.' },
  heavy:    { name: 'Heavy',    rarity: 'common',    desc: '2.5× mass. Plows through packs.', up: 'Wrecker', upDesc: '3.5× mass, shatters armor in one hit.' },
  splitter: { name: 'Splitter', rarity: 'rare',      desc: 'Breaks into two shards on its first hit.', up: 'Trident', upDesc: 'Breaks into three shards.' },
  magnet:   { name: 'Magnet',   rarity: 'rare',      desc: 'Pulls nearby targets in while it slides.', up: 'Tractor', upDesc: 'Pulls from further, and harder.' },
  ghost:    { name: 'Ghost',    rarity: 'rare',      desc: 'Phases through the first 2 targets it touches, scoring both.', up: 'Phantom', upDesc: 'Phases through 4 targets.' },
  bomb:     { name: 'Bomb',     rarity: 'rare',      desc: 'Explodes when it slows down, blasting everything nearby.', up: 'Big Bomb', upDesc: 'Bigger blast, worth 150.' },
  comet:    { name: 'Comet',    rarity: 'legendary', desc: 'Every hit during its shot is worth ×2.', up: 'Supernova', upDesc: 'Every hit of its shot is worth ×3.' },
  prism:    { name: 'Prism',    rarity: 'legendary', desc: 'Every 5th hit of its shot counts as a ×10 clash.', up: 'Spectrum', upDesc: 'Every 4th hit counts as a clash.' },
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

interface Ability {
  name: string;
  desc: string;
}

const BRAKE: Ability = { name: 'Brake', desc: 'Cuts its speed by 60%.' };

export const ABILITY = {
  basic: BRAKE,
  heavy: { name: 'Anchor', desc: 'Stops dead on the spot.' },
  splitter: { name: 'Split', desc: 'Splits right now instead of on its first hit.' },
  magnet: { name: 'Pulse', desc: 'One strong pull on every target nearby.' },
  ghost: BRAKE,
  bomb: { name: 'Detonate', desc: 'Explodes right now.' },
  comet: BRAKE,
  prism: BRAKE,
  shard: BRAKE,
} as const satisfies Record<StrikerType, Ability>;
