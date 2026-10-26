import type { ColorKey } from './palette';

export type ThemeId = 'pond' | 'arena' | 'cave' | 'arcade' | 'boardwalk' | 'lava' | 'lab';

export interface Theme {
  name: string;
  floor: ColorKey;
  line: ColorKey;
  ink: 'night' | 'frost';
  friction: number;
  wallBounce: number;
  pockets: number;
  bumpers: number;
  patches: number;
  wells: number;
  decor: ThemeId;
  icy?: boolean;
  indoor?: boolean;
  patch?: 'SAND';
  pocketStyle?: 'goal' | 'knot' | 'lava';
  pocketR?: number;
}

export const THEMES = {
  pond:      { name: 'Frozen Pond',      floor: 'pond-ice',     line: 'pond-line',   ink: 'night', friction: .99,  wallBounce: .9,  pockets: 1, bumpers: 0, patches: 0, wells: 0, decor: 'pond', icy: true },
  arena:     { name: 'Hockey Arena',     floor: 'arena-ice',    line: 'arena-line',  ink: 'night', friction: .99,  wallBounce: .9,  pockets: 2, bumpers: 2, patches: 0, wells: 0, decor: 'arena', icy: true, indoor: true },
  cave:      { name: 'Glow Cave',        floor: 'cave-ice',     line: 'cave-line',   ink: 'frost', friction: .99,  wallBounce: .9,  pockets: 2, bumpers: 2, patches: 2, wells: 0, decor: 'cave', icy: true },
  arcade:    { name: 'Neon Arcade',      floor: 'arcade-floor', line: 'arcade-cyan', ink: 'frost', friction: .995, wallBounce: 1.0, pockets: 2, bumpers: 4, patches: 0, wells: 0, decor: 'arcade', indoor: true, pocketStyle: 'goal' },
  boardwalk: { name: 'Sunset Boardwalk', floor: 'wood',         line: 'wood-line',   ink: 'night', friction: .985, wallBounce: .8,  pockets: 2, bumpers: 0, patches: 2, wells: 0, decor: 'boardwalk', patch: 'SAND', pocketStyle: 'knot' },
  lava:      { name: 'Lava Forge',       floor: 'lava-floor',   line: 'lava',        ink: 'frost', friction: .99,  wallBounce: .9,  pockets: 2, bumpers: 1, patches: 0, wells: 0, decor: 'lava', indoor: true, pocketStyle: 'lava', pocketR: 24 },
  lab:       { name: 'Zero-G Lab',       floor: 'lab-floor',    line: 'lab-grid',    ink: 'frost', friction: .996, wallBounce: 1.0, pockets: 1, bumpers: 0, patches: 0, wells: 2, decor: 'lab', indoor: true },
} as const satisfies Record<ThemeId, Theme>;

export const FIRST_THEME: ThemeId = 'pond';
export const LATER_THEMES: readonly ThemeId[] = ['arena', 'cave', 'arcade', 'boardwalk', 'lava', 'lab'];
