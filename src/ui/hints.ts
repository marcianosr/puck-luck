import { load, save } from '@/lib/storage';
import type { Game, RoundPhase, RunPhase } from '@/sim/types';
import { $ } from './dom';

export type HintId = 'aim' | 'sweep' | 'curl' | 'bounty';

interface Hint {
  text: string;
  /** Where on the rink it shows: near the launch zone, or under the HUD. */
  at: 'bottom' | 'top';
  /** Hides after this long instead of when the situation changes. */
  ms?: number;
}

const HINTS: Record<HintId, Hint> = {
  aim: { text: 'Grab the striker and flick it up to shoot.', at: 'bottom' },
  sweep: { text: 'Hold your finger near it to sweep. Tap once to use its ability.', at: 'bottom' },
  curl: { text: 'Swipe in a curve to curl it. Release in the gold band for a Perfect bonus.', at: 'bottom' },
  bounty: { text: 'Bounty done! Bounties are optional goals that pay coins. Find them under Run.', at: 'top', ms: 4500 },
};

const SEEN_KEY = 'chainSmashHints';

export interface CoachState {
  runPhase: RunPhase;
  roundPhase: RoundPhase;
  bountyDone: boolean;
}

/** The first-time hint that fits this moment, or null. Each hint is taught once, in order. */
export function hintFor({ runPhase, roundPhase, bountyDone }: CoachState, seen: ReadonlySet<HintId>): HintId | null {
  if (runPhase !== 'playing') return null;
  if (bountyDone && !seen.has('bounty')) return 'bounty';
  if (roundPhase === 'aim') {
    if (!seen.has('aim')) return 'aim';
    if (seen.has('sweep') && !seen.has('curl')) return 'curl';
  }
  if (roundPhase === 'roll' && !seen.has('sweep')) return 'sweep';
  return null;
}

/** Whether the hint on screen still matches the moment, as if it had not been seen yet. */
function fitsStill(state: CoachState, seen: ReadonlySet<HintId>, current: HintId): boolean {
  const before = new Set(seen);
  before.delete(current);
  return hintFor(state, before) === current;
}

const isHintList = (v: unknown): v is HintId[] =>
  Array.isArray(v) && v.every(id => typeof id === 'string' && id in HINTS);

/** Shows each first-time hint once and remembers which ones the player has seen. */
export function createCoach(): { update: (game: Game) => void } {
  const seen = new Set<HintId>(load(SEEN_KEY, isHintList, []));
  const el = $('hint');
  let current: HintId | null = null;
  let timer = 0;

  const hide = () => {
    current = null;
    el.hidden = true;
  };

  const show = (id: HintId) => {
    const hint = HINTS[id];
    current = id;
    seen.add(id);
    save(SEEN_KEY, [...seen]);
    el.textContent = hint.text;
    el.dataset.at = hint.at;
    el.hidden = false;
    clearTimeout(timer);
    if (hint.ms) timer = window.setTimeout(hide, hint.ms);
  };

  return {
    update({ runPhase, round }) {
      const state: CoachState = { runPhase, roundPhase: round.phase, bountyDone: round.bounties.some(b => b.done) };
      if (current && fitsStill(state, seen, current)) return;
      const next = hintFor(state, seen);
      if (next) show(next);
      else if (current && !HINTS[current].ms) hide();
    },
  };
}
