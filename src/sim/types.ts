import type { BountyDef } from '@/data/bounties';
import type { Point } from '@/data/formations';
import type { Kit } from '@/data/kits';
import type { ColorKey, TargetColor } from '@/data/palette';
import type { Modifiers, PerkId } from '@/data/perks';
import type { Card, StrikerType } from '@/data/strikers';
import type { Theme, ThemeId } from '@/data/themes';
import type { WeatherId } from '@/data/weather';
import type { Rng } from '@/lib/rng';
import type { Shop } from './shop';

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

/** Numbers a striker type sets on the disc and on the shot it starts. */
export interface StrikerBuild {
  radiusMult: number;
  massMult: number;
  curlMult: number;
  /** Shatters armor in one hit. */
  breaker: boolean;
  /** Multiplies every chain link of its shot (Comet). */
  chainMult: number;
  /** Every nth hit of its shot counts as a clash (Prism); 0 for none. */
  clashEvery: number;
  /** Scales the clash multiplier of those Prism clashes (Spectrum). */
  prismMult: number;
}

/** What render needs to know about a striker's private state. */
export interface Look {
  translucent: boolean;
  fuseLit: boolean;
}

export type SpawnShard = (x: number, y: number, scale: number) => Striker;

/**
 * Per-striker hooks, created by the striker's module when it spawns. Any state they need lives in
 * their closure, so physics never has to know which striker types exist.
 */
export interface StrikerBehaviour {
  /** Every physics substep, before the striker moves. */
  onSubstep?: (game: Game, self: Striker, f: number, speed: number) => void;
  /** Every tick, once discs have moved. */
  onTick?: (game: Game, self: Striker, speed: number) => void;
  /** Asked for every disc it overlaps or has just left. True: it passes through `other` instead of bouncing. */
  passesThrough?: (game: Game, self: Striker, other: Disc, overlapping: boolean) => boolean;
  /** After it bounces off another disc. */
  onBounce?: (self: Striker) => void;
  /** When it dies by splitting: the shards that replace it. */
  burst?: (game: Game, self: Striker, spawnShard: SpawnShard) => Striker[];
  /** The tap ability. False when it had no effect, so no tap is spent. */
  ability: (game: Game, self: Striker) => boolean;
  look: (self: Striker) => Look;
}

export interface Striker extends DiscBase {
  kind: 'striker';
  type: StrikerType;
  up: boolean;
  banked: boolean;
  build: StrikerBuild;
  behaviour: StrikerBehaviour;
}

export type Disc = Target | Striker;

export interface ActiveWeather {
  id: WeatherId;
  name: string;
  desc: string;
  wind: Point | null;
}

export interface Bounty {
  def: BountyDef;
  goal: number;
  prog: number;
  done: boolean;
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

/** Everything that only exists while one striker's shot is on the ice. Created at launch, dropped when the shot ends. */
export interface Shot {
  striker: Striker;
  chain: number;
  points: number;
  /** Sweep ticks left this shot. */
  sweepLeft: number;
  sweeping: boolean;
  taps: number;
  nudges: number;
  perfect: boolean;
  perfectHits: number;
  /** Multiplies every chain link of the shot (Comet). */
  chainMult: number;
  /** Every nth hit counts as a clash (Prism); 0 for none. */
  clashEvery: number;
  prismMult: number;
  launchSpeed: number;
  launchSpin: number;
  /** Slow-mo ticks left from a clash or full clear. */
  slowT: number;
  /** Slow-mo ticks left from a long chain winding down. */
  slowLock: number;
  slowUsed: boolean;
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
  phase: RoundPhase;
  shot: Shot | null;
  freeze: number;
  slowK: number;
  frPenalty: number;
  targetTotal: number;
  touched: number;
  fullClear: boolean;
  windUsed: boolean;
  sunkCoins: number;
  bounties: Bounty[];
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
  bountiesDone: number;
}

export type GameEvent =
  | { type: 'score'; bump: boolean }
  | { type: 'coins' }
  | { type: 'bounties' }
  | { type: 'hand' }
  | { type: 'perks' }
  | { type: 'round' }
  | { type: 'shop' }
  | { type: 'feel'; cue: Exclude<FeelCue, ChainCue> }
  /** `chain` is the shot's chain length after this link, so feedback can build with it. */
  | { type: 'feel'; cue: ChainCue; chain: number }
  | { type: 'runPhase' };

/** A moment the player should feel: the UI decides how it sounds and vibrates. */
export type FeelCue =
  | 'launch' | 'perfect' | 'nudge' | 'ability'
  | 'hit' | 'clash' | 'shatter' | 'sink' | 'boom'
  | 'quota' | 'fullClear' | 'bounty' | 'secondWind' | 'roundCleared'
  | 'buy' | 'upgrade';

type ChainCue = 'hit' | 'clash';

/** Where the run is. The sim moves it along; the UI only shows it. */
export type RunPhase = 'kitPick' | 'playing' | 'shop' | 'over';

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
  runPhase: RunPhase;
  /** The open shop while `runPhase` is 'shop'. */
  shop: Shop | null;
  emit: (event: GameEvent) => void;
}

/** Everything a game holds except the round, which is built from it. */
export type GameCore = Omit<Game, 'round'>;
