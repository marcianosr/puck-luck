import { REMOVE_COST, UPGRADE_COST } from '@/data/constants';
import { PERKS, perkById } from '@/data/perks';
import { baseOf, isCard, isUpgraded, STRIKERS, strikerName, type Card } from '@/data/strikers';
import { formatNumber } from '@/lib/math';
import { quotaFor, themeFor, handSize } from '@/sim/run';
import {
  buyPerk, buyStriker, canRemoveAny, canUpgradeAny, openShop, perkPrice, removeCard, reroll, settleRound, strikerPrice, upgradeCard,
  type Shop,
} from '@/sim/shop';
import type { Game } from '@/sim/types';
import { $, $button, closest } from './dom';
import { coinHtml } from './hud';

interface ShopDeps {
  game: () => Game;
  buzz: (pattern: number | number[]) => void;
  onChange: () => void;
  onNextRound: () => void;
}

function deckTitle(game: Game, shop: Shop): string {
  if (shop.mode === 'remove') return 'Tap a striker to remove it';
  if (shop.mode === 'upgrade') return 'Tap a striker to upgrade it';
  return `Your deck · ${game.run.deck.length} strikers, draw ${handSize(game.run)}`;
}

function renderOffers(game: Game, shop: Shop): void {
  const { run } = game;
  $('offStrikers').innerHTML = shop.strikers.map((o, i) => {
    const s = STRIKERS[o.id], price = strikerPrice(o.id);
    return `<button class="offer ${s.rarity}${o.sold ? ' sold' : ''}" data-kind="striker" data-i="${i}" ${o.sold || run.coins < price ? 'disabled' : ''}>
      <strong><span class="sd" data-t="${o.id}"></span>${s.name}</strong>
      <span class="tag">${s.rarity} striker · upgrades to ${s.up}</span><span class="desc">${s.desc}</span>
      <span class="price">${o.sold ? 'Added' : coinHtml + price}</span></button>`;
  }).join('') || '<p>Sold out.</p>';
  $('offPerks').innerHTML = shop.perks.map((o, i) => {
    const p = perkById(o.id), price = perkPrice(o.id);
    const replaces = p.group && PERKS.find(q => q.group === p.group && run.perks.has(q.id));
    return `<button class="offer ${p.rarity}${o.sold ? ' sold' : ''}" data-kind="perk" data-i="${i}" ${o.sold || run.coins < price ? 'disabled' : ''}>
      <strong>${p.name}</strong><span class="tag">${p.rarity} perk${replaces ? ` · replaces ${replaces.name}` : ''}</span><span class="desc">${p.desc}</span>
      <span class="price">${o.sold ? 'Owned' : coinHtml + price}</span></button>`;
  }).join('') || '<p>You own every perk.</p>';
}

function renderDeck(game: Game, shop: Shop): void {
  const counts = new Map<Card, number>();
  game.run.deck.forEach(c => counts.set(c, (counts.get(c) ?? 0) + 1));
  $('deckTitle').textContent = deckTitle(game, shop);
  $('deckList').className = `deck${shop.mode === 'remove' ? ' removing' : shop.mode === 'upgrade' ? ' upgrading' : ''}`;
  $('deckList').innerHTML = [...counts].map(([card, n]) => {
    const upgrading = shop.mode === 'upgrade';
    const def = STRIKERS[baseOf(card)];
    const tip = upgrading && !isUpgraded(card) ? ` → ${def.up}: ${def.upDesc}` : '';
    return `<button class="dchip" data-t="${card}" ${shop.mode ? '' : 'tabindex="-1"'} ${upgrading && isUpgraded(card) ? 'disabled' : ''}><span class="sd${isUpgraded(card) ? ' up' : ''}" data-t="${baseOf(card)}"></span>${strikerName(card)} ×${n}${tip}</button>`;
  }).join('');
}

function renderShop(game: Game, shop: Shop): void {
  const { run } = game;
  $('wallet').textContent = String(run.coins);
  $('walletTok').textContent = String(run.tokens);
  renderOffers(game, shop);
  const rerollBtn = $button('reroll'), upgradeBtn = $button('upgradeBtn'), removeBtn = $button('removeBtn');
  rerollBtn.textContent = `Reroll · ${shop.rerollCost}`;
  rerollBtn.disabled = run.coins < shop.rerollCost;
  upgradeBtn.textContent = shop.mode === 'upgrade' ? 'Cancel' : run.tokens > 0 ? 'Upgrade · 1 token' : `Upgrade · ${UPGRADE_COST}`;
  upgradeBtn.disabled = shop.mode !== 'upgrade' && !canUpgradeAny(run);
  removeBtn.textContent = shop.mode === 'remove' ? 'Cancel' : `Remove · ${REMOVE_COST}`;
  removeBtn.disabled = shop.mode !== 'remove' && !canRemoveAny(run);
  renderDeck(game, shop);
}

export function createShopView(deps: ShopDeps): { open: () => void } {
  let shop: Shop | null = null;
  const refresh = () => {
    if (!shop) return;
    deps.onChange();
    renderShop(deps.game(), shop);
  };

  $('shopOver').addEventListener('click', e => {
    if (!shop) return;
    const { run } = deps.game();
    const offer = closest(e.target, '.offer', HTMLButtonElement);
    if (offer && !offer.disabled) {
      const i = Number(offer.dataset.i);
      const shelfOffer = offer.dataset.kind === 'striker' ? shop.strikers[i] : undefined;
      const perkOffer = offer.dataset.kind === 'perk' ? shop.perks[i] : undefined;
      const bought = (shelfOffer && buyStriker(run, shelfOffer)) || (perkOffer && buyPerk(run, perkOffer));
      if (bought) deps.buzz(15);
      refresh();
      return;
    }
    const chip = closest(e.target, '.dchip', HTMLButtonElement);
    const card = chip?.dataset.t;
    if (!chip || chip.disabled || !shop.mode || !card || !isCard(card)) return;
    if (shop.mode === 'remove' && removeCard(run, card)) deps.buzz(15);
    if (shop.mode === 'upgrade') {
      if (!upgradeCard(run, card)) return;
      deps.buzz([15, 20, 15]);
    }
    shop.mode = null;
    refresh();
  });

  $button('reroll').addEventListener('click', () => {
    if (shop && reroll(deps.game().rng, deps.game().run, shop)) refresh();
  });
  $button('upgradeBtn').addEventListener('click', () => {
    if (!shop) return;
    shop.mode = shop.mode === 'upgrade' ? null : 'upgrade';
    refresh();
  });
  $button('removeBtn').addEventListener('click', () => {
    if (!shop) return;
    shop.mode = shop.mode === 'remove' ? null : 'remove';
    refresh();
  });
  $button('nextRound').addEventListener('click', () => {
    shop = null;
    deps.onNextRound();
  });

  return {
    open() {
      const game = deps.game(), { run, round } = game;
      const earnings = settleRound(run, round);
      deps.buzz([40, 60, 40]);
      shop = openShop(game.rng, run);
      $('shopTitle').textContent = `Round ${run.round} cleared`;
      $('earn').innerHTML = earnings.map(e => `<span>${e.label} <b>+${e.coins}</b></span>`).join('');
      const next = themeFor(run, run.round + 1);
      $('nextInfo').textContent = `Next: ${next.name}, quota ${formatNumber(quotaFor(run.round + 1, run.kit))}${run.carry ? ` (starting at ${formatNumber(run.carry)})` : ''}.`;
      refresh();
      $('shopOver').hidden = false;
      $('shopOver').querySelector('.card')?.scrollTo({ top: 0 });
    },
  };
}
