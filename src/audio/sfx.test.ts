import { describe, expect, it } from 'vitest';
import { chainNote, SOUNDS } from './sfx';

describe('chainNote', () => {
  it('starts the first link on the base note', () => {
    expect(chainNote(1)).toBe(330);
  });

  it('climbs with every link of the chain', () => {
    const notes = Array.from({ length: 15 }, (_, i) => chainNote(i + 1));
    expect(notes.every((n, i) => i === 0 || n > (notes[i - 1] ?? 0))).toBe(true);
  });

  it('reaches the next octave after one pentatonic run of five links', () => {
    expect(chainNote(6)).toBeCloseTo(660);
  });

  it('stops climbing past the top note so long chains stay listenable', () => {
    expect(chainNote(40)).toBe(chainNote(15));
  });
});

describe('SOUNDS', () => {
  it('gives every cue at least one audible voice', () => {
    for (const make of Object.values(SOUNDS)) {
      const voices = make(3);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices.every(v => v.gain > 0 && v.ms > 0)).toBe(true);
    }
  });
});
