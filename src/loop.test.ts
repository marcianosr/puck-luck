import { describe, expect, it } from 'vitest';
import { advanceClock } from './loop';

const TICK = 1000 / 60;

describe('advanceClock', () => {
  it('runs one tick per 60 Hz frame', () => {
    expect(advanceClock(0, TICK, TICK, 5).ticks).toBe(1);
  });

  it('runs exactly 60 ticks per second on a 120 Hz screen, so game speed matches 60 Hz', () => {
    let carry = 0, ticks = 0;
    for (let frame = 0; frame < 120; frame++) {
      const next = advanceClock(carry, 1000 / 120, TICK, 5);
      carry = next.carry;
      ticks += next.ticks;
    }
    expect(ticks).toBe(60);
  });

  it('carries the remainder of a partial tick into the next frame', () => {
    const first = advanceClock(0, TICK * 1.5, TICK, 5);
    expect(first.ticks).toBe(1);
    expect(advanceClock(first.carry, TICK * 0.5, TICK, 5).ticks).toBe(1);
  });

  it('caps a long stall and drops the backlog instead of fast-forwarding', () => {
    expect(advanceClock(0, 10_000, TICK, 5)).toEqual({ ticks: 5, carry: 0 });
  });

  it('treats a clock going backwards as no time passed', () => {
    expect(advanceClock(0, -50, TICK, 5).ticks).toBe(0);
  });
});
