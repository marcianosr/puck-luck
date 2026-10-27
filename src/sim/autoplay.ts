import { LAUNCH_Y, MAXV, PERFECT_BAND, R, W } from '@/data/constants';
import type { Kit } from '@/data/kits';
import { isUpgraded } from '@/data/strikers';
import { launch, type Flick } from './actions';
import { advanceEffects } from './effects';
import { createGame, nextRound, startRun } from './game';
import { step } from './physics';
import { buyPerk, buyStriker, perkPrice, strikerPrice, upgradeCard } from './shop';
import type { Game, Target } from './types';

/** A headless player: how it flicks, and what it buys between rounds. */
export interface Bot {
  name: string;
  aim: (game: Game) => Flick;
  shop: (game: Game) => void;
}

export interface RunStats {
  kit: string;
  seed: number;
  roundsCleared: number;
  total: number;
  /** Score ÷ quota for every round played; only the last one can be below 1. */
  ratios: number[];
  maxChain: number;
  clashes: number;
}

const DEFAULT_MAX_ROUNDS = 30;
// A minute of sim time; a shot that rolls longer is a physics bug, not a long shot.
const MAX_TICKS_PER_SHOT = 60 * 60;
const CLUSTER_RADIUS = R * 4;
// The middle of the Perfect band, so every bot flick gets the Perfect bonus a practised player would.
const PERFECT_SPEED = ((PERFECT_BAND.min + PERFECT_BAND.max) / 2) * MAXV;
const LAUNCH_X = W / 2;

const isLiveTarget = (d: Game['round']['discs'][number]): d is Target => d.kind === 'target' && !d.dead;

function flickToward(x: number, y: number): Flick {
  const dx = x - LAUNCH_X, dy = y - LAUNCH_Y, len = Math.hypot(dx, dy) || 1;
  return { x: LAUNCH_X, y: LAUNCH_Y, vx: (dx / len) * PERFECT_SPEED, vy: (dy / len) * PERFECT_SPEED, rawSpeed: PERFECT_SPEED, spin: 0 };
}

export const aimStraightUp = (): Flick => flickToward(LAUNCH_X, 0);

/** Aims at the live target with the most live neighbours: a greedy stand-in for reading the rink. */
export function aimAtDensestCluster(game: Game): Flick {
  const targets = game.round.discs.filter(isLiveTarget);
  const neighbours = (t: Target) => targets.filter(o => Math.hypot(o.x - t.x, o.y - t.y) < CLUSTER_RADIUS).length;
  const best = targets.reduce<{ t: Target; n: number } | null>((acc, t) => {
    const n = neighbours(t);
    return !acc || n > acc.n ? { t, n } : acc;
  }, null);
  return best ? flickToward(best.t.x, best.t.y) : aimStraightUp();
}

/** Buys the priciest perks it can afford, then strikers, then spends tokens on upgrades. */
export function shopGreedily(game: Game): void {
  const { run, shop } = game;
  if (!shop) return;
  [...shop.perks].sort((a, b) => perkPrice(b.id) - perkPrice(a.id)).forEach(offer => buyPerk(run, offer));
  [...shop.strikers].sort((a, b) => strikerPrice(b.id) - strikerPrice(a.id)).forEach(offer => buyStriker(run, offer));
  while (run.tokens > 0) {
    const card = run.deck.find(c => !isUpgraded(c));
    if (!card || !upgradeCard(run, card)) break;
  }
}

export const BOTS = {
  straight: { name: 'straight', aim: aimStraightUp, shop: shopGreedily },
  cluster: { name: 'cluster', aim: aimAtDensestCluster, shop: shopGreedily },
} as const satisfies Record<string, Bot>;

function playShot(game: Game, flick: Flick): void {
  if (!launch(game, flick)) return;
  for (let t = 0; game.round.phase === 'roll'; t++) {
    if (t >= MAX_TICKS_PER_SHOT) throw new Error(`Shot never settled (seed ${game.seed}, round ${game.run.round})`);
    advanceEffects(game, step(game, null));
  }
}

/** Plays a whole run headless and reports how far it got. */
export function playRun(kit: Kit, seed: number, bot: Bot, maxRounds = DEFAULT_MAX_ROUNDS): RunStats {
  const game = createGame({ seed });
  startRun(game, kit, seed);
  const ratios: number[] = [];
  while (ratios.length < maxRounds) {
    while (game.round.phase === 'aim') playShot(game, bot.aim(game));
    ratios.push(game.round.score / game.round.quota);
    if (game.runPhase !== 'shop') break;
    bot.shop(game);
    nextRound(game);
  }
  const { run } = game;
  return {
    kit: kit.id, seed, roundsCleared: ratios.filter(r => r >= 1).length, total: run.total, ratios, maxChain: run.maxChain, clashes: run.clashes,
  };
}

/** Nearest-rank percentile; `p` runs from 0 to 1. */
export function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
}
