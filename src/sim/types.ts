import type { ContractDef } from '@/data/contracts';
import type { Point } from '@/data/formations';
import type { Kit } from '@/data/kits';
import type { ColorKey, TargetColor } from '@/data/palette';
import type { Modifiers, PerkId } from '@/data/perks';
import type { Card, StrikerType } from '@/data/strikers';
import type { Theme, ThemeId } from '@/data/themes';
import type { WeatherId } from '@/data/weather';
import type { Rng } from '@/lib/rng';

export type { Point };

/** Pockets, bumpers, slush patches and gravity wells. */
export interface Zone extends Point {
  r: number;
  flash: number;
}

export type DeathCause = 'sunk' | 'split' | 'shatter' | 'boom';

interface DiscBase extends Point {
  id: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  spin: number;
  rot: number;
  flash: number;
  squash: number;
  trail: Point[];
  age: number;
  dead: DeathCause | null;
  pocket: Zone | null;
  launched: boolean;
}

export interface Target extends DiscBase {
  kind: 'target';
  color: TargetColor;
  hp: number;
  maxHp: number;
  gold: boolean;
  touched: boolean;
}

export interface Striker extends DiscBase {
  kind: 'striker';
  type: StrikerType;
  up: boolean;
  banked: boolean;
  curlMul: number;
  breaker: boolean;
  ghost: { phasesLeft: number; through: Set<number> } | null;
  bomb: { armed: boolean; blastR: number; blastK: number; blastPts: number } | null;
  magnet: { pullR: number; pullK: number } | null;
}

export type Disc = Target | Striker;

export interface ActiveWeather {
  id: WeatherId;
  name: string;
  desc: string;
  wind: Point | null;
}

export interface Contract {
  def: ContractDef;
  goal: number;
  prog: number;
  done: boolean;
}

export interface TracePoint extends Point {
  t: number;
}

export interface Held extends Point {
  trail: TracePoint[];
}

export interface Touch extends Point {
  sx: number;
  sy: number;
  t: number;
  moved: number;
}

export type RoundPhase = 'idle' | 'aim' | 'roll' | 'done';

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  t: number;
  size: number;
  color: ColorKey;
}

export interface Pop extends Point {
  t: number;
  lines: string[];
  big: boolean;
}

export interface Banner {
  text: string;
  sub: string;
  sub2?: string;
  t: number;
}

export interface Ring extends Point {
  t: number;
  r: number;
}

export interface Drift extends Point {
  s: number;
  r: number;
}

/** Purely visual state. The sim writes it, render reads it, nothing reads it back into gameplay. */
export interface Effects {
  parts: Particle[];
  pops: Pop[];
  banner: Banner | null;
  shake: number;
  chainPulse: number;
  boom: Ring | null;
  pulse: Ring | null;
  nudge: (Point & { a: number; t: number }) | null;
  flakes: Drift[];
  embers: Drift[];
  cracks: Point[][];
}

export interface Round {
  theme: Theme;
  formation: string;
  discs: Disc[];
  pockets: Zone[];
  bumpers: Zone[];
  patches: Zone[];
  wells: Zone[];
  weather: ActiveWeather | null;
  hand: Card[];
  used: number;
  score: number;
  quota: number;
  quotaHit: boolean;
  chain: number;
  shotPts: number;
  phase: RoundPhase;
  aimX: number;
  held: Held | null;
  touch: Touch | null;
  active: Striker | null;
  sweepE: number;
  sweeping: boolean;
  taps: number;
  nudges: number;
  perfect: boolean;
  perfectHits: number;
  shotMult: number;
  prismN: number;
  lastSpeed: number;
  lastSpin: number;
  freeze: number;
  slowT: number;
  slowLock: number;
  slowUsed: boolean;
  slowK: number;
  frPenalty: number;
  targetTotal: number;
  touched: number;
  fullClear: boolean;
  windUsed: boolean;
  sunkCoins: number;
  contracts: Contract[];
  fx: Effects;
}

export interface Run {
  kit: Kit;
  round: number;
  total: number;
  perks: Set<PerkId>;
  mods: Modifiers;
  deck: Card[];
  coins: number;
  tokens: number;
  carry: number;
  lastFormation: string;
  handDelta: number;
  themes: ThemeId[];
  maxChain: number;
  clashes: number;
  sunk: number;
  bestShot: number;
  contractsDone: number;
}

export type GameEvent =
  | { type: 'score'; bump: boolean }
  | { type: 'coins' }
  | { type: 'contracts' }
  | { type: 'hand' }
  | { type: 'perks' }
  | { type: 'round' }
  | { type: 'buzz'; pattern: number | number[] }
  | { type: 'shotsDone'; cleared: boolean };

export interface Game {
  seed: number;
  /** Gameplay randomness; seeded so a run can be replayed. */
  rng: Rng;
  /** Cosmetic randomness; kept apart so extra sparks never shift the gameplay sequence. */
  fxRng: Rng;
  reduceMotion: boolean;
  nextId: number;
  run: Run;
  round: Round;
  emit: (event: GameEvent) => void;
}

/** Everything a game holds except the round, which is built from it. */
export type GameCore = Omit<Game, 'round'>;
