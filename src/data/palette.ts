// Names of the CSS custom properties in style.css; the sim refers to colours by name so it never touches the DOM.
export type ColorKey =
  | 'night' | 'frost' | 'striker' | 'gold' | 'rare' | 'paddle' | 'heavy'
  | 't0' | 't1' | 't2'
  | 'pond-ice' | 'pond-line'
  | 'arena-ice' | 'arena-line' | 'arena-red' | 'arena-blue'
  | 'cave-ice' | 'cave-line'
  | 'arcade-floor' | 'arcade-pink' | 'arcade-cyan'
  | 'wood' | 'wood-line' | 'sand'
  | 'lava-floor' | 'lava' | 'lava-hot'
  | 'lab-floor' | 'lab-grid'
  | 'slush';

export type TargetColor = 0 | 1 | 2;

export const TARGET_COLORS = ['t0', 't1', 't2'] as const satisfies readonly ColorKey[];
