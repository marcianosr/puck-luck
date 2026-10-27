import { MAXV, PERFECT_BAND, SWEEP_TICKS } from '@/data/constants';
import type { Modifiers } from '@/data/perks';
import { pop, spray } from './effects';
import { resolveDead } from './physics';
import { record } from './playLog';
import { spawnStriker } from './round';
import { abilityOf } from './strikers';
import type { Game, Shot, Striker } from './types';

const NUDGE_IMPULSE = 3;
const PERFECT_SHOT_ALL_HITS = Number.POSITIVE_INFINITY;

/** What the finger did at release, ready to launch. */
export interface Flick {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Flick speed before capping at MAXV; an over-hard flick is never Perfect. */
  rawSpeed: number;
  spin: number;
}

export const sweepTicks = (mods: Modifiers): number => SWEEP_TICKS * mods.sweepMult;

export const powerOf = (speed: number): number => Math.min(speed, MAXV) / MAXV;

export const isInPerfectBand = (power: number): boolean => power >= PERFECT_BAND.min && power <= PERFECT_BAND.max;

export const isPerfectRelease = (rawSpeed: number): boolean => rawSpeed <= MAXV && isInPerfectBand(powerOf(rawSpeed));

export function launch(game: Game, flick: Flick): Striker | null {
  const { round, run } = game, mods = run.mods;
  const card = round.hand[round.used];
  if (round.phase !== 'aim' || !card) return null;
  const d = spawnStriker(game, card, flick.x, flick.y);
  d.vx = flick.vx;
  d.vy = flick.vy;
  d.spin = flick.spin;
  d.launched = true;
  round.discs.push(d);
  round.used++;
  round.phase = 'roll';
  const perfect = isPerfectRelease(flick.rawSpeed);
  round.shot = {
    striker: d, chain: mods.startChain, points: 0, sweepLeft: sweepTicks(mods), sweeping: false,
    taps: mods.abilityTaps, nudges: 1, perfect, perfectHits: perfect ? (mods.perfectAllHits ? PERFECT_SHOT_ALL_HITS : 1) : 0,
    chainMult: d.build.chainMult, clashEvery: d.build.clashEvery,
    launchSpeed: Math.min(flick.rawSpeed, MAXV), launchSpin: flick.spin,
    slowT: 0, slowLock: 0, slowUsed: false,
  } satisfies Shot;
  if (perfect) {
    pop(game, d.x, d.y - 24, ['Perfect!'], true);
    spray(game, d.x, d.y, 14, 'gold', 2.5);
    game.emit({ type: 'buzz', pattern: [10, 20, 10] });
    record(game, { type: 'perfect' });
  }
  game.emit({ type: 'hand' });
  game.emit({ type: 'buzz', pattern: 6 });
  return d;
}

/** The shot whose striker is still on the ice, if any. */
const liveShot = (game: Game): Shot | null => {
  const shot = game.round.shot;
  return shot && !shot.striker.dead ? shot : null;
};

export function nudge(game: Game, dx: number, dy: number): void {
  const shot = liveShot(game), length = Math.hypot(dx, dy);
  if (!shot || shot.nudges <= 0 || length < 1) return;
  const d = shot.striker;
  d.vx += (dx / length) * NUDGE_IMPULSE;
  d.vy += (dy / length) * NUDGE_IMPULSE;
  shot.nudges--;
  game.round.fx.nudge = { x: d.x, y: d.y, a: Math.atan2(dy, dx), t: 0 };
  spray(game, d.x, d.y, 10, 'rare', 2);
  pop(game, d.x, d.y - 18, ['Nudge!']);
  game.emit({ type: 'buzz', pattern: 12 });
}

export function useAbility(game: Game): void {
  const shot = liveShot(game);
  if (!shot || shot.taps <= 0) return;
  const d = shot.striker;
  if (!d.behaviour.ability(game, d)) return;
  resolveDead(game);
  shot.taps--;
  pop(game, d.x, d.y - 18, [`${abilityOf(d.type).name}!`]);
  game.emit({ type: 'buzz', pattern: [15, 15] });
}
