import { describe, expect, it } from 'vitest';
import { hintFor, type CoachState, type HintId } from './hints';

const aiming: CoachState = { runPhase: 'playing', roundPhase: 'aim', bountyDone: false };
const rolling: CoachState = { ...aiming, roundPhase: 'roll' };
const seen = (...ids: HintId[]) => new Set<HintId>(ids);

describe('hintFor', () => {
  it('teaches aiming on the very first shot', () => {
    expect(hintFor(aiming, seen())).toBe('aim');
  });

  it('teaches sweeping and abilities while the first shot rolls', () => {
    expect(hintFor(rolling, seen('aim'))).toBe('sweep');
  });

  it('teaches curl and Perfect releases on the next aim', () => {
    expect(hintFor(aiming, seen('aim', 'sweep'))).toBe('curl');
  });

  it('holds back the curl hint until sweeping has been shown', () => {
    expect(hintFor(aiming, seen('aim'))).toBeNull();
  });

  it('points out the first finished bounty, even mid-shot', () => {
    expect(hintFor({ ...rolling, bountyDone: true }, seen('aim'))).toBe('bounty');
  });

  it('shows nothing once every hint has been seen', () => {
    expect(hintFor({ ...aiming, bountyDone: true }, seen('aim', 'sweep', 'curl', 'bounty'))).toBeNull();
  });

  it('shows nothing outside play, like in the shop or the kit picker', () => {
    expect(hintFor({ ...aiming, runPhase: 'shop' }, seen())).toBeNull();
    expect(hintFor({ ...aiming, runPhase: 'kitPick' }, seen())).toBeNull();
  });
});
