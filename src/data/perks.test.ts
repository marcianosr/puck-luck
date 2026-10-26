import { describe, expect, it } from 'vitest';
import { BASE_MODIFIERS, modifiersFor, perkById, type PerkId } from './perks';

const mods = (...ids: PerkId[]) => modifiersFor(new Set(ids));

describe('modifiersFor', () => {
  it('returns the base modifiers without perks', () => {
    expect(mods()).toEqual(BASE_MODIFIERS);
  });

  it('applies only the modifiers a perk declares', () => {
    const fever = mods('fever');
    expect(fever.clashMult).toBe(15);
    expect({ ...fever, clashMult: BASE_MODIFIERS.clashMult }).toEqual(BASE_MODIFIERS);
  });

  it('gives Midas precedence over Gold Disc whatever order they were bought in', () => {
    expect(mods('midas', 'gold').goldTargets).toBe(3);
    expect(mods('gold', 'midas').goldTargets).toBe(3);
  });

  it('combines perks that change different modifiers', () => {
    const m = mods('hustler', 'banker');
    expect([m.sinkPoints, m.sinkCoins, m.bankMult]).toEqual([500, 2, 3]);
  });
});

describe('perk descriptions', () => {
  it('derive their numbers from the modifiers they apply', () => {
    expect(perkById('fever').desc).toBe('Clashes pay ×15 instead of ×10.');
    expect(perkById('cap').nums).toEqual(['Max hit value <b>400</b> (normally 240)']);
    expect(perkById('collector').desc).toBe('Clashes pay +1× for every clash landed this run.');
    expect(perkById('momentum').desc).toBe('Every hit pays +15% per round cleared this run.');
    expect(perkById('sweeper').nums).toEqual(['Sweep time: <b>3.0 s</b> per shot (normally 1.5 s)']);
  });
});
