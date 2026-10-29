import { H, SWEEP_RADIUS, W, WELL_R } from '@/data/constants';
import { TARGET_COLORS, type ColorKey } from '@/data/palette';
import type { CurlStyle } from '@/data/perks';
import { clamp, speedOf } from '@/lib/math';
import { between } from '@/lib/rng';
import { endShot } from './game';
import { record } from './playLog';
import { pop, spray } from './effects';
import { spawnStriker } from './round';
import { addChainLink, award, hit, shatterTarget, touchTarget } from './scoring';
import type { Disc, Game, Point, Round, Shot, Zone } from './types';

const SUBSTEPS = 4;
const CURL_STRENGTH = 0.034;
const RESTITUTION = 0.9;
const SWEEP_CURL_DAMPING = 0.35;
const SLOW_MO_CHAIN = 8;

export function timeScale(shot: Shot | null): number {
  if (!shot) return 1;
  let target = 1;
  if (shot.slowT > 0) target = 0.3;
  if (shot.slowLock > 0) target = Math.min(target, 0.35);
  return target;
}

/** Eases the slow-mo letterbox towards the current time scale; purely visual. */
function easeSlowMoBars(round: Round, ts: number): void {
  round.slowK += ((ts < 1 ? 1 : 0) - round.slowK) * 0.12;
}

export function curlFactor(d: Disc, speed: number, style: CurlStyle): number {
  if (!d.launched) return 1;
  if (style === 'late') return clamp(5 / (speed + 1.5), 0.2, 3);
  if (style === 'snake') return Math.sin(d.age * 0.13) * 1.9;
  return 1;
}

/**
 * Advances the round by one tick and returns its time scale.
 * `sweep` is where a finger is holding to sweep (input decides when a hold counts), or null.
 */
export function step(game: Game, sweep: Point | null): number {
  const { round } = game, shot = round.shot;
  if (round.phase === 'idle') return 1;
  if (round.freeze > 0) {
    round.freeze--;
    return 0;
  }
  const ts = timeScale(shot);
  easeSlowMoBars(round, ts);
  if (shot) {
    if (shot.slowT > 0) shot.slowT--;
    if (shot.slowLock > 0) shot.slowLock--;
    updateSweep(game, shot, sweep, ts);
  }

  const f = ts / SUBSTEPS;
  for (let k = 0; k < SUBSTEPS; k++) {
    for (const d of round.discs) moveDisc(game, d, f);
    collideDiscs(game);
    resolveDead(game);
  }
  const moving = settleDiscs(game, ts);
  resolveDead(game);
  for (const b of round.bumpers) b.flash = Math.max(0, b.flash - 0.05);
  if (shot) lockSlowMoForLongChains(round, shot);
  if (shot && !moving) endShot(game);
  return ts;
}

function isSweeping(shot: Shot, sweep: Point | null): boolean {
  const a = shot.striker;
  if (!sweep || a.dead || shot.sweepLeft <= 0) return false;
  return Math.hypot(sweep.x - a.x, sweep.y - a.y) < SWEEP_RADIUS && speedOf(a) > 0.3;
}

function updateSweep(game: Game, shot: Shot, sweep: Point | null, ts: number): void {
  shot.sweeping = isSweeping(shot, sweep);
  if (!shot.sweeping) return;
  const a = shot.striker;
  shot.sweepLeft -= ts;
  if (game.fxRng() < 0.6) spray(game, a.x + between(game.fxRng, -14, 14), a.y - a.r - between(game.fxRng, 4, 20), 1, 'frost', 1.2);
}

function applyFieldForces(game: Game, d: Disc, f: number, speed: number): void {
  const { round } = game;
  if (d.kind === 'striker') d.behaviour.onSubstep?.(game, d, f, speed);
  if (speed <= 0.15) return;
  const wind = round.weather?.wind;
  if (wind) {
    const damp = Math.min(1, speed / 4);
    d.vx += wind.x * 0.04 * f * damp;
    d.vy += wind.y * 0.04 * f * damp;
  }
  for (const w of round.wells) {
    const dx = w.x - d.x, dy = w.y - d.y, dist = Math.hypot(dx, dy);
    if (dist < WELL_R && dist > 4) {
      const a = 0.16 * f * (1 - dist / WELL_R) * Math.min(1, speed / 3);
      d.vx += (dx / dist) * a;
      d.vy += (dy / dist) * a;
    }
  }
}

const isSwept = (round: Round, d: Disc): boolean => !!round.shot?.sweeping && d === round.shot.striker;

