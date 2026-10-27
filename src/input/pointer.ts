import { W, ZONE_TOP } from '@/data/constants';
import { launch, nudge, useAbility } from '@/sim/actions';
import type { Game, Point } from '@/sim/types';
import { clampAimX, clampAimY } from './aim';
import { readFlick, type TracePoint } from './gestures';

const MAX_TRAIL = 40;
const GRAB_MARGIN = 20;
const TAP_MS = 220;
const TAP_SLOP = 14;
const SWIPE_MS = 380;
const SWIPE_MIN = 30;
/** A press held this long near the rolling striker counts as sweeping, not as the start of a tap. */
const SWEEP_HOLD_MS = 140;

/** A striker grabbed in the launch zone, with the finger's recent path. */
export interface Held extends Point {
  trail: TracePoint[];
}

/** A finger down on the rink while a shot rolls: may become a tap, swipe or sweep. */
interface Touch extends Point {
  sx: number;
  sy: number;
  t: number;
  moved: number;
}

/** What render needs to draw the aim and sweep hints. */
export interface PointerView {
  aimX: number;
  held: Held | null;
  touching: boolean;
}

export interface Pointer {
  /** Where a finger has been held long enough to sweep, or null. `now` is wall-clock ms. */
  sweepPoint: (now: number) => Point | null;
  view: () => PointerView;
}

interface PointerDeps {
  game: () => Game;
  gain: () => number;
  /** Canvas pixels per rink unit. */
  scale: () => number;
  /** Returns true when the press was used to dismiss something and must not reach the rink. */
  consumePress: () => boolean;
}

/** Wires pointer gestures on the rink: flick to aim and launch; while rolling, tap, hold or swipe. Owns all pointer state. */
export function attachPointer(canvas: HTMLCanvasElement, deps: PointerDeps): Pointer {
  let aimX = W / 2;
  let held: Held | null = null;
  let touch: Touch | null = null;
  const phase = () => deps.game().round.phase;

  const toRink = (e: PointerEvent): TracePoint => {
    const box = canvas.getBoundingClientRect(), scale = deps.scale();
    return { x: (e.clientX - box.left) / scale, y: (e.clientY - box.top) / scale, t: performance.now() };
  };

  const release = () => {
    const released = held;
    held = null;
    if (!released) return;
    const flick = readFlick(released.trail, deps.gain(), released);
    if (flick) launch(deps.game(), flick);
  };

  canvas.addEventListener('pointerdown', e => {
    if (deps.consumePress()) return;
    const p = toRink(e);
    if (phase() === 'roll') {
      canvas.setPointerCapture(e.pointerId);
      touch = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: p.t, moved: 0 };
      return;
    }
    if (phase() !== 'aim' || p.y < ZONE_TOP - GRAB_MARGIN) return;
    canvas.setPointerCapture(e.pointerId);
    held = { x: clampAimX(p.x), y: clampAimY(p.y), trail: [p] };
    aimX = held.x;
  });

  canvas.addEventListener('pointermove', e => {
    if (touch) {
      const p = toRink(e);
      touch.moved = Math.max(touch.moved, Math.hypot(p.x - touch.sx, p.y - touch.sy));
      touch.x = p.x;
      touch.y = p.y;
      return;
    }
    if (!held) return;
    for (const ev of e.getCoalescedEvents?.() ?? [e]) {
      const p = toRink(ev);
      held.trail.push(p);
      if (held.trail.length > MAX_TRAIL) held.trail.shift();
      held.x = clampAimX(p.x);
      aimX = held.x;
      if (p.y < ZONE_TOP) {
        release();
        return;
      }
      held.y = clampAimY(p.y);
    }
  });

  canvas.addEventListener('pointerup', e => {
    if (touch) {
      const ended = touch, duration = performance.now() - ended.t;
      touch = null;
      if (duration < TAP_MS && ended.moved < TAP_SLOP) useAbility(deps.game());
      else if (duration < SWIPE_MS && ended.moved > SWIPE_MIN) nudge(deps.game(), ended.x - ended.sx, ended.y - ended.sy);
      return;
    }
    if (held) {
      held.trail.push(toRink(e));
      release();
    }
  });

  canvas.addEventListener('pointercancel', () => {
    held = null;
    touch = null;
  });

  return {
    sweepPoint: now => (touch && phase() === 'roll' && now - touch.t > SWEEP_HOLD_MS ? touch : null),
    view: () => ({ aimX, held: phase() === 'aim' ? held : null, touching: !!touch && phase() === 'roll' }),
  };
}
