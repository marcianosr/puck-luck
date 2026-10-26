import { describe, expect, it } from 'vitest';
import { createRng, pick, shuffle } from './rng';

const take = (rng: () => number, n: number) => Array.from({ length: n }, rng);

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(createRng(42), 5)).toEqual(take(createRng(42), 5));
  });

  it('produces a different sequence for a different seed', () => {
    expect(take(createRng(42), 5)).not.toEqual(take(createRng(43), 5));
  });

  it('stays within [0, 1)', () => {
    const values = take(createRng(7), 1000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });
});

describe('shuffle', () => {
  it('returns a permutation and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(createRng(1), input);
    expect(out).toHaveLength(6);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('pick', () => {
  it('throws on an empty list instead of returning undefined', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
});
