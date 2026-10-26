import { H, W, WELL_R } from '@/data/constants';
import { TARGET_COLORS, type ColorKey } from '@/data/palette';
import type { CurlStyle } from '@/data/perks';
import { clamp, speedOf } from '@/lib/math';
import { between } from '@/lib/rng';
import { progressContract } from './contracts';
import { pop, shake, showBanner, spray } from './effects';
import { spawnStriker } from './round';
import { award, currentChainValue, freeze, hit, shatterTarget, touchTarget } from './scoring';
import type { Disc, Game, Round, Striker, Zone } from './types';

const SUBSTEPS = 4;
const CURL_STRENGTH = 0.034;
const RESTITUTION = 0.9;
const SWEEP_RADIUS = 110;
const SWEEP_HOLD_MS = 140;
const SWEEP_CURL_DAMPING = 0.35;
const SLOW_MO_CHAIN = 8;
const BOMB_FUSE_TICKS = 12;

export function timeScale(round: Round): number {
  let target = 1;
  if (round.slowT > 0) target = 0.3;
  if (round.slowLock > 0) target = Math.min(target, 0.35);
  round.slowK += ((target < 1 ? 1 : 0) - round.slowK) * 0.12;
  return target;
}

export function curlFactor(d: Disc, speed: number, style: CurlStyle): number {
  if (!d.launched) return 1;
  if (style === 'late') return clamp(5 / (speed + 1.5), 0.2, 3);
  if (style === 'snake') return Math.sin(d.age * 0.13) * 1.9;
  return 1;
}

/** Advances the round by one tick. `now` is wall-clock ms, only used to tell a sweep from a tap. Returns the tick's time scale. */
export function step(game: Game, now: number): number {
  const { round } = game;
  if (round.phase === 'idle') return 1;
  if (round.freeze > 0) {
    round.freeze--;
    return 0;
  }
  const ts = timeScale(round);
  if (round.slowT > 0) round.slowT--;
  if (round.slowLock > 0) round.slowLock--;
  updateSweep(game, now, ts);

  const f = ts / SUBSTEPS;
  for (let k = 0; k < SUBSTEPS; k++) {
    for (const d of round.discs) moveDisc(game, d, f);
    collideDiscs(game);
    resolveDead(game);
  }
  const moving = settleDiscs(game, ts);
  resolveDead(game);
  for (const b of round.bumpers) b.flash = Math.max(0, b.flash - 0.05);
  lockSlowMoForLongChains(round);
  if (round.phase === 'roll' && !moving) endTurn(game);
  return ts;
}

function isSweepHeld(round: Round, now: number): boolean {
  const { active: a, touch } = round;
  if (!a || a.dead || !touch || round.sweepE <= 0) return false;
  return now - touch.t > SWEEP_HOLD_MS && Math.hypot(touch.x - a.x, touch.y - a.y) < SWEEP_RADIUS && speedOf(a) > 0.3;
}

function updateSweep(game: Game, now: number, ts: number): void {
  const { round } = game;
  round.sweeping = isSweepHeld(round, now);
  const a = round.active;
  if (!round.sweeping || !a) return;
  round.sweepE -= ts;
  if (game.fxRng() < 0.6) spray(game, a.x + between(game.fxRng, -14, 14), a.y - a.r - between(game.fxRng, 4, 20), 1, 'frost', 1.2);
}

