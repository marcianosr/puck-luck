import { MAXV, PERFECT_BAND, SWEEP_TICKS } from '@/data/constants';
import type { Modifiers } from '@/data/perks';
import { ABILITY } from '@/data/strikers';
import { speedOf } from '@/lib/math';
import { progressContract } from './contracts';
import { pop, shake, spray } from './effects';
import { explode, resolveDead } from './physics';
import { spawnStriker } from './round';
import type { Game, Round, Striker } from './types';

const NUDGE_IMPULSE = 3;
const PERFECT_SHOT_ALL_HITS = Number.POSITIVE_INFINITY;

export interface Shot {
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

export function launch(game: Game, shot: Shot): Striker | null {
  const { round, run } = game, mods = run.mods;
  const card = round.hand[round.used];
  if (round.phase !== 'aim' || !card) return null;
  const d = spawnStriker(game, card, shot.x, shot.y);
  d.vx = shot.vx;
  d.vy = shot.vy;
  d.spin = shot.spin;
  d.launched = true;
  round.discs.push(d);
  round.used++;
  Object.assign(round, {
    phase: 'roll', chain: mods.startChain, shotPts: 0, slowLock: 0, slowUsed: false,
    active: d, sweepE: sweepTicks(mods), taps: mods.abilityTaps, touch: null, nudges: 1,
    shotMult: d.type === 'comet' ? (d.up ? 3 : 2) : 1,
    prismN: d.type === 'prism' ? (d.up ? 4 : 5) : 0,
    lastSpeed: Math.min(shot.rawSpeed, MAXV), lastSpin: shot.spin,
  } satisfies Partial<Round>);
  round.perfect = isPerfectRelease(shot.rawSpeed);
  round.perfectHits = round.perfect ? (mods.perfectAllHits ? PERFECT_SHOT_ALL_HITS : 1) : 0;
  if (round.perfect) {
    pop(game, d.x, d.y - 24, ['Perfect!'], true);
    spray(game, d.x, d.y, 14, 'gold', 2.5);
    game.emit({ type: 'buzz', pattern: [10, 20, 10] });
    progressContract(game, 'perfect');
  }
  game.emit({ type: 'hand' });
  game.emit({ type: 'buzz', pattern: 6 });
  return d;
}

const rollingActive = (game: Game): Striker | null => {
  const d = game.round.active;
  return d && !d.dead && game.round.phase === 'roll' ? d : null;
};

export function nudge(game: Game, dx: number, dy: number): void {
  const d = rollingActive(game), { round } = game, length = Math.hypot(dx, dy);
  if (!d || round.nudges <= 0 || length < 1) return;
  d.vx += (dx / length) * NUDGE_IMPULSE;
  d.vy += (dy / length) * NUDGE_IMPULSE;
  round.nudges--;
  round.fx.nudge = { x: d.x, y: d.y, a: Math.atan2(dy, dx), t: 0 };
  spray(game, d.x, d.y, 10, 'rare', 2);
  pop(game, d.x, d.y - 18, ['Nudge!']);
  game.emit({ type: 'buzz', pattern: 12 });
}

/** Runs the striker's tap ability. Returns false when it had no effect, so no tap is spent. */
function runAbility(game: Game, d: Striker): boolean {
  const speed = speedOf(d);
  switch (d.type) {
    case 'bomb':
      if (!d.bomb?.armed) return false;
      explode(game, d);
      return true;
    case 'splitter':
      d.dead = 'split';
      resolveDead(game);
      return true;
    case 'magnet': {
      const reach = (d.magnet?.pullR ?? 0) * 1.6;
      for (const t of game.round.discs) {
        if (t.kind !== 'target') continue;
        const dx = d.x - t.x, dy = d.y - t.y, dist = Math.hypot(dx, dy);
        if (dist < reach && dist > 1) {
          const k = 4.5 * (1 - dist / reach);
          t.vx += (dx / dist) * k;
          t.vy += (dy / dist) * k;
        }
      }
      game.round.fx.pulse = { x: d.x, y: d.y, t: 0, r: reach };
      return true;
    }
    case 'heavy':
      if (speed < 0.1) return false;
      d.vx = d.vy = 0;
      d.spin = 0;
      spray(game, d.x, d.y, 16, 'frost', 2.5);
      shake(game, 4);
      return true;
    default:
      if (speed < 0.3) return false;
      d.vx *= 0.4;
      d.vy *= 0.4;
      spray(game, d.x, d.y, 10, 'frost', 2);
      return true;
  }
}

export function useAbility(game: Game): void {
  const d = rollingActive(game), { round } = game;
  if (!d || round.taps <= 0 || !runAbility(game, d)) return;
  round.taps--;
  pop(game, d.x, d.y - 18, [`${ABILITY[d.type].name}!`]);
  game.emit({ type: 'buzz', pattern: [15, 15] });
}
