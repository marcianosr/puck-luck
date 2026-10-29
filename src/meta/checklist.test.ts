import { describe, expect, it } from 'vitest';
import { CHECKLIST, STARTING_CONTENT } from '@/data/checklist';
import { KITS } from '@/data/kits';
import { PERKS } from '@/data/perks';
import { STRIKER_IDS } from '@/data/strikers';
import { applyRun, goalOf, isRevealed, tileFor, unlocksFor } from './checklist';
import { emptyProfile, foldRun, type Profile, type RunSummary } from './profile';

const noRun: RunSummary = {
  roundsCleared: 0, chain: 0, shot: 0, runScore: 0, clashes: 0, sinks: 0, curls: 0, banks: 0, perfects: 0, shatters: 0, bounties: 0,
};
const tiles = CHECKLIST.flat();
const rewardsOf = (kind: string) => tiles.flatMap(t => (t.reward?.kind === kind ? [t.reward.id] : []));

describe('foldRun', () => {
  it('counts the run and adds lifetime totals', () => {
    const once = foldRun(emptyProfile(), { ...noRun, clashes: 3, sinks: 2 });
    const twice = foldRun(once, { ...noRun, clashes: 4 });
    expect(twice.stats).toMatchObject({ runs: 2, clashes: 7, sinks: 2 });
  });

  it('keeps the best of record stats instead of adding them', () => {
    const profile = foldRun(foldRun(emptyProfile(), { ...noRun, chain: 12, roundsCleared: 4 }), { ...noRun, chain: 9, roundsCleared: 2 });
    expect(profile.stats).toMatchObject({ chain: 12, roundsCleared: 4 });
  });
});

describe('applyRun', () => {
  it('clears every tile the run reaches and reports only those', () => {
    const { profile, cleared } = applyRun(emptyProfile(), { ...noRun, chain: 8, sinks: 1 });
    expect(cleared.map(t => t.id)).toEqual(['chain-8', 'sinks-1']);
    expect(profile.cleared).toEqual(['chain-8', 'sinks-1']);
  });

  it('never reports a tile twice', () => {
    const first = applyRun(emptyProfile(), { ...noRun, chain: 8 });
    expect(applyRun(first.profile, { ...noRun, chain: 9 }).cleared.map(t => t.id)).not.toContain('chain-8');
  });

  it('clears lifetime goals across several runs', () => {
    let profile: Profile = emptyProfile();
    for (let i = 0; i < 4; i++) profile = applyRun(profile, { ...noRun, sinks: 1 }).profile;
    expect(applyRun(profile, { ...noRun, sinks: 1 }).cleared.map(t => t.id)).toContain('sinks-5');
  });
});

describe('isRevealed', () => {
  it('shows the whole top row from the start', () => {
    expect(CHECKLIST[0]?.every((_, col) => isRevealed(0, col, new Set()))).toBe(true);
  });

  it('hides lower tiles until a neighbour is cleared', () => {
    expect(isRevealed(1, 1, new Set())).toBe(false);
    expect(isRevealed(1, 1, new Set(['roundsCleared-2']))).toBe(true);
  });

  it('does not reveal diagonal neighbours', () => {
    expect(isRevealed(1, 1, new Set(['runs-2']))).toBe(false);
  });
});

describe('unlocksFor', () => {
  it('gives a new player only the starting content', () => {
    const { kits, pool } = unlocksFor(emptyProfile());
    expect([...kits]).toEqual(['classic']);
    expect(pool.strikers.has('ghost')).toBe(false);
    expect(pool.perks.has('slick')).toBe(true);
    expect(pool.perks.has('midas')).toBe(false);
  });

  it('adds the reward of every cleared tile', () => {
    const { kits, pool } = unlocksFor({ ...emptyProfile(), cleared: ['roundsCleared-3', 'chain-12'] });
    expect(kits.has('bruiser')).toBe(true);
    expect(pool.strikers.has('ghost')).toBe(true);
  });
});

describe('the Checklist grid', () => {
  it('is a full 6×6 grid with unique tile ids', () => {
    expect(CHECKLIST.map(r => r.length)).toEqual([6, 6, 6, 6, 6, 6]);
    expect(new Set(tiles.map(t => t.id)).size).toBe(36);
  });

  it('unlocks every kit, striker and perk that is not starting content, exactly once', () => {
    const lockedKits = KITS.map(k => k.id).filter(id => !STARTING_CONTENT.kits.includes(id));
    const lockedStrikers = STRIKER_IDS.filter(id => !STARTING_CONTENT.strikers.some(s => s === id));
    const lockedPerks = PERKS.map(p => p.id).filter(id => !STARTING_CONTENT.perks.includes(id));
    expect(rewardsOf('kit').sort()).toEqual([...lockedKits].sort());
    expect(rewardsOf('striker').sort()).toEqual([...lockedStrikers].sort());
    expect(rewardsOf('perk').sort()).toEqual([...lockedPerks].sort());
  });

  it('writes a readable goal for every tile', () => {
    expect(goalOf({ id: 'x', need: { stat: 'clashes', atLeast: 1 } })).toBe('Land 1 striker clash');
    expect(goalOf({ id: 'x', need: { stat: 'runScore', atLeast: 30_000 } })).toBe('Score 30,000 in one run');
  });

  it('finds the tile that unlocks a reward', () => {
    expect(tileFor({ kind: 'kit', id: 'bruiser' })).toMatchObject({ row: 1, col: 1 });
    expect(tileFor({ kind: 'kit', id: 'classic' })).toBeNull();
  });
});
