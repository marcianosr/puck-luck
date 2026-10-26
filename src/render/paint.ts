import type { ColorKey } from '@/data/palette';
import type { Theme } from '@/data/themes';

export interface Paint {
  ctx: CanvasRenderingContext2D;
  color: (key: ColorKey) => string;
}

/** Reads colours from the CSS custom properties once; style.css stays the single source of the palette. */
export function cssPalette(root: HTMLElement = document.documentElement): (key: ColorKey) => string {
  const cache = new Map<ColorKey, string>();
  return key => {
    let value = cache.get(key);
    if (value === undefined) {
      value = getComputedStyle(root).getPropertyValue(`--${key}`).trim();
      cache.set(key, value);
    }
    return value;
  };
}

export const shadowFor = (theme: Theme): string => (theme.ink === 'frost' ? 'rgba(0,0,0,.4)' : 'rgba(14,26,43,.18)');

export const isDarkFloor = (theme: Theme): boolean => theme.ink === 'frost';

export const FULL_CIRCLE = Math.PI * 2;

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, FULL_CIRCLE);
}

export function outlined({ ctx, color }: Paint, text: string, x: number, y: number, size: number, fill: string, stroke = color('night')): void {
  ctx.font = `${size}px "Lilita One", sans-serif`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

export function label({ ctx }: Paint, text: string, x: number, y: number, size: number, fill: string, align: CanvasTextAlign, alpha = 1): void {
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px Nunito, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}
