import { describe, expect, it } from 'vitest';
import { MAXV } from '@/data/constants';
import type { TracePoint } from '@/sim/types';
import { curlOf, liveSpeed, readFlick } from './gestures';

/** A swipe from (x, y) moving dx, dy per 10 ms step; `bow(i)` adds a sideways offset per point. */
const swipe = (steps: number, dx: number, dy: number, bow: (i: number) => number = () => 0): TracePoint[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({ x: 200 + i * dx + bow(i), y: 640 + i * dy, t: i * 10 }));

describe('curlOf', () => {
  it('reads a straight flick as no curl', () => {
    expect(curlOf(swipe(8, 0, -12))).toBe(0);
  });

  it('reads a swipe bowing right as positive curl, and left as negative', () => {
    const arc = (i: number) => Math.sin((i / 8) * Math.PI) * 12;
    const right = curlOf(swipe(8, 0, -12, i => -arc(i)));
    const left = curlOf(swipe(8, 0, -12, arc));
    expect(right).toBeGreaterThan(0);
    expect(left).toBeLessThan(0);
  });

  it('ignores swipes too short to bend', () => {
    expect(curlOf(swipe(3, 0, -5, i => i * 3))).toBe(0);
  });
});

describe('readFlick', () => {
  it('turns an upward swipe into a shot from the release point', () => {
    const shot = readFlick(swipe(6, 0, -6), 1, { x: 200, y: 620 });
    expect(shot).toMatchObject({ x: 200, y: 620, vx: 0, spin: 0 });
    expect(shot?.vy).toBeLessThan(0);
  });

  it('rejects downward or sideways swipes', () => {
    expect(readFlick(swipe(6, 0, 6), 1, { x: 0, y: 0 })).toBeNull();
    expect(readFlick(swipe(6, 10, 0), 1, { x: 0, y: 0 })).toBeNull();
  });

  it('caps the launch speed but remembers how hard the flick was', () => {
    const shot = readFlick(swipe(6, 0, -60), 2, { x: 0, y: 0 });
    expect(shot && Math.hypot(shot.vx, shot.vy)).toBeCloseTo(MAXV);
    expect(shot?.rawSpeed).toBeGreaterThan(MAXV);
  });
});

describe('liveSpeed', () => {
  it('scales with the power setting and is zero while pulling back', () => {
    expect(liveSpeed(swipe(6, 0, -3), 2)).toBeCloseTo(liveSpeed(swipe(6, 0, -3), 1) * 2);
    expect(liveSpeed(swipe(6, 0, 3), 1)).toBe(0);
  });
});
