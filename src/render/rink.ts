import { H, W, WELL_R, ZONE_TOP } from '@/data/constants';
import type { Round, Zone } from '@/sim/types';
import { circle, FULL_CIRCLE, isDarkFloor, shadowFor, type Paint } from './paint';

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawDecor(paint: Paint, round: Round): void {
  const { ctx, color } = paint, theme = round.theme, mid = ZONE_TOP * 0.5;
  switch (theme.decor) {
    case 'arena':
      ctx.strokeStyle = color('arena-red');
      ctx.lineWidth = 3;
      line(ctx, 0, mid, W, mid);
      ctx.strokeStyle = color('arena-blue');
      [ZONE_TOP * 0.25, ZONE_TOP * 0.75].forEach(y => line(ctx, 0, y, W, y));
      ctx.strokeStyle = color(theme.line);
      ctx.lineWidth = 2;
      circle(ctx, W / 2, mid, 55);
      ctx.stroke();
      return;
    case 'cave':
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const y0 = 40 + i * 64;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.bezierCurveTo(W * 0.3, y0 + 30, W * 0.6, y0 - 30, W, y0 + 12);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    case 'arcade':
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color(theme.line);
      for (let x = 20; x < W; x += 20) for (let y = 20; y < ZONE_TOP; y += 20) ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = color('arcade-pink');
      ctx.lineWidth = 3;
      ctx.strokeRect(5, 5, W - 10, H - 10);
      line(ctx, 0, mid, W, mid);
      circle(ctx, W / 2, mid, 50);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    case 'boardwalk':
      for (let y = 0, i = 0; y < H; y += 34, i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)';
        ctx.fillRect(0, y, W, 34);
        ctx.strokeStyle = color(theme.line);
        ctx.lineWidth = 1.5;
        line(ctx, 0, y, W, y);
        for (let x = (i * 137) % 160; x < W; x += 160) {
          line(ctx, x, y, x, y + 34);
          ctx.fillStyle = color(theme.line);
          ctx.fillRect(x + 6, y + 6, 2, 2);
          ctx.fillRect(x + 6, y + 26, 2, 2);
        }
      }
      return;
    case 'lava':
      ctx.strokeStyle = color('lava');
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      for (const crack of round.fx.cracks) {
        ctx.beginPath();
        crack.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    case 'lab':
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) line(ctx, x, 0, x, H);
      for (let y = 0; y <= H; y += 40) line(ctx, 0, y, W, y);
      ctx.globalAlpha = 1;
      return;
    case 'pond':
      circle(ctx, W / 2, mid, 60);
      ctx.stroke();
      line(ctx, 0, mid, W, mid);
  }
}

function drawWells({ ctx, color }: Paint, round: Round, seconds: number): void {
  for (const w of round.wells) {
    for (let i = 0; i < 4; i++) {
      const k = (seconds * 0.5 + i / 4) % 1;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.strokeStyle = color(round.theme.line);
      ctx.lineWidth = 1.5;
      circle(ctx, w.x, w.y, WELL_R * (1 - k) + 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color(round.theme.line);
    circle(ctx, w.x, w.y, 6);
    ctx.fill();
  }
}

function drawPatches({ ctx, color }: Paint, round: Round): void {
  const theme = round.theme;
  for (const s of round.patches) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color(theme.patch === 'SAND' ? 'sand' : 'slush');
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * FULL_CIRCLE, rr = s.r * (1 + Math.sin(a * 3 + s.x) * 0.08);
      const x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color(theme.ink);
    ctx.font = '800 9px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(theme.patch ?? 'SLUSH', s.x, s.y + 3);
    ctx.globalAlpha = 1;
  }
}

function drawPocket({ ctx, color }: Paint, round: Round, p: Zone): void {
  const theme = round.theme;
  if (theme.pocketStyle === 'lava') {
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r + 6);
    g.addColorStop(0, color('lava-hot'));
    g.addColorStop(0.6, color('lava'));
    g.addColorStop(1, 'rgba(255,122,61,0)');
    ctx.fillStyle = g;
    circle(ctx, p.x, p.y, p.r + 6);
    ctx.fill();
    return;
  }
  ctx.fillStyle = color('night');
  circle(ctx, p.x, p.y, p.r);
  ctx.fill();
  ctx.strokeStyle = theme.pocketStyle === 'goal' ? color('arcade-pink') : color(theme.line);
  ctx.lineWidth = 3;
  circle(ctx, p.x, p.y, p.r + 1.5);
  ctx.stroke();
  if (theme.pocketStyle === 'knot') {
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r + 4 + i * 4, p.r + 1 + i * 3, 0, 0, FULL_CIRCLE);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  circle(ctx, p.x - 4, p.y - 4, p.r * 0.45);
  ctx.fill();
}

function drawBumper({ ctx, color }: Paint, round: Round, b: Zone): void {
  ctx.fillStyle = shadowFor(round.theme);
  circle(ctx, b.x + 2, b.y + 3, b.r);
  ctx.fill();
  ctx.fillStyle = b.flash > 0 ? color('gold') : color('heavy');
  circle(ctx, b.x, b.y, b.r);
  ctx.fill();
  ctx.strokeStyle = round.theme.decor === 'arcade' ? color('arcade-pink') : color('gold');
  ctx.lineWidth = 3;
  circle(ctx, b.x, b.y, b.r - 3);
  ctx.stroke();
  if (b.flash > 0) {
    ctx.globalAlpha = b.flash;
    ctx.lineWidth = 2;
    circle(ctx, b.x, b.y, b.r + 6 * (1 - b.flash) + 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawRink(paint: Paint, round: Round, seconds: number): void {
  const { ctx, color } = paint, theme = round.theme;
  ctx.fillStyle = color(theme.floor);
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = color(theme.line);
  ctx.lineWidth = 2;
  drawDecor(paint, round);
  drawWells(paint, round, seconds);
  drawPatches(paint, round);
  for (const p of round.pockets) drawPocket(paint, round, p);
  for (const b of round.bumpers) drawBumper(paint, round, b);

  ctx.globalAlpha = isDarkFloor(theme) ? 0.12 : 0.25;
  ctx.fillStyle = color(theme.line);
  ctx.fillRect(0, ZONE_TOP, W, H - ZONE_TOP);
  ctx.globalAlpha = 1;
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = color('t0');
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  line(ctx, 0, ZONE_TOP, W, ZONE_TOP);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