function applyFieldForces(game: Game, d: Disc, f: number, speed: number): void {
  const { round } = game;
  if (d.kind === 'striker' && d.magnet && speed > 0.5) {
    const { pullR, pullK } = d.magnet;
    for (const t of round.discs) {
      if (t.kind !== 'target') continue;
      const dx = d.x - t.x, dy = d.y - t.y, dist = Math.hypot(dx, dy);
      if (dist < pullR && dist > d.r + t.r) {
        const a = pullK * f * (1 - dist / pullR);
        t.vx += (dx / dist) * a;
        t.vy += (dy / dist) * a;
      }
    }
  }
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

function applySpin(game: Game, d: Disc, f: number, speed: number): void {
  if (!d.spin) return;
  const { round, run } = game, mods = run.mods;
  if (speed > 0.3) {
    const curlMul = d.kind === 'striker' ? d.curlMul : 1;
    const sweepDamping = round.sweeping && d === round.active ? SWEEP_CURL_DAMPING : 1;
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
  const swept = round.sweeping && d === round.active;
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
  round.chain++;
  award(game, currentChainValue(game), b.x, b.y - 18, ['Bumper']);
  progressContract(game, 'bumper');
  progressContract(game, 'chain', round.chain, true);
}

function wallHit(game: Game, d: Disc, x: number, y: number): void {
  const { round, run } = game;
  if (run.mods.curlStyle === 'ricochet' && d.launched && d.spin) d.spin = clamp(-d.spin * 1.4, -1.5, 1.5);
  else d.spin *= 0.5;
  const speed = speedOf(d);
  if (speed > 1.5) spray(game, x, y, 4, 'frost', speed * 0.3);
  if (d.kind === 'striker' && speed > 1) d.banked = true;
  if (round.phase !== 'roll' || !run.mods.liveBoards || speed < 1) return;
  round.chain++;
  progressContract(game, 'chain', round.chain, true);
  award(game, currentChainValue(game), x === 0 ? 24 : x === W ? W - 24 : x, y === 0 ? 30 : y === H ? H - 30 : y, ['Boards']);
}

const isPhasing = (s: Disc, other: Disc): s is Striker =>
  s.kind === 'striker' && !!s.ghost && s.ghost.phasesLeft > 0 && other.kind === 'target';

const passesThrough = (s: Disc, other: Disc): boolean => s.kind === 'striker' && !!s.ghost?.through.has(other.id);

function forgetPassThrough(a: Disc, b: Disc): void {
  if (a.kind === 'striker') a.ghost?.through.delete(b.id);
  if (b.kind === 'striker') b.ghost?.through.delete(a.id);
}

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
  if (dist >= rr || dist === 0) {
    forgetPassThrough(a, b);
    return;
  }
  if (passesThrough(a, b) || passesThrough(b, a)) return;
  const ghost = isPhasing(a, b) ? a : isPhasing(b, a) ? b : null;
  if (ghost?.ghost) {
    const other = ghost === a ? b : a;
    ghost.ghost.through.add(other.id);
    ghost.ghost.phasesLeft--;
    hit(game, a, b, other.x, other.y, 4, ['Phase']);
    return;
  }
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
  for (const s of [a, b]) if (s.kind === 'striker' && s.type === 'splitter' && !s.dead) s.dead = 'split';
}

function settleDiscs(game: Game, ts: number): boolean {
  let moving = false;
  for (const d of game.round.discs) {
    const speed = speedOf(d);
    d.age += ts;
    if (d.kind === 'striker' && d.bomb?.armed && d.age > BOMB_FUSE_TICKS && speed < 0.7) explode(game, d);
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

function lockSlowMoForLongChains(round: Round): void {
  if (round.phase !== 'roll' || round.chain < SLOW_MO_CHAIN || round.slowUsed) return;
  const maxSpeed = Math.max(0, ...round.discs.map(speedOf));
  if (maxSpeed > 0.2 && maxSpeed < 2.2) {
    round.slowLock = 75;
    round.slowUsed = true;
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
    else if (d.dead === 'split' && d.kind === 'striker') spawned.push(...split(game, d));
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
  run.sunk++;
  run.coins += coins;
  round.sunkCoins += coins;
  game.emit({ type: 'coins' });
  award(game, points, p.x, p.y, [lava ? 'Melted!' : 'Sunk!', `+${coins} coin${coins > 1 ? 's' : ''}`], true);
  progressContract(game, 'sink');
  game.emit({ type: 'buzz', pattern: 30 });
}

function split(game: Game, d: Striker): Striker[] {
  const speed = Math.max(speedOf(d), 5), ang = Math.atan2(d.vy, d.vx);
  const shards = (d.up ? [-0.6, 0, 0.6] : [-0.5, 0.5]).map(da => {
    const a = ang + da, side = Math.sign(da);
    const shard = spawnStriker(game, 'shard', d.x + Math.cos(a + side * 1.2) * d.r * 0.5, d.y + Math.sin(a + side * 1.2) * d.r * 0.5, 0.72);
    shard.vx = Math.cos(a) * speed * 0.9;
    shard.vy = Math.sin(a) * speed * 0.9;
    return shard;
  });
  spray(game, d.x, d.y, 12, 'striker', 2.5);
  pop(game, d.x, d.y - 10, ['Split!']);
  return shards;
}

export function explode(game: Game, b: Striker): void {
  if (!b.bomb) return;
  const { blastR, blastK, blastPts } = b.bomb;
  b.bomb.armed = false;
  b.dead = 'boom';
  spray(game, b.x, b.y, 36, 'gold', 4.5);
  spray(game, b.x, b.y, 18, 'frost', 3);
  shake(game, 12);
  freeze(game, 5);
  game.emit({ type: 'buzz', pattern: [30, 20, 50] });
  game.round.fx.boom = { x: b.x, y: b.y, t: 0, r: blastR };
  for (const d of game.round.discs) {
    if (d === b) continue;
    const dx = d.x - b.x, dy = d.y - b.y, dist = Math.hypot(dx, dy) || 1;
    if (dist < blastR) {
      const k = blastK * (1 - dist / blastR);
      d.vx += (dx / dist) * k;
      d.vy += (dy / dist) * k;
    }
  }
  award(game, blastPts, b.x, b.y, ['Boom!'], true);
}

function weatherTick(game: Game): void {
  const { round } = game, w = round.weather;
  if (!w) return;
  if (w.id === 'snow') round.frPenalty = Math.min(0.012, round.frPenalty + 0.002);
  if (w.id === 'thaw') round.patches.forEach(p => { p.r = Math.min(110, p.r + 12); });
  if (w.id === 'blizzard') {
    const a = between(game.rng, 0, Math.PI * 2);
    w.wind = { x: Math.cos(a), y: Math.sin(a) };
  }
}

export function endTurn(game: Game): void {
  const { round, run } = game;
  run.bestShot = Math.max(run.bestShot, round.shotPts);
  round.slowLock = 0;
  round.slowT = 0;
  weatherTick(game);
  if (round.used < round.hand.length) {
    round.phase = 'aim';
    game.emit({ type: 'hand' });
    return;
  }
  if (round.score < round.quota && run.mods.secondWind && !round.windUsed) {
    round.windUsed = true;
    round.hand.push('basic');
    round.phase = 'aim';
    game.emit({ type: 'hand' });
    showBanner(game, { text: 'Second Wind!', sub: 'One more striker', t: 1.6 });
    game.emit({ type: 'buzz', pattern: [20, 20, 20] });
    return;
  }
  round.phase = 'done';
  game.emit({ type: 'hand' });
  game.emit({ type: 'shotsDone', cleared: round.score >= round.quota });
}
