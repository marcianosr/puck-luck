import type { Tile } from '@/data/checklist';
import { KITS, type Kit } from '@/data/kits';
import { baseOf, isUpgraded } from '@/data/strikers';
import { formatNumber } from '@/lib/math';
import { load, save } from '@/lib/storage';
import { goalOf, isRevealed, tileFor } from '@/meta/checklist';
import type { Progress } from '@/meta/progress';
import { isNewBest, type BestRun } from '@/sim/game';
import type { Game } from '@/sim/types';
import { $, $button, closest } from './dom';
import { rewardName } from './checklist';
import { coinHtml } from './hud';

const BEST_KEY = 'chainSmashDeckBest';

const isBestRun = (v: unknown): v is BestRun =>
  typeof v === 'object' && v !== null && 'round' in v && 'total' in v && 'kit' in v &&
  typeof v.round === 'number' && typeof v.total === 'number' && typeof v.kit === 'string';

export function hideOverlays(): void {
  $('shopOver').hidden = true;
  $('over').hidden = true;
}

/** Why a kit is locked: its Checklist goal once that tile is revealed, otherwise a pointer to the Checklist. */
function lockedLine(kit: Kit, cleared: ReadonlySet<string>): string {
  const spot = tileFor({ kind: 'kit', id: kit.id });
  if (!spot) return 'Locked';
  return isRevealed(spot.row, spot.col, cleared) ? `Locked · ${goalOf(spot.tile)}` : 'Locked · find it on the Checklist';
}

function kitHtml(kit: Kit, i: number, unlocked: boolean, cleared: ReadonlySet<string>): string {
  const dots = kit.deck.map(c => `<span class="sd${isUpgraded(c) ? ' up' : ''}" data-t="${baseOf(c)}"></span>`).join('');
  if (!unlocked) {
    return `<button class="offer kit locked" data-i="${i}" disabled><strong>${kit.name} <span class="dots">${dots}</span></strong><span class="desc">${lockedLine(kit, cleared)}</span></button>`;
  }
  return `<button class="offer kit" data-i="${i}"><strong>${kit.name} <span class="dots">${dots}</span></strong><span class="desc">${kit.desc}</span><span class="price" aria-label="${kit.coins} starting coins">${coinHtml}${kit.coins}</span></button>`;
}

export function setupKitPicker(onPick: (kit: Kit) => void, progress: Progress, openChecklist: () => void): { show: () => void } {
  $('kitChecklist').addEventListener('click', openChecklist);
  $('kitList').addEventListener('click', e => {
    const kit = KITS[Number(closest(e.target, '.offer', HTMLButtonElement)?.dataset.i)];
    if (!kit || !progress.unlocks().kits.has(kit.id)) return;
    $('kitOver').hidden = true;
    onPick(kit);
  });
  return {
    show() {
      const { kits } = progress.unlocks(), cleared = new Set(progress.profile().cleared);
      $('kitList').innerHTML = KITS.map((k, i) => kitHtml(k, i, kits.has(k.id), cleared)).join('');
      hideOverlays();
      $('kitOver').hidden = false;
      // Without preventScroll, focusing the first kit scrolls the card and hides its title.
      $('kitList').querySelector('button')?.focus({ preventScroll: true });
    },
  };
}

function renderUnlocks(cleared: readonly Tile[]): void {
  const list = $('overUnlocks');
  list.hidden = cleared.length === 0;
  list.innerHTML = `<h3>Checklist</h3>${cleared.map(t => `<span class="unlock"><b>${goalOf(t)}</b>${t.reward ? ` → ${rewardName(t.reward)}` : ' → Trophy'}</span>`).join('')}`;
}

export function showRunOver({ run, round }: Game, cleared: readonly Tile[]): void {
  renderUnlocks(cleared);
  let best = load<BestRun | null>(BEST_KEY, (v): v is BestRun | null => v === null || isBestRun(v), null);
  if (isNewBest(best, run)) {
    best = { round: run.round, total: run.total, kit: run.kit.name };
    save(BEST_KEY, best);
  }
  $('overSub').textContent = `${round.theme.name}, round ${run.round}: ${formatNumber(round.score)} of ${formatNumber(round.quota)}.`;
  $('finalScore').textContent = formatNumber(run.total);
  $('stKit').textContent = run.kit.name;
  $('stRounds').textContent = String(run.round - 1);
  $('stBounties').textContent = String(run.bountiesDone);
  $('stChain').textContent = String(run.maxChain);
  $('stClash').textContent = String(run.clashes);
  $('stShot').textContent = formatNumber(run.bestShot);
  $('stBest').textContent = best ? `Round ${best.round} · ${formatNumber(best.total)}` : '—';
  $('over').hidden = false;
  $button('again').focus();
}
