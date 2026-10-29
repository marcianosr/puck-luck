import { MIN_DECK_SIZE, PRICE, REMOVE_COST, UPGRADE_COST, type Rarity } from '@/data/constants';
import { PERKS, perkById, type PerkId } from '@/data/perks';
import { isUpgraded, STRIKER_IDS, STRIKERS, upgradeOf, baseOf, type Card, type StrikerId } from '@/data/strikers';
import { WEATHER_CLEAR_COINS } from '@/data/weather';
import { pick, type Rng } from '@/lib/rng';
import { actIndex, addPerk } from './run';
import type { Game, Round, Run } from './types';

const OFFERS_PER_SHELF = 3;
const ROUND_COINS = 4;
const MAX_OVERKILL_COINS = 5;
const MAX_INTEREST_COINS = 5;
const COINS_PER_INTEREST = 5;
const FIRST_REROLL_COST = 2;

export interface Offer<Id> {
  id: Id;
  sold: boolean;
}

export type DeckEditMode = 'upgrade' | 'remove' | null;

export interface Shop {
  /** What the cleared round paid out on the way in. */
  earnings: Earning[];
  rerollCost: number;
  mode: DeckEditMode;
  strikers: Offer<StrikerId>[];
  perks: Offer<PerkId>[];
}

export interface Earning {
  label: string;
  coins: number;
}

/** Legendary odds grow by 3% per act. */
export function rollRarity(rng: Rng, round: number): Rarity {
  const r = rng();
  if (r < 0.06 + actIndex(round) * 0.03) return 'legendary';
  if (r < 0.4) return 'rare';
  return 'common';
}

function rollShelf<Id>(rng: Rng, round: number, candidates: (rarity: Rarity, taken: readonly Id[]) => Id[]): Offer<Id>[] {
  const offers: Offer<Id>[] = [];
  for (let guard = 0; offers.length < OFFERS_PER_SHELF && guard < 200; guard++) {
    const options = candidates(rollRarity(rng, round), offers.map(o => o.id));
    if (options.length) offers.push({ id: pick(rng, options), sold: false });
  }
  return offers;
}

export function rollOffers(rng: Rng, run: Run): Pick<Shop, 'strikers' | 'perks'> {
  const buyable = STRIKER_IDS.filter(id => id !== 'basic' && run.pool.strikers.has(id));
  return {
    strikers: rollShelf<StrikerId>(rng, run.round, (rarity, taken) => buyable.filter(id => STRIKERS[id].rarity === rarity && !taken.includes(id))),
    perks: rollShelf<PerkId>(rng, run.round, (rarity, taken) =>
      PERKS.filter(p => p.rarity === rarity && run.pool.perks.has(p.id) && !run.perks.has(p.id) && !taken.includes(p.id)).map(p => p.id)),
  };
}

export function openShop(rng: Rng, run: Run, earnings: Earning[] = []): Shop {
  return { earnings, rerollCost: FIRST_REROLL_COST, mode: null, ...rollOffers(rng, run) };
}

/** Pays out a cleared round and returns the breakdown. Interest is counted on coins held before the payout. */
export function settleRound(run: Run, round: Round): Earning[] {
  const over = round.score - round.quota;
  const earnings: Earning[] = [
    { label: 'Round', coins: ROUND_COINS },
    { label: 'Overkill', coins: Math.min(MAX_OVERKILL_COINS, Math.floor((over / round.quota) * 5)) },
    { label: 'Interest', coins: Math.min(MAX_INTEREST_COINS, Math.floor(run.coins / COINS_PER_INTEREST)) },
  ];
  if (round.weather) earnings.push({ label: 'Weather', coins: WEATHER_CLEAR_COINS });
  if (run.mods.roundBonusCoins) earnings.push({ label: 'Piggy Bank', coins: run.mods.roundBonusCoins });
  run.coins += earnings.reduce((sum, e) => sum + e.coins, 0);
  if (run.mods.carryOver) run.carry = over;
  return earnings;
}

