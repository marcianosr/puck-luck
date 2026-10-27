import { progressContracts } from './contracts';
import type { Game, Run } from './types';

/** Something that happened during play. Contracts and run stats both read from this one log. */
export type Play =
  | { type: 'link'; chain: number }
  | { type: 'shotPoints'; points: number }
  | { type: 'clash' | 'bank' | 'curl' | 'bumper' | 'sink' | 'shatter' | 'perfect' | 'fullClear' };

function updateRunStats(run: Run, play: Play): void {
  switch (play.type) {
    case 'link':
      run.maxChain = Math.max(run.maxChain, play.chain);
      return;
    case 'shotPoints':
      run.bestShot = Math.max(run.bestShot, play.points);
      return;
    case 'clash':
      run.clashes++;
      return;
    case 'sink':
      run.sunk++;
  }
}

export function record(game: Game, play: Play): void {
  updateRunStats(game.run, play);
  progressContracts(game, play);
}
