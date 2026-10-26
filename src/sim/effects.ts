import { H, TICKS_PER_SECOND, W } from '@/data/constants';
import type { ColorKey } from '@/data/palette';
import { between } from '@/lib/rng';
import type { Banner, Effects, Game, Ring } from './types';

const SECONDS_PER_TICK = 1 / TICKS_PER_SECOND;
const POP_SECONDS = 1.2;
const BOOM_SECONDS = 0.4;
const PULSE_SECONDS = 0.35;
const NUDGE_SECONDS = 0.4;

export const emptyEffects = (): Effects => ({
  parts: [], pops: [], banner: null, shake: 0, chainPulse: 0, boom: null, pulse: null, nudge: null, flakes: [], embers: [], cracks: [],
});

export function spray(game: Game, x: number, y: number, n: number, color: ColorKey, power: number): void {
  const { fxRng } = game;
  for (let i = 0; i < n; i++) {
    const a = fxRng() * Math.PI * 2, s = between(fxRng, 0.4, 1) * power;
    game.round.fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: between(fxRng, 0.25, 0.55), t: 0, size: between(fxRng, 1.2, 3), color });
  }
}

export function pop(game: Game, x: number, y: number, lines: string[], big = false): void {
  game.round.fx.pops.push({ x, y, t: 0, lines, big });
}

export function showBanner(game: Game, banner: Banner): void {
  game.round.fx.banner = banner;
}

export function shake(game: Game, amount: number): void {
  game.round.fx.shake = game.reduceMotion ? 0 : amount;
}

export const ringProgress = (ring: Ring, seconds: number): number => ring.t / seconds;
export const boomProgress = (ring: Ring) => ringProgress(ring, BOOM_SECONDS);
export const pulseProgress = (ring: Ring) => ringProgress(ring, PULSE_SECONDS);
export const nudgeProgress = (t: number) => t / NUDGE_SECONDS;
export const popProgress = (t: number) => t / POP_SECONDS;

/**
 * Advances everything visual by one sim tick. `live` is the tick's time scale (0 while frozen, <1 in slow-mo).
 * This used to run per drawn frame, which made effects twice as fast on 120 Hz screens.
 */
export function advanceEffects(game: Game, live: number): void {
  const round = game.round, fx = round.fx;
  if (fx.shake > 0 && !round.freeze) {
    fx.shake *= 0.85;
    if (fx.shake < 0.3) fx.shake = 0;
  }
  for (const d of round.discs) {
    d.flash = Math.max(0, d.flash - 0.06 * live);
    d.squash = Math.max(0, d.squash - 0.08 * live);
  }
  for (const p of fx.parts) {
    p.t += live * SECONDS_PER_TICK;
    p.x += p.vx * live;
    p.y += p.vy * live;
    p.vx *= Math.pow(0.9, live);
    p.vy *= Math.pow(0.9, live);
  }
  fx.parts = fx.parts.filter(p => p.t < p.life);

  for (const p of fx.pops) p.t += (Math.max(live, 0.5) * SECONDS_PER_TICK);
  fx.pops = fx.pops.filter(p => popProgress(p.t) < 1);

  if (fx.boom) {
    fx.boom.t += SECONDS_PER_TICK;
    if (boomProgress(fx.boom) >= 1) fx.boom = null;
  }
  if (fx.pulse) {
    fx.pulse.t += SECONDS_PER_TICK;
    if (pulseProgress(fx.pulse) >= 1) fx.pulse = null;
  }
  if (fx.nudge) {
    fx.nudge.t += SECONDS_PER_TICK;
    if (nudgeProgress(fx.nudge.t) >= 1) fx.nudge = null;
  }
  if (fx.banner && fx.banner.t > 0) fx.banner.t -= SECONDS_PER_TICK;
  fx.chainPulse = Math.max(0, fx.chainPulse - 0.08 * live);
  driftWeather(game, Math.max(live, 0.3));
}

function driftWeather(game: Game, live: number): void {
  const { fx, weather } = game.round;
  const wx = weather?.wind?.x ?? 0, wy = weather?.wind?.y ?? 0;
  for (const f of fx.flakes) {
    f.y += (f.s + wy * 0.8) * live;
    f.x += (Math.sin(f.y * 0.03) * 0.3 + wx * 1.5) * live;
    if (f.y > H) f.y -= H;
    if (f.y < 0) f.y += H;
    if (f.x > W) f.x -= W;
    if (f.x < 0) f.x += W;
  }
  for (const e of fx.embers) {
    e.y -= e.s * live;
    e.x += Math.sin(e.y * 0.05) * 0.3 * live;
    if (e.y < 0) {
      e.y = H;
      e.x = between(game.fxRng, 0, W);
    }
  }
}
