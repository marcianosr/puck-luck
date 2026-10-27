import { HAND } from '@/data/constants';
import { KITS, type Kit } from '@/data/kits';
import { baseOf, isUpgraded } from '@/data/strikers';
import { formatNumber } from '@/lib/math';
import { load, save } from '@/lib/storage';
import { isNewBest, type BestRun } from '@/sim/game';
import type { Game } from '@/sim/types';
import { $, $button, closest } from './dom';

const BEST_KEY = 'chainSmashDeckBest';

const isBestRun = (v: unknown): v is BestRun =>
  typeof v === 'object' && v !== null && 'round' in v && 'total' in v && 'kit' in v &&
  typeof v.round === 'number' && typeof v.total === 'number' && typeof v.kit === 'string';

export function hideOverlays(): void {
  $('shopOver').hidden = true;
  $('over').hidden = true;
}

export function setupKitPicker(onPick: (kit: Kit) => void): { show: () => void } {
  $('kitList').addEventListener('click', e => {
    const kit = KITS[Number(closest(e.target, '.offer', HTMLButtonElement)?.dataset.i)];
    if (!kit) return;
    $('kitOver').hidden = true;
    onPick(kit);
  });
  return {
    show() {
      $('kitList').innerHTML = KITS.map((k, i) => {
        const dots = k.deck.map(c => `<span class="sd${isUpgraded(c) ? ' up' : ''}" data-t="${baseOf(c)}"></span>`).join('');
        return `<button class="offer kit" data-i="${i}"><strong>${k.name} <span class="dots">${dots}</span></strong><span class="desc">${k.desc}</span><span class="tag">Deck of ${k.deck.length} · you draw ${HAND} at random each round</span></button>`;
      }).join('');
      hideOverlays();
      $('kitOver').hidden = false;
      $('kitList').querySelector('button')?.focus();
    },
  };
}

export function showRunOver({ run, round }: Game): void {
  let best = load<BestRun | null>(BEST_KEY, (v): v is BestRun | null => v === null || isBestRun(v), null);
  if (isNewBest(best, run)) {
    best = { round: run.round, total: run.total, kit: run.kit.name };
    save(BEST_KEY, best);
  }
  $('overSub').textContent = `${round.theme.name}, round ${run.round}: ${formatNumber(round.score)} of ${formatNumber(round.quota)}.`;
  $('finalScore').textContent = formatNumber(run.total);
  $('stKit').textContent = run.kit.name;
  $('stRounds').textContent = String(run.round - 1);
  $('stContracts').textContent = String(run.contractsDone);
  $('stChain').textContent = String(run.maxChain);
  $('stClash').textContent = String(run.clashes);
  $('stShot').textContent = formatNumber(run.bestShot);
  $('stBest').textContent = best ? `Round ${best.round} · ${formatNumber(best.total)}` : '—';
  $('over').hidden = false;
  $button('again').focus();
}
