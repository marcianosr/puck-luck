import { DEFAULT_KIT, type Kit } from '@/data/kits';
import { createRng } from '@/lib/rng';
import { buildRound, startRound } from './round';
import { createRun } from './run';
import type { Game, GameCore, GameEvent, Run } from './types';

interface GameOptions {
  seed: number;
  reduceMotion?: boolean;
  emit?: (event: GameEvent) => void;
}

/** A game parked on an idle placeholder round, ready for `startRun` once a kit is picked. */
export function createGame({ seed, reduceMotion = false, emit = () => {} }: GameOptions): Game {
  const rng = createRng(seed);
  const core: GameCore = { seed, rng, fxRng: Math.random, reduceMotion, nextId: 0, emit, run: createRun(DEFAULT_KIT, rng) };
  const game: Game = Object.assign(core, { round: buildRound(core) });
  game.round.phase = 'idle';
  game.round.fx.banner = null;
  return game;
}

/** Throws away the current run and shows an idle placeholder rink behind the kit picker. */
export function parkForKitPick(game: Game): void {
  game.run = createRun(DEFAULT_KIT, game.rng);
  startRound(game);
  game.round.phase = 'idle';
  game.round.fx.banner = null;
  game.emit({ type: 'perks' });
  game.emit({ type: 'coins' });
}

/** Starts a fresh run. Reseeding here means the same seed and kit always deal the same run. */
export function startRun(game: Game, kit: Kit, seed: number): void {
  game.seed = seed;
  game.rng = createRng(seed);
  game.run = createRun(kit, game.rng);
  game.emit({ type: 'perks' });
  game.emit({ type: 'coins' });
  startRound(game);
}

export function nextRound(game: Game): void {
  game.run.round++;
  startRound(game);
}

export interface BestRun {
  round: number;
  total: number;
  kit: string;
}

/** Rounds cleared ranks first, total score breaks ties. */
export function isNewBest(best: BestRun | null, run: Run): boolean {
  if (!best) return true;
  const cleared = run.round - 1, bestCleared = best.round - 1;
  return cleared > bestCleared || (cleared === bestCleared && run.total > best.total);
}
