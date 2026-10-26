import { H, R, W, ZONE_TOP } from '@/data/constants';
import { clamp } from '@/lib/math';

export const clampAimX = (x: number): number => clamp(x, R + 4, W - R - 4);
export const clampAimY = (y: number): number => clamp(y, ZONE_TOP + R, H - R - 8);
