import { BEST_STATS, CHECKLIST, SHORT_GOAL, type Reward, type Tile } from '@/data/checklist';
import { KITS } from '@/data/kits';
import { perkById } from '@/data/perks';
import { STRIKERS } from '@/data/strikers';
import { formatNumber } from '@/lib/math';
import { goalOf, isRevealed } from '@/meta/checklist';
import type { Profile } from '@/meta/profile';
import type { Progress } from '@/meta/progress';
import { $, closest } from './dom';

/** The reward's own name, short enough for a grid tile. */
function rewardTitle(reward: Reward): string {
  if (reward.kind === 'kit') return KITS.find(k => k.id === reward.id)?.name ?? reward.id;
  if (reward.kind === 'striker') return STRIKERS[reward.id].name;
  return perkById(reward.id).name;
}

export const rewardName = (reward: Reward): string => `${rewardTitle(reward)} ${reward.kind}`;

const rewardLine = (tile: Tile) => (tile.reward ? `Unlocks the ${rewardName(tile.reward)}` : 'Trophy');

function progressLine(tile: Tile, profile: Profile): string {
  const { stat, atLeast } = tile.need, have = Math.min(profile.stats[stat], atLeast);
  return `${BEST_STATS.has(stat) ? 'Best' : 'So far'}: ${formatNumber(have)} / ${formatNumber(atLeast)}`;
}

function tileHtml(tile: Tile, row: number, col: number, cleared: ReadonlySet<string>): string {
  const done = cleared.has(tile.id), seen = isRevealed(row, col, cleared);
  const state = done ? 'done' : seen ? 'open' : 'hidden';
  const label = done ? (tile.reward ? rewardTitle(tile.reward) : '★') : seen ? SHORT_GOAL[tile.need.stat](tile.need.atLeast) : '?';
  return `<button class="tile ${state}${tile.reward ? '' : ' trophy'}" data-r="${row}" data-c="${col}" aria-label="${seen ? goalOf(tile) : 'Hidden goal'}">${label}</button>`;
}

/** The Checklist screen: a grid of goals that reveal their neighbours when cleared. */
export function setupChecklist(progress: Progress): { show: () => void } {
  const detail = $('checkDetail');

  const describe = (row: number, col: number) => {
    const tile = CHECKLIST[row]?.[col];
    if (!tile) return;
    const profile = progress.profile(), cleared = new Set(profile.cleared);
    if (!isRevealed(row, col, cleared)) {
      detail.innerHTML = '<strong>Hidden goal</strong><span>Clear a tile next to it to reveal it.</span>';
      return;
    }
    const status = cleared.has(tile.id) ? 'Cleared' : progressLine(tile, profile);
    detail.innerHTML = `<strong>${goalOf(tile)}</strong><span>${rewardLine(tile)}</span><span>${status}</span>`;
  };

  $('checkGrid').addEventListener('click', e => {
    const tile = closest(e.target, '.tile', HTMLButtonElement);
    if (tile) describe(Number(tile.dataset.r), Number(tile.dataset.c));
  });
  $('checkClose').addEventListener('click', () => ($('checkOver').hidden = true));

  return {
    show() {
      const cleared = new Set(progress.profile().cleared);
      $('checkGrid').innerHTML = CHECKLIST.map((tiles, row) => tiles.map((t, col) => tileHtml(t, row, col, cleared)).join('')).join('');
      $('checkCount').textContent = `${cleared.size} / ${CHECKLIST.flat().length} cleared`;
      detail.innerHTML = '<span>Tap a tile to see its goal.</span>';
      $('checkOver').hidden = false;
    },
  };
}
