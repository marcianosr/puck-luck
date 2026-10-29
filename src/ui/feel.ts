import type { Sfx } from '@/audio/sfx';
import type { FeelCue, GameEvent } from '@/sim/types';

type FeelEvent = Extract<GameEvent, { type: 'feel' }>;

/** Vibration per moment, in ms (arrays alternate buzz and pause). Bigger moments get longer patterns. */
const HAPTICS: Record<FeelCue, number | number[]> = {
  launch: 6,
  perfect: [10, 20, 10],
  nudge: 12,
  ability: [15, 15],
  hit: 8,
  clash: [25, 30, 45],
  shatter: 25,
  sink: 30,
  boom: [30, 20, 50],
  quota: [30, 40, 30],
  fullClear: [40, 40, 80],
  bounty: [20, 30, 20],
  secondWind: [20, 20, 20],
  roundCleared: [40, 60, 40],
  buy: 15,
  upgrade: [15, 20, 15],
};

/** Turns the sim's feel cues into a sound and a vibration. */
export function createFeel(buzz: (pattern: number | number[]) => void, sfx: Sfx): (event: FeelEvent) => void {
  return event => {
    buzz(HAPTICS[event.cue]);
    sfx.play(event.cue, 'chain' in event ? event.chain : 0);
  };
}
