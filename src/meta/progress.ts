import type { Tile } from '@/data/checklist';
import type { Run } from '@/sim/types';
import { applyRun, unlocksFor, type Unlocks } from './checklist';
import { loadProfile, saveProfile, summarizeRun, type Profile } from './profile';

export interface Progress {
  profile: () => Profile;
  unlocks: () => Unlocks;
  /** Folds a finished or abandoned run into the saved profile and returns the tiles it cleared. */
  finishRun: (run: Run, roundsCleared: number) => Tile[];
}

export function createProgress(): Progress {
  let profile = loadProfile();
  return {
    profile: () => profile,
    unlocks: () => unlocksFor(profile),
    finishRun(run, roundsCleared) {
      const result = applyRun(profile, summarizeRun(run, roundsCleared));
      profile = result.profile;
      saveProfile(profile);
      return result.cleared;
    },
  };
}