export const strikerPrice = (id: StrikerId): number => PRICE.striker[STRIKERS[id].rarity];
export const perkPrice = (id: PerkId): number => PRICE.perk[perkById(id).rarity];

export function buyStriker(run: Run, offer: Offer<StrikerId>): boolean {
  const price = strikerPrice(offer.id);
  if (offer.sold || run.coins < price) return false;
  run.coins -= price;
  run.deck.push(offer.id);
  offer.sold = true;
  return true;
}

export function buyPerk(run: Run, offer: Offer<PerkId>): boolean {
  const price = perkPrice(offer.id);
  if (offer.sold || run.coins < price) return false;
  run.coins -= price;
  addPerk(run, offer.id);
  offer.sold = true;
  return true;
}

export function reroll(rng: Rng, run: Run, shop: Shop): boolean {
  if (run.coins < shop.rerollCost) return false;
  run.coins -= shop.rerollCost;
  shop.rerollCost++;
  Object.assign(shop, rollOffers(rng, run));
  return true;
}

export const canUpgradeAny = (run: Run): boolean =>
  run.deck.some(c => !isUpgraded(c)) && (run.tokens > 0 || run.coins >= UPGRADE_COST);

export const canRemoveAny = (run: Run): boolean => run.coins >= REMOVE_COST && run.deck.length > MIN_DECK_SIZE;

/** Upgrades one copy of `card`, paying with a token when there is one. */
export function upgradeCard(run: Run, card: Card): boolean {
  const idx = run.deck.indexOf(card);
  if (idx < 0 || isUpgraded(card)) return false;
  if (run.tokens > 0) run.tokens--;
  else if (run.coins >= UPGRADE_COST) run.coins -= UPGRADE_COST;
  else return false;
  run.deck[idx] = upgradeOf(baseOf(card));
  return true;
}

export function removeCard(run: Run, card: Card): boolean {
  const idx = run.deck.indexOf(card);
  if (idx < 0 || !canRemoveAny(run)) return false;
  run.deck.splice(idx, 1);
  run.coins -= REMOVE_COST;
  return true;
}

export type Shelf = 'striker' | 'perk';

function shopChanged(game: Game, cue: 'buy' | 'upgrade' | null, perks = false): void {
  game.emit({ type: 'coins' });
  if (perks) game.emit({ type: 'perks' });
  game.emit({ type: 'shop' });
  if (cue) game.emit({ type: 'feel', cue });
}

/** Buys the offer at `index` on a shelf of the open shop. */
export function buyOffer(game: Game, shelf: Shelf, index: number): boolean {
  const { shop, run } = game;
  if (!shop) return false;
  const striker = shelf === 'striker' ? shop.strikers[index] : undefined;
  const perk = shelf === 'perk' ? shop.perks[index] : undefined;
  const bought = (!!striker && buyStriker(run, striker)) || (!!perk && buyPerk(run, perk));
  if (bought) shopChanged(game, 'buy', !!perk);
  return bought;
}

export function rerollShop(game: Game): boolean {
  if (!game.shop || !reroll(game.rng, game.run, game.shop)) return false;
  shopChanged(game, null);
  return true;
}

/** Switches the deck into upgrade or remove mode, or back out when it is already in that mode. */
export function toggleDeckMode(game: Game, mode: Exclude<DeckEditMode, null>): void {
  if (!game.shop) return;
  game.shop.mode = game.shop.mode === mode ? null : mode;
  game.emit({ type: 'shop' });
}

/** Applies the current deck mode to one card, then leaves the mode. */
export function editDeck(game: Game, card: Card): boolean {
  const { shop, run } = game;
  if (!shop?.mode) return false;
  const upgrading = shop.mode === 'upgrade';
  const edited = upgrading ? upgradeCard(run, card) : removeCard(run, card);
  if (!edited) return false;
  shop.mode = null;
  shopChanged(game, upgrading ? 'upgrade' : 'buy');
  return true;
}
