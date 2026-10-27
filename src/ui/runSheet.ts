import type { Game } from '@/sim/types';
import { $ } from './dom';

/**
 * Whether the Run button shows its "something new" dot.
 * `doneCount`: bounties completed this round. `seenCount`: how many were done when the sheet was last opened.
 */
export function shouldShowBadge(doneCount: number, seenCount: number): boolean {
  return doneCount > seenCount;
}

const doneBounties = ({ round }: Game) => round.bounties.filter(c => c.done).length;

export interface RunSheet {
  refreshBadge: () => void;
  resetForRound: () => void;
}

export function setupRunSheet(game: () => Game): RunSheet {
  const overlay = $('runOver'), badge = $('runBadge');
  let seenCount = 0;

  const refreshBadge = () => {
    badge.hidden = !shouldShowBadge(doneBounties(game()), seenCount);
  };
  const open = () => {
    seenCount = doneBounties(game());
    refreshBadge();
    overlay.hidden = false;
  };
  const close = () => (overlay.hidden = true);

  $('runBtn').addEventListener('click', open);
  $('runClose').addEventListener('click', close);
  overlay.addEventListener('click', e => e.target === overlay && close());

  return {
    refreshBadge,
    resetForRound() {
      seenCount = 0;
      refreshBadge();
    },
  };
}
