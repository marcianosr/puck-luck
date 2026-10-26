const FLOAT_TOLERANCE = 1e-6;

export interface ClockAdvance {
  ticks: number;
  /** Time left over that didn't fill a whole tick; carried into the next frame. */
  carry: number;
}

/**
 * Fixed-timestep accumulator: how many sim ticks a frame owes, given the real time that passed.
 * A long stall (background tab, breakpoint) is capped at `maxTicks` and the backlog dropped,
 * so the game pauses instead of fast-forwarding.
 */
export function advanceClock(carry: number, elapsedMs: number, tickMs: number, maxTicks: number): ClockAdvance {
  const total = carry + Math.max(0, elapsedMs);
  // Float sums of frame times land a hair under whole ticks (2 × 8.333 ms < 16.667 ms); without the
  // tolerance a 120 Hz frame would sometimes owe its tick one frame late and stutter.
  const due = Math.floor(total / tickMs + FLOAT_TOLERANCE);
  if (due > maxTicks) return { ticks: maxTicks, carry: 0 };
  return { ticks: due, carry: Math.max(0, total - due * tickMs) };
}
