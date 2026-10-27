import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT } from '@/data/kits';
import { launch, type Flick } from './actions';
import { advanceEffects } from './effects';
import { createGame, startRun } from './game';
import { step } from './physics';
import type { Game } from './types';

const MAX_TICKS = 60 * 60;
const STRAIGHT_UP: Flick = { x: 200, y: 620, vx: 0.4, vy: -16, rawSpeed: 16, spin: 0 };
const CURLED: Flick = { ...STRAIGHT_UP, vx: -1, spin: 0.6 };

/** Plays every striker in the hand with the given shots, headless, and returns the finished game. */
function playRound(seed: number, shots: Flick[]): Game {
  const game = createGame({ seed });
  startRun(game, DEFAULT_KIT, seed);
  for (const shot of shots) {
    if (!launch(game, shot)) break;
    for (let t = 0; t < MAX_TICKS && game.round.phase === 'roll'; t++) advanceEffects(game, step(game, null));
  }
  return game;
}

const fingerprint = (game: Game) => ({
  score: game.round.score,
  chain: game.run.maxChain,
  positions: game.round.discs.map(d => [Math.round(d.x * 100), Math.round(d.y * 100)]),
});

describe('seeded replay', () => {
  const shots = [STRAIGHT_UP, CURLED, STRAIGHT_UP];

  it('replays the same round exactly from the same seed and shots', () => {
    expect(fingerprint(playRound(2024, shots))).toEqual(fingerprint(playRound(2024, shots)));
  });

  it('deals a different rink for a different seed', () => {
    expect(fingerprint(playRound(1, []))).not.toEqual(fingerprint(playRound(2, [])));
  });

  it('finishes every shot and settles all discs', () => {
    const game = playRound(2024, shots);
    expect(game.round.phase).toBe('done');
    expect(game.round.score).toBeGreaterThan(0);
    expect(game.round.discs.every(d => d.vx === 0 && d.vy === 0)).toBe(true);
  });
});
