import { TARGET_COLORS, type ColorKey } from '@/data/palette';
import type { Disc, Round, Target } from '@/sim/types';
import { circle, FULL_CIRCLE, shadowFor, type Paint } from './paint';

export function discColor(d: Disc): ColorKey {
  if (d.kind === 'striker') return d.type === 'heavy' ? 'heavy' : 'striker';
  return d.gold ? 'gold' : TARGET_COLORS[d.color];
}

export function drawTrail({ ctx, color }: Paint, d: Disc): void {
  const fill = color(discColor(d)), n = d.trail.length;
  d.trail.forEach((p, i) => {
    ctx.globalAlpha = ((i + 1) / n) * 0.28;
    ctx.fillStyle = fill;
    circle(ctx, p.x, p.y, d.r * (0.45 + (0.5 * (i + 1)) / n));
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawStrikerMarks({ ctx, color }: Paint, d: Disc, r: number): void {
  if (d.kind !== 'striker') return;
  if (d.type === 'heavy') {
    ctx.strokeStyle = 'rgba(14,26,43,.55)';
    ctx.lineWidth = 3;
    circle(ctx, 0, 0, r * 0.82);
    ctx.stroke();
  }
  if (d.type === 'magnet') {
    ctx.strokeStyle = color('t0');
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
  }
  if (d.type === 'bomb') {
    ctx.fillStyle = color('night');
    circle(ctx, 0, 0, r * 0.42);
    ctx.fill();
    const fuseBlink = (Math.floor(d.age) >> 3) % 2;
    if (d.bomb?.armed && d.launched && fuseBlink) {
      ctx.fillStyle = color('gold');
      circle(ctx, 0, 0, r * 0.18);
      ctx.fill();
    }
  }
  if (d.type === 'comet') {
    ctx.strokeStyle = color('gold');
    ctx.lineWidth = 3;
    circle(ctx, 0, 0, r - 1.5);
    ctx.stroke();
  }
}

function discFill({ ctx, color }: Paint, d: Disc): string | CanvasGradient {
  if (d.kind !== 'striker' || d.type !== 'prism') return color(discColor(d));
  const g = ctx.createConicGradient(d.rot, 0, 0);
  (['t0', 'gold', 't2', 'rare', 't1', 't0'] as const).forEach((key, i) => g.addColorStop(i / 5, color(key)));
  return g;
}

const isGhosting = (d: Disc): boolean => d.kind === 'striker' && !!d.ghost && (d.ghost.phasesLeft > 0 || !d.launched);

export function drawDisc(paint: Paint, round: Round, d: Disc, x = d.x, y = d.y): void {
  const { ctx, color } = paint, r = d.r, sq = 1 + (d.squash || 0) * 0.18;
  ctx.fillStyle = shadowFor(round.theme);
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 4, r, r * 0.8, 0, 0, FULL_CIRCLE);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sq, 2 - sq);
  if (isGhosting(d)) ctx.globalAlpha = 0.5;
  ctx.fillStyle = discFill(paint, d);
  circle(ctx, 0, 0, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2.5;
  circle(ctx, 0, 0, r * 0.58);
  ctx.stroke();
  drawStrikerMarks(paint, d, r);
  ctx.rotate(d.rot || 0);
  if (d.kind === 'striker' && d.type === 'splitter') {
    ctx.strokeStyle = color('night');
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.lineTo(r * 0.8, 0);
    if (d.up) {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, r * 0.8);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(14,26,43,.35)';
  ctx.fillRect(r * 0.62, -1.6, r * 0.3, 3.2);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,.5)';
  circle(ctx, x - r * 0.33, y - r * 0.4, r * 0.21);
  ctx.fill();
  if (d.kind === 'striker' && d.up) {
    ctx.fillStyle = color('gold');
    circle(ctx, x + r * 0.62, y - r * 0.62, 3.5);
    ctx.fill();
    ctx.strokeStyle = color('night');
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (d.kind === 'target') drawTargetMarks(paint, d, x, y);
  if (d.flash > 0) {
    ctx.globalAlpha = d.flash;
    ctx.strokeStyle = color('gold');
    ctx.lineWidth = 4;
    circle(ctx, x, y, r + 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawTargetMarks({ ctx, color }: Paint, d: Target, x: number, y: number): void {
  const r = d.r;
  if (d.maxHp > 1) {
    ctx.strokeStyle = color('frost');
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    circle(ctx, x, y, r - 1.5);
    ctx.stroke();
    if (d.hp === 1) {
      ctx.strokeStyle = color('night');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 0.2);
      ctx.lineTo(x - r * 0.1, y + r * 0.1);
      ctx.lineTo(x + r * 0.2, y - r * 0.4);
      ctx.lineTo(x + r * 0.7, y + r * 0.3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (d.gold) {
    ctx.strokeStyle = color('night');
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    circle(ctx, x, y, r - 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
