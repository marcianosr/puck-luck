export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const speedOf = (v: { vx: number; vy: number }): number => Math.hypot(v.vx, v.vy);

export const formatNumber = (n: number): string => Math.round(n).toLocaleString('en');
