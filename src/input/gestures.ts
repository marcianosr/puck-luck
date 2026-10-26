import { MAXV } from '@/data/constants';
import { clamp } from '@/lib/math';
import type { Shot } from '@/sim/actions';
import type { Point, TracePoint } from '@/sim/types';

/** Converts px/ms into px per 60 Hz tick, the unit the physics runs in. */
const MS_PER_TICK = 16.7;
const FLICK_WINDOW_MS = 70;
const MIN_UPWARD_SPEED = 1.2;
const MIN_FLICK_SPEED = 1.5;
const CURL_WINDOW_MS = 320;
const MIN_CURL_LENGTH = 22;
const CURL_DEAD_ZONE = 0.15;

/** Index of the oldest trail point still inside the last `ms` milliseconds. */
export function windowStart(trail: readonly TracePoint[], ms: number): number {
  const last = trail[trail.length - 1];
  if (!last) return 0;
  for (let i = trail.length - 1; i >= 0; i--) {
    const p = trail[i];
    if (p && last.t - p.t > ms) return i;
  }
  return 0;
}

/** Signed bow of the final upward part of a swipe, -1..1; 0 for a straight flick. */
export function curlOf(trail: readonly TracePoint[]): number {
  if (trail.length < 4) return 0;
  const lastT = trail[trail.length - 1]?.t ?? 0;
  let start = trail.length - 1;
  while (start > 0) {
    const prev = trail[start - 1], cur = trail[start];
    if (!prev || !cur || prev.y < cur.y - 0.5 || lastT - prev.t >= CURL_WINDOW_MS) break;
    start--;
  }
  const seg = trail.slice(start);
  const a = seg[0], b = seg[seg.length - 1];
  if (seg.length < 3 || !a || !b) return 0;
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
  if (length < MIN_CURL_LENGTH) return 0;
  let deviation = 0;
  for (const p of seg) {
    const d = ((p.x - a.x) * dy - (p.y - a.y) * dx) / length;
    if (Math.abs(d) > Math.abs(deviation)) deviation = d;
  }
  const k = deviation / (length * 0.1);
  return Math.abs(k) < CURL_DEAD_ZONE ? 0 : clamp(k, -1, 1);
}

function recentVelocity(trail: readonly TracePoint[], gain: number): { vx: number; vy: number } | null {
  const last = trail[trail.length - 1], first = trail[windowStart(trail, FLICK_WINDOW_MS)];
  if (!last || !first || trail.length < 2) return null;
  const dt = Math.max(8, last.t - first.t);
  return { vx: ((last.x - first.x) / dt) * MS_PER_TICK * gain, vy: ((last.y - first.y) / dt) * MS_PER_TICK * gain };
}

/** Speed the striker would leave with if released now; 0 unless the finger is moving up. */
export function liveSpeed(trail: readonly TracePoint[], gain: number): number {
  const v = recentVelocity(trail, gain);
  if (!v || v.vy > -MIN_UPWARD_SPEED) return 0;
  return Math.min(MAXV, Math.hypot(v.vx, v.vy));
}

/** Turns a finished swipe into a shot, or null when it was too slow or not upward. */
export function readFlick(trail: readonly TracePoint[], gain: number, from: Point): Shot | null {
  const v = recentVelocity(trail, gain);
  if (!v) return null;
  const rawSpeed = Math.hypot(v.vx, v.vy);
  if (v.vy > -MIN_UPWARD_SPEED || rawSpeed < MIN_FLICK_SPEED) return null;
  const cap = rawSpeed > MAXV ? MAXV / rawSpeed : 1;
  return { x: from.x, y: from.y, vx: v.vx * cap, vy: v.vy * cap, rawSpeed, spin: curlOf(trail) };
}
