import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT } from '@/data/kits';
import { createRng } from '@/lib/rng';
import { createGame } from './game';
import { addPerk, createRun } from './run';
import { buyPerk, removeCard, rollOffers, settleRound, upgradeCard } from './shop';
import type { Round } from './types';

const freshRun = (coins = 0) => ({ ...createRun(DEFAULT_KIT, createRng(1)), coins });
const roundScoring = (score: number, quota: number, overrides: Partial<Round> = {}): Round =>
  ({ ...createGame({ seed: 1 }).round, score, quota, weather: null, ...overrides });

describe('settleRound', () => {
  it('pays 4 for the round plus overkill and interest', () => {
    const run = freshRun(10);
    const earnings = settleRound(run, roundScoring(2000, 1000));
    expect(earnings).toEqual([
      { label: 'Round', coins: 4 },
      { label: 'Overkill', coins: 5 },
      { label: 'Interest', coins: 2 },
    ]);
    expect(run.coins).toBe(21);
  });

  it('caps overkill and interest at 5 coins each', () => {
    const run = freshRun(100);
    const earnings = settleRound(run, roundScoring(50_000, 1000));
    expect(earnings.map(e => e.coins)).toEqual([4, 5, 5]);
  });

  it('adds weather and Piggy Bank coins and carries the surplus with Overtime', () => {
    const run = freshRun();
    addPerk(run, 'piggy');
    addPerk(run, 'carry');
    const earnings = settleRound(run, roundScoring(1300, 1000, { weather: { id: 'fog', name: 'Fog', desc: '', wind: null } }));
    expect(earnings.map(e => e.label)).toEqual(['Round', 'Overkill', 'Interest', 'Weather', 'Piggy Bank']);
    expect(run.carry).toBe(300);
  });
});

describe('buyPerk', () => {
  it('charges by rarity and marks the offer sold', () => {
    const run = freshRun(10), offer = { id: 'fever' as const, sold: false };
    expect(buyPerk(run, offer)).toBe(true);
    expect([run.coins, offer.sold, run.mods.clashMult]).toEqual([4, true, 15]);
  });

  it('refuses when the player is short of coins', () => {
    const run = freshRun(5);
    expect(buyPerk(run, { id: 'fever', sold: false })).toBe(false);
    expect(run.coins).toBe(5);
  });
});

describe('upgradeCard', () => {
  it('spends a token before coins', () => {
    const run = { ...freshRun(10), tokens: 1 };
    upgradeCard(run, 'heavy');
    expect([run.tokens, run.coins, run.deck.includes('heavy+')]).toEqual([0, 10, true]);
  });

  it('refuses an already upgraded card', () => {
    expect(upgradeCard({ ...freshRun(10), deck: ['heavy+'] }, 'heavy+')).toBe(false);
  });
});

describe('removeCard', () => {
  it('never shrinks the deck below 3 strikers', () => {
    const run = { ...freshRun(10), deck: ['basic' as const, 'basic' as const, 'heavy' as const] };
    expect(removeCard(run, 'heavy')).toBe(false);
    expect(run.deck).toHaveLength(3);
  });
});

describe('rollOffers', () => {
  it('only offers strikers and perks from the run\'s content pool', () => {
    const run = { ...freshRun(), pool: { strikers: new Set(['heavy'] as const), perks: new Set(['slick', 'hot'] as const) } };
    for (let seed = 1; seed <= 20; seed++) {
      const offers = rollOffers(createRng(seed), run);
      expect(offers.strikers.every(o => o.id === 'heavy')).toBe(true);
      expect(offers.perks.every(o => o.id === 'slick' || o.id === 'hot')).toBe(true);
    }
  });

  it('leaves a shelf short rather than offering locked content', () => {
    const run = { ...freshRun(), pool: { strikers: new Set(['heavy'] as const), perks: new Set<never>() } };
    const offers = rollOffers(createRng(1), run);
    expect(offers.strikers).toHaveLength(1);
    expect(offers.perks).toHaveLength(0);
  });
});
