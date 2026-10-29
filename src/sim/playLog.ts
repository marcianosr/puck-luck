import { progressBounties } from './bounties';
import type { Game, Run } from './types';

/** Something that happened during play. Bounties and run stats both read from this one log. */
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
      return;
    case 'curl':
      run.curls++;
      return;
    case 'bank':
      run.banks++;
      return;
    case 'perfect':
      run.perfects++;
      return;
    case 'shatter':
      run.shatters++;
  }
}

export function record(game: Game, play: Play): void {
  updateRunStats(game.run, play);
  progressBounties(game, play);
}
