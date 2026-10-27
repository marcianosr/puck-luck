export const W = 400;
export const H = 680;
export const R = 15;
export const LAUNCH_Y = H - 60;
export const ZONE_TOP = H - 150;
export const HAND = 3;
export const MAXV = 22;
export const POCKET_R = 18;
export const BUMPER_R = 14;
export const WELL_R = 140;

// Physics was tuned per 60 Hz frame; the sim keeps ticking at that rate whatever the display does.
export const TICKS_PER_SECOND = 60;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

export const PERFECT_BAND = { min: 0.7, max: 0.85 } as const;
export const SWEEP_TICKS = 90;
/** How close to the rolling striker a held finger sweeps. */
export const SWEEP_RADIUS = 110;

export const UPGRADE_COST = 5;
export const REMOVE_COST = 3;
export const MIN_DECK_SIZE = 3;

export type Rarity = 'common' | 'rare' | 'legendary';

export const PRICE = {
  striker: { common: 3, rare: 5, legendary: 9 },
  perk: { common: 4, rare: 6, legendary: 10 },
} as const satisfies Record<string, Record<Rarity, number>>;
