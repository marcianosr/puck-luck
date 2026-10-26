import { ZONE_TOP } from '@/data/constants';
import { launch, nudge, useAbility } from '@/sim/actions';
import type { Game, TracePoint } from '@/sim/types';
import { clampAimX, clampAimY } from './aim';
import { readFlick } from './gestures';

const MAX_TRAIL = 40;
const GRAB_MARGIN = 20;
const TAP_MS = 220;
const TAP_SLOP = 14;
const SWIPE_MS = 380;
const SWIPE_MIN = 30;

interface PointerDeps {
  game: () => Game;
  gain: () => number;
  /** Canvas pixels per rink unit. */
  scale: () => number;
  /** Returns true when the press was used to dismiss something and must not reach the rink. */
  consumePress: () => boolean;
}

/** Wires pointer gestures on the rink: flick to aim and launch; while rolling, tap, hold or swipe. */
export function attachPointer(canvas: HTMLCanvasElement, deps: PointerDeps): void {
  const toRink = (e: PointerEvent): TracePoint => {
    const box = canvas.getBoundingClientRect(), scale = deps.scale();
    return { x: (e.clientX - box.left) / scale, y: (e.clientY - box.top) / scale, t: performance.now() };
  };

  const release = (round: Game['round']) => {
    const held = round.held;
    round.held = null;
    if (!held) return;
    const shot = readFlick(held.trail, deps.gain(), held);
    if (shot) launch(deps.game(), shot);
  };

  canvas.addEventListener('pointerdown', e => {
    if (deps.consumePress()) return;
    const round = deps.game().round, p = toRink(e);
    if (round.phase === 'roll') {
      canvas.setPointerCapture(e.pointerId);
      round.touch = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: p.t, moved: 0 };
      return;
    }
    if (round.phase !== 'aim' || p.y < ZONE_TOP - GRAB_MARGIN) return;
    canvas.setPointerCapture(e.pointerId);
    round.held = { x: clampAimX(p.x), y: clampAimY(p.y), trail: [p] };
    round.aimX = round.held.x;
  });

  canvas.addEventListener('pointermove', e => {
    const round = deps.game().round;
    if (round.touch) {
      const p = toRink(e), touch = round.touch;
      touch.moved = Math.max(touch.moved, Math.hypot(p.x - touch.sx, p.y - touch.sy));
      touch.x = p.x;
      touch.y = p.y;
      return;
    }
    const held = round.held;
    if (!held) return;
    for (const ev of e.getCoalescedEvents?.() ?? [e]) {
      const p = toRink(ev);
      held.trail.push(p);
      if (held.trail.length > MAX_TRAIL) held.trail.shift();
      held.x = clampAimX(p.x);
      round.aimX = held.x;
      if (p.y < ZONE_TOP) {
        release(round);
        return;
      }
      held.y = clampAimY(p.y);
    }
  });

  canvas.addEventListener('pointerup', e => {
    const game = deps.game(), round = game.round;
    if (round.touch) {
      const touch = round.touch, duration = performance.now() - touch.t;
      round.touch = null;
      if (duration < TAP_MS && touch.moved < TAP_SLOP) useAbility(game);
      else if (duration < SWIPE_MS && touch.moved > SWIPE_MIN) nudge(game, touch.x - touch.sx, touch.y - touch.sy);
      return;
    }
    if (round.held) {
      round.held.trail.push(toRink(e));
      release(round);
    }
  });

  canvas.addEventListener('pointercancel', () => {
    const round = deps.game().round;
    round.held = null;
    round.touch = null;
  });
}
