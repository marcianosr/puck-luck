import { describe, expect, it } from 'vitest';
import { DEFAULT_KIT, KITS } from '@/data/kits';
import { createRng } from '@/lib/rng';
import { actIndex, addPerk, createRun, drawHand, handSize, quotaFor } from './run';

const gambler = KITS.find(k => k.id === 'gambler') ?? DEFAULT_KIT;

describe('quotaFor', () => {
  it('starts at 1,500 and grows 55% per round, rounded to 50', () => {
    expect([1, 2, 3].map(r => quotaFor(r, DEFAULT_KIT))).toEqual([1500, 2350, 3600]);
  });

  it('raises every quota 10% for the Gambler kit', () => {
    expect(quotaFor(1, gambler)).toBe(1650);
  });
});

describe('actIndex', () => {
  it('groups rounds in threes', () => {
    expect([1, 3, 4, 6, 7].map(actIndex)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe('createRun', () => {
  it('always opens on the Frozen Pond and uses every theme once', () => {
    const run = createRun(DEFAULT_KIT, createRng(3));
    expect(run.themes[0]).toBe('pond');
    expect(new Set(run.themes).size).toBe(7);
  });

  it('starts with the kit perks applied', () => {
    expect(createRun(gambler, createRng(1)).mods.roundBonusCoins).toBe(2);
  });
});

describe('drawHand', () => {
  it('draws 3, or 4 with Big Hands', () => {
    const run = createRun(DEFAULT_KIT, createRng(1));
    expect(drawHand(createRng(1), run)).toHaveLength(3);
    addPerk(run, 'hands');
    expect(handSize(run)).toBe(4);
  });

  it('reshuffles the deck when the hand is bigger than the deck', () => {
    const run = createRun({ ...DEFAULT_KIT, deck: ['bomb', 'heavy'] }, createRng(1));
    const hand = drawHand(createRng(1), run);
    expect(hand).toHaveLength(3);
    expect(hand.every(c => c === 'bomb' || c === 'heavy')).toBe(true);
  });
});

describe('addPerk', () => {
  it('swaps out the owned curl style when buying another', () => {
    const run = createRun(DEFAULT_KIT, createRng(1));
    addPerk(run, 'late');
    addPerk(run, 'snake');
    expect([...run.perks]).toEqual(['snake']);
    expect(run.mods.curlStyle).toBe('snake');
  });
});