function applySpin(game: Game, d: Disc, f: number, speed: number): void {
  if (!d.spin) return;
  const { round, run } = game, mods = run.mods;
  if (speed > 0.3) {
    const curlMul = d.kind === 'striker' ? d.build.curlMult : 1;
    const sweepDamping = isSwept(round, d) ? SWEEP_CURL_DAMPING : 1;
    const a = d.spin * CURL_STRENGTH * mods.curlBend * curlMul * curlFactor(d, speed, mods.curlStyle) * sweepDamping * f;
    const c = Math.cos(a), s = Math.sin(a);
    [d.vx, d.vy] = [d.vx * c - d.vy * s, d.vx * s + d.vy * c];
  }
  if (mods.curlStyle === 'boomerang' && d.launched) {
    d.spin = clamp(d.spin * Math.pow(1.004, f), -1.6, 1.6);
  } else {
    d.spin *= Math.pow(0.996, f);
    if (Math.abs(d.spin) < 0.01) d.spin = 0;
  }
}

function applyFriction(game: Game, d: Disc, f: number): void {
  const { round, run } = game, { theme } = round;
  const baseFr = Math.min(0.997, theme.friction + run.mods.frictionBonus) - round.frPenalty;
  const patchFr = theme.patch === 'SAND' ? 0.95 : 0.955;
  const inPatch = round.patches.some(s => Math.hypot(s.x - d.x, s.y - d.y) < s.r);
  const swept = isSwept(round, d);
  const fr = Math.pow(swept ? Math.max(baseFr, 0.997) : inPatch ? patchFr : baseFr, f);
  d.vx *= fr;
  d.vy *= fr;
  if (swept) return;
  const s2 = speedOf(d);
  if (s2 > 0) {
    const kk = Math.max(0, s2 - 0.012 * f) / s2;
    d.vx *= kk;
    d.vy *= kk;
  }
}

function moveDisc(game: Game, d: Disc, f: number): void {
  const speed = speedOf(d);
  applyFieldForces(game, d, f, speed);
  applySpin(game, d, f, speed);
  d.x += d.vx * f;
  d.y += d.vy * f;
  applyFriction(game, d, f);
  bounceOffWalls(game, d);
  for (const b of game.round.bumpers) bounceOffBumper(game, d, b);
  for (const p of game.round.pockets) {
    if (!d.dead && Math.hypot(d.x - p.x, d.y - p.y) < p.r - 3) {
      d.dead = 'sunk';
      d.pocket = p;
    }
  }
}

function bounceOffWalls(game: Game, d: Disc): void {
  const r = d.r, wr = game.round.theme.wallBounce;
  if (d.x < r) { d.x = r; d.vx = Math.abs(d.vx) * wr; wallHit(game, d, 0, d.y); }
  if (d.x > W - r) { d.x = W - r; d.vx = -Math.abs(d.vx) * wr; wallHit(game, d, W, d.y); }
  if (d.y < r) { d.y = r; d.vy = Math.abs(d.vy) * wr; wallHit(game, d, d.x, 0); }
  if (d.y > H - r) { d.y = H - r; d.vy = -Math.abs(d.vy) * wr; wallHit(game, d, d.x, H); }
}

function bounceOffBumper(game: Game, d: Disc, b: Zone): void {
  const { round } = game;
  let nx = d.x - b.x, ny = d.y - b.y;
  const dist = Math.hypot(nx, ny), rr = d.r + b.r;
  if (dist >= rr || dist === 0) return;
  nx /= dist;
  ny /= dist;
  d.x = b.x + nx * rr;
  d.y = b.y + ny * rr;
  const vn = d.vx * nx + d.vy * ny;
  if (vn >= 0) return;
  d.vx -= 2 * vn * nx;
  d.vy -= 2 * vn * ny;
  const s2 = speedOf(d) || 1, want = Math.min(18, Math.max(s2 * 1.15, 4));
  d.vx *= want / s2;
  d.vy *= want / s2;
  b.flash = 1;
  if (d.kind === 'striker') d.banked = true;
  spray(game, d.x - nx * d.r, d.y - ny * d.r, 6, 'gold', 2);
  if (round.phase !== 'roll') return;
  addChainLink(game, b.x, b.y - 18, points => ({ points, tags: ['Bumper'] }));
  record(game, { type: 'bumper' });
}

function wallHit(game: Game, d: Disc, x: number, y: number): void {
  const { round, run } = game;
  if (run.mods.curlStyle === 'ricochet' && d.launched && d.spin) d.spin = clamp(-d.spin * 1.4, -1.5, 1.5);
  else d.spin *= 0.5;
  const speed = speedOf(d);
  if (speed > 1.5) spray(game, x, y, 4, 'frost', speed * 0.3);
  if (d.kind === 'striker' && speed > 1) d.banked = true;
  if (round.phase !== 'roll' || !run.mods.liveBoards || speed < 1) return;
  addChainLink(game, x === 0 ? 24 : x === W ? W - 24 : x, y === 0 ? 30 : y === H ? H - 30 : y, points => ({ points, tags: ['Boards'] }));
}

