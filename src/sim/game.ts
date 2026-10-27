import { DEFAULT_KIT, type Kit } from '@/data/kits';
import { between, createRng } from '@/lib/rng';
import { showBanner } from './effects';
import { buildRound, startRound } from './round';
import { createRun } from './run';
import { openShop, settleRound } from './shop';
import type { Game, GameCore, GameEvent, Run, RunPhase } from './types';

interface GameOptions {
  seed: number;
  reduceMotion?: boolean;
  emit?: (event: GameEvent) => void;
}

function setRunPhase(game: Game, phase: RunPhase): void {
  game.runPhase = phase;
  game.emit({ type: 'runPhase' });
}

/** Shows the round's rink with nothing to play: the backdrop behind the kit picker. */
function idleRink(game: Game): void {
  game.round.phase = 'idle';
  game.round.fx.banner = null;
}

/** A game parked on an idle placeholder round, ready for `startRun` once a kit is picked. */
export function createGame({ seed, reduceMotion = false, emit = () => {} }: GameOptions): Game {
  const rng = createRng(seed);
  const core: GameCore = {
    seed, rng, fxRng: Math.random, reduceMotion, nextId: 0, emit, run: createRun(DEFAULT_KIT, rng), runPhase: 'kitPick', shop: null,
  };
  const game: Game = Object.assign(core, { round: buildRound(core) });
  idleRink(game);
  return game;
}

/** Throws away the current run and shows an idle placeholder rink behind the kit picker. */
export function parkForKitPick(game: Game): void {
  game.run = createRun(DEFAULT_KIT, game.rng);
  game.shop = null;
  startRound(game);
  idleRink(game);
  game.emit({ type: 'perks' });
  game.emit({ type: 'coins' });
  setRunPhase(game, 'kitPick');
}

/** Starts a fresh run. Reseeding here means the same seed and kit always deal the same run. */
export function startRun(game: Game, kit: Kit, seed: number): void {
  game.seed = seed;
  game.rng = createRng(seed);
  game.run = createRun(kit, game.rng);
  game.shop = null;
  game.emit({ type: 'perks' });
  game.emit({ type: 'coins' });
  startRound(game);
  setRunPhase(game, 'playing');
}

/** Leaves the shop for the next round. */
export function nextRound(game: Game): void {
  if (game.runPhase !== 'shop') return;
  game.shop = null;
  game.run.round++;
  startRound(game);
  setRunPhase(game, 'playing');
}

/** Weather that changes between shots. Uses gameplay randomness, so it replays with the seed. */
function weatherTick(game: Game): void {
  const { round } = game, w = round.weather;
  if (!w) return;
  if (w.id === 'snow') round.frPenalty = Math.min(0.012, round.frPenalty + 0.002);
  if (w.id === 'thaw') round.patches.forEach(p => { p.r = Math.min(110, p.r + 12); });
  if (w.id === 'blizzard') {
    const a = between(game.rng, 0, Math.PI * 2);
    w.wind = { x: Math.cos(a), y: Math.sin(a) };
  }
}

/** A cleared round pays out and opens the shop; a missed quota ends the run. */
function endRound(game: Game): void {
  const { run, round } = game;
  if (round.score < round.quota) {
    setRunPhase(game, 'over');
    return;
  }
  game.shop = openShop(game.rng, run, settleRound(run, round));
  game.emit({ type: 'coins' });
  game.emit({ type: 'buzz', pattern: [40, 60, 40] });
  setRunPhase(game, 'shop');
}

/** Called once everything stops rolling: next striker, Second Wind, or the end of the round. */
export function endShot(game: Game): void {
  const { round, run } = game;
  round.shot = null;
  weatherTick(game);
  if (round.used < round.hand.length) {
    round.phase = 'aim';
    game.emit({ type: 'hand' });
    return;
  }
  if (round.score < round.quota && run.mods.secondWind && !round.windUsed) {
    round.windUsed = true;
    round.hand.push('basic');
    round.phase = 'aim';
    game.emit({ type: 'hand' });
    showBanner(game, { text: 'Second Wind!', sub: 'One more striker', t: 1.6 });
    game.emit({ type: 'buzz', pattern: [20, 20, 20] });
    return;
  }
  round.phase = 'done';
  game.emit({ type: 'hand' });
  endRound(game);
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