const passesThrough = (game: Game, s: Disc, other: Disc, overlapping: boolean): boolean =>
  s.kind === 'striker' && !!s.behaviour.passesThrough?.(game, s, other, overlapping);

function collideDiscs(game: Game): void {
  const discs = game.round.discs;
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i], b = discs[j];
      if (a && b && !a.dead && !b.dead) collidePair(game, a, b);
    }
  }
}

function collidePair(game: Game, a: Disc, b: Disc): void {
  let nx = b.x - a.x, ny = b.y - a.y;
  const dist = Math.hypot(nx, ny), rr = a.r + b.r;
  const overlapping = dist < rr && dist !== 0;
  if (passesThrough(game, a, b, overlapping) || passesThrough(game, b, a, overlapping) || !overlapping) return;
  nx /= dist;
  ny /= dist;
  const ia = 1 / a.m, ib = 1 / b.m, overlap = (rr - dist) / (ia + ib);
  a.x -= nx * overlap * ia;
  a.y -= ny * overlap * ia;
  b.x += nx * overlap * ib;
  b.y += ny * overlap * ib;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return;
  const impulse = (-(1 + RESTITUTION) * rel) / (ia + ib);
  a.vx -= nx * impulse * ia;
  a.vy -= ny * impulse * ia;
  b.vx += nx * impulse * ib;
  b.vy += ny * impulse * ib;
  hit(game, a, b, a.x + nx * a.r, a.y + ny * a.r, -rel);
  a.spin *= 0.3;
  b.spin *= 0.3;
  for (const s of [a, b]) if (s.kind === 'striker') s.behaviour.onBounce?.(s);
}

function settleDiscs(game: Game, ts: number): boolean {
  let moving = false;
  for (const d of game.round.discs) {
    const speed = speedOf(d);
    d.age += ts;
    if (d.kind === 'striker') d.behaviour.onTick?.(game, d, speed);
    if (speed < 0.04) {
      d.vx = d.vy = 0;
      d.spin = 0;
    } else moving = true;
    d.rot += (d.spin * 0.35 + (d.kind === 'striker' ? speed * 0.02 : 0)) * ts;
    if (speed > 3) {
      d.trail.push({ x: d.x, y: d.y });
      if (d.trail.length > 9) d.trail.shift();
    } else if (d.trail.length) d.trail.shift();
  }
  return moving;
}

function lockSlowMoForLongChains(round: Round, shot: Shot): void {
  if (shot.chain < SLOW_MO_CHAIN || shot.slowUsed) return;
  const maxSpeed = Math.max(0, ...round.discs.map(speedOf));
  if (maxSpeed > 0.2 && maxSpeed < 2.2) {
    shot.slowLock = 75;
    shot.slowUsed = true;
  }
}

const sinkColor = (d: Disc, lava: boolean): ColorKey =>
  lava ? 'lava' : d.kind === 'striker' ? 'striker' : d.gold ? 'gold' : TARGET_COLORS[d.color];

export function resolveDead(game: Game): void {
  const { round } = game;
  if (!round.discs.some(d => d.dead)) return;
  const spawned: Disc[] = [];
  for (const d of round.discs) {
    if (d.dead === 'sunk' && d.pocket) sink(game, d, d.pocket);
    else if (d.dead === 'split' && d.kind === 'striker') spawned.push(...(d.behaviour.burst?.(game, d, (x, y, scale) => spawnStriker(game, 'shard', x, y, scale)) ?? []));
    else if (d.dead === 'shatter' && d.kind === 'target') shatterTarget(game, d);
  }
  round.discs = round.discs.filter(d => !d.dead).concat(spawned);
}

function sink(game: Game, d: Disc, p: Zone): void {
  const { round, run } = game, lava = round.theme.pocketStyle === 'lava';
  spray(game, p.x, p.y, 14, sinkColor(d, lava), 2.2);
  if (d.kind !== 'target') {
    pop(game, p.x, p.y, [lava ? 'Burned' : 'Scratch']);
    return;
  }
  touchTarget(game, d);
  const points = lava ? Math.round(run.mods.sinkPoints * 1.5) : run.mods.sinkPoints;
  const coins = run.mods.sinkCoins;
  run.coins += coins;
  round.sunkCoins += coins;
  game.emit({ type: 'coins' });
  award(game, points, p.x, p.y, [lava ? 'Melted!' : 'Sunk!', `+${coins} coin${coins > 1 ? 's' : ''}`], true);
  record(game, { type: 'sink' });
  game.emit({ type: 'feel', cue: 'sink' });
}
