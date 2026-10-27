import { H, LAUNCH_Y, MAXV, PERFECT_BAND, SWEEP_RADIUS, W, ZONE_TOP } from '@/data/constants';
import { CURL_STYLE_LABEL } from '@/data/perks';
import { strikerName } from '@/data/strikers';
import { curlOf, liveSpeed } from '@/input/gestures';
import { clamp } from '@/lib/math';
import { isInPerfectBand, sweepTicks } from '@/sim/actions';
import { boomProgress, nudgeProgress, popProgress, pulseProgress } from '@/sim/effects';
import { createStriker } from '@/sim/round';
import { abilityOf } from '@/sim/strikers';
import type { Game, Round } from '@/sim/types';
import { clampAimX, clampAimY } from '@/input/aim';
import type { PointerView } from '@/input/pointer';
import { drawDisc, drawTrail } from './discs';
import { circle, isDarkFloor, label, outlined, type Paint } from './paint';
import { drawRink } from './rink';

export interface FrameView {
  gain: number;
  pointer: PointerView;
  seconds: number;
  /** Cosmetic jitter source for screen shake. */
  random: () => number;
}

const FOG_REVEAL_STRIKER = 95;
const FOG_REVEAL_FLASH = 40;

function drawPower(paint: Paint, power: number, perfect: boolean, ink: string): void {
  const { ctx, color } = paint, x0 = 10, y0 = H - 42, w = 120;
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(x0, y0, w, 9);
  ctx.fillStyle = color('gold');
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x0 + w * PERFECT_BAND.min, y0 - 3, w * (PERFECT_BAND.max - PERFECT_BAND.min), 15);
  ctx.globalAlpha = 1;
  ctx.fillStyle = isInPerfectBand(power) ? color('gold') : power > PERFECT_BAND.max ? color('t0') : color('paddle');
  ctx.fillRect(x0, y0, w * power, 9);
  label(paint, perfect ? 'PERFECT' : 'POWER', x0, y0 - 6, 10, ink, 'left', 0.75);
}

function drawFog(paint: Paint, fog: CanvasRenderingContext2D, round: Round): void {
  fog.globalCompositeOperation = 'source-over';
  fog.clearRect(0, 0, W, H);
  fog.fillStyle = isDarkFloor(round.theme) ? 'rgba(40,48,62,.96)' : 'rgba(214,224,232,.96)';
  fog.fillRect(0, 0, W, ZONE_TOP);
  fog.globalCompositeOperation = 'destination-out';
  const hole = (x: number, y: number, r: number) => {
    const g = fog.createRadialGradient(x, y, r * 0.45, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fog.fillStyle = g;
    fog.beginPath();
    fog.arc(x, y, r, 0, Math.PI * 2);
    fog.fill();
  };
  for (const d of round.discs) {
    if (d.kind === 'striker') hole(d.x, d.y, FOG_REVEAL_STRIKER);
    else if (d.flash > 0.05) hole(d.x, d.y, FOG_REVEAL_FLASH);
  }
  fog.globalCompositeOperation = 'source-over';
  paint.ctx.drawImage(fog.canvas, 0, 0, W, H);
}

function drawWeather(paint: Paint, round: Round): void {
  const { ctx, color } = paint, { weather, fx } = round;
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.75;
  for (const f of fx.flakes) { circle(ctx, f.x, f.y, f.r); ctx.fill(); }
  ctx.fillStyle = color('lava-hot');
  ctx.globalAlpha = 0.7;
  for (const e of fx.embers) { circle(ctx, e.x, e.y, e.r); ctx.fill(); }
  ctx.globalAlpha = 1;
  const ink = color(round.theme.ink);
  if (weather?.wind) {
    const gx = W - 34, gy = 34;
    ctx.fillStyle = color('night');
    ctx.globalAlpha = 0.55;
    circle(ctx, gx, gy, 20);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(Math.atan2(weather.wind.y, weather.wind.x));
    ctx.strokeStyle = color('frost');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, 0); ctx.lineTo(11, 0);
    ctx.moveTo(4, -6); ctx.lineTo(11, 0); ctx.lineTo(4, 6);
    ctx.stroke();
    ctx.restore();
    label(paint, weather.name.toUpperCase(), gx, gy + 32, 9, ink, 'center');
  }
  if (weather?.id === 'snow' && round.frPenalty > 0) {
    label(paint, `STICKY ICE +${Math.round(round.frPenalty / 0.002)}`, W - 12, 22, 10, ink, 'right', 0.7);
  }
}

function drawAim(paint: Paint, game: Game, view: FrameView): void {
  const { ctx, color } = paint, { round, run } = game, ink = color(round.theme.ink);
  const card = round.hand[round.used];
  if (round.phase !== 'aim' || !card) return;
  const ghost = createStriker(card, 0, 0, { id: 0, mods: run.mods, rot: 0 });
  const { aimX, held } = view.pointer;
  if (!held) {
    drawDisc(paint, round, ghost, aimX, LAUNCH_Y);
    label(paint, `${strikerName(card)}  ·  flick ↑, swipe in a curve to curl`, clamp(aimX, 140, W - 140), LAUNCH_Y - ghost.r - 10, 12, ink, 'center', 0.65);
    return;
  }
  const { trail, x, y } = held, curl = curlOf(trail);
  ctx.strokeStyle = curl ? color('gold') : color('paddle');
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  trail.forEach((p, i) => (i ? ctx.lineTo(clampAimX(p.x), clampAimY(p.y)) : ctx.moveTo(clampAimX(p.x), clampAimY(p.y))));
  ctx.stroke();
  ctx.globalAlpha = 1;
  drawDisc(paint, round, ghost, x, y);
  ctx.strokeStyle = color('gold');
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  circle(ctx, x, y, ghost.r + 5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const power = liveSpeed(trail, view.gain) / MAXV;
  drawPower(paint, power, isInPerfectBand(power), ink);
  if (curl) {
    ctx.textAlign = 'center';
    outlined(paint, `curl ${curl > 0 ? '→' : '←'} ${Math.round(Math.abs(curl) * 100)}%`, x, y - ghost.r - 14, 15, color('gold'));
  }
}

function drawRollingControls(paint: Paint, game: Game, pointer: PointerView): void {
  const { ctx, color } = paint, { round, run } = game, shot = round.shot, ink = color(round.theme.ink);
  if (!shot || shot.striker.dead) return;
  const a = shot.striker;
  if (pointer.touching && shot.sweepLeft > 0) {
    ctx.strokeStyle = shot.sweeping ? color('gold') : ink;
    ctx.globalAlpha = shot.sweeping ? 0.8 : 0.3;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    circle(ctx, a.x, a.y, SWEEP_RADIUS);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (shot.sweeping) {
    ctx.strokeStyle = color('gold');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(a.x + i * 8 - 6, a.y - a.r - 14);
      ctx.lineTo(a.x + i * 8 + 6, a.y - a.r - 6);
      ctx.stroke();
    }
  }
  const ability = abilityOf(a.type).name;
  const tapHint = shot.taps > 0 ? `Tap: ${ability}${shot.taps > 1 ? ` ×${shot.taps}` : ''}` : 'Ability used';
  const nudgeHint = shot.nudges > 0 ? 'Swipe: nudge' : 'Nudge used';
  label(paint, `${tapHint}  ·  Hold near: sweep  ·  ${nudgeHint}`, W / 2, ZONE_TOP + 30, 12, ink, 'center', 0.7);

  const n = round.fx.nudge;
  if (n) {
    const k = nudgeProgress(n.t), o = 20 + n.t * 60;
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.a);
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = color('rare');
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(o, 0); ctx.lineTo(o + 22, 0);
    ctx.moveTo(o + 14, -8); ctx.lineTo(o + 22, 0); ctx.lineTo(o + 14, 8);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  const meter = Math.max(0, shot.sweepLeft) / sweepTicks(run.mods);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(W - 90, H - 40, 80, 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color('frost');
  ctx.fillRect(W - 90, H - 40, 80 * meter, 6);
  label(paint, 'SWEEP', W - 94, H - 34, 10, ink, 'right', 0.75);
}

function drawLastShot(paint: Paint, game: Game): void {
  const { round, run } = game, shot = round.shot, ink = paint.color(round.theme.ink);
  if (!shot?.launchSpeed) return;
  drawPower(paint, shot.launchSpeed / MAXV, shot.perfect, ink);
  if (!shot.launchSpin) return;
  const style = CURL_STYLE_LABEL[run.mods.curlStyle];
  label(paint, `${style} ${shot.launchSpin > 0 ? '→' : '←'} ${Math.round(Math.abs(shot.launchSpin) * 100)}%`, 96, H - 34, 11, ink, 'left', 0.75);
}

function drawBoom(paint: Paint, round: Round): void {
  const { ctx, color } = paint, { boom } = round.fx;
  if (boom) {
    const k = boomProgress(boom);
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = color('gold');
    ctx.lineWidth = 6 * (1 - k) + 1;
    circle(ctx, boom.x, boom.y, 20 + k * (boom.r - 15));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawPulse(paint: Paint, round: Round): void {
  const { ctx, color } = paint, { pulse } = round.fx;
  if (pulse) {
    const k = pulseProgress(pulse);
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = color('t0');
    ctx.lineWidth = 4;
    circle(ctx, pulse.x, pulse.y, pulse.r * (1 - k * 0.8));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawPaddle(paint: Paint, round: Round, pointer: PointerView): void {
  const { ctx, color } = paint, px = pointer.held ? pointer.held.x : pointer.aimX;
  ctx.fillStyle = color(round.theme.ink);
  ctx.globalAlpha = 0.18;
  ctx.fillRect(8, H - 15, W - 16, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color('paddle');
  ctx.beginPath();
  ctx.roundRect(px - 30, H - 20, 60, 12, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(px - 22, H - 18, 44, 3);
}

function drawTexts(paint: Paint, round: Round): void {
  const { ctx, color } = paint, { fx, theme } = round;
  if (round.slowK > 0.02) {
    const bh = 22 * round.slowK;
    ctx.fillStyle = color('night');
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, W, bh);
    ctx.fillRect(0, H - bh, W, bh);
    ctx.globalAlpha = 1;
    if (round.slowK > 0.6) label(paint, 'SLOW-MO', 12, bh - 7, 10, color('gold'), 'left');
  }
  const chain = round.shot?.chain ?? 0;
  if (chain > 0) {
    ctx.textAlign = 'left';
    outlined(paint, `${chain} chain`, 12, 40 + round.slowK * 14, 22 + fx.chainPulse * 10, chain >= 10 ? color('gold') : color('frost'));
  }
  ctx.textAlign = 'center';
  for (const p of fx.pops) {
    ctx.globalAlpha = Math.max(0, 1 - popProgress(p.t));
    const y0 = p.y - 18 - p.t * 40, n = p.lines.length;
    p.lines.forEach((text, i) => {
      const last = i === n - 1;
      outlined(paint, text, p.x, y0 - (n - 1 - i) * 15, last ? (p.big ? 22 : 17) : 12, last ? (p.big ? color('gold') : '#fff') : color('frost'));
    });
  }
  ctx.globalAlpha = 1;
  const banner = fx.banner;
  if (banner && banner.t > 0) {
    ctx.globalAlpha = Math.min(1, banner.t * 1.5);
    ctx.textAlign = 'center';
    ctx.font = '28px "Lilita One", sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = color(theme.floor);
    ctx.fillStyle = color(theme.ink);
    ctx.strokeText(banner.text, W / 2, ZONE_TOP - 44);
    ctx.fillText(banner.text, W / 2, ZONE_TOP - 44);
    ctx.font = '800 12px Nunito, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeText(banner.sub, W / 2, ZONE_TOP - 24);
    ctx.fillText(banner.sub, W / 2, ZONE_TOP - 24);
    if (banner.sub2) {
      ctx.fillStyle = color('t0');
      ctx.strokeText(banner.sub2, W / 2, ZONE_TOP - 8);
      ctx.fillText(banner.sub2, W / 2, ZONE_TOP - 8);
    }
    ctx.globalAlpha = 1;
  }
}

/** Draws one frame. Reads game state only; all animation timers advance in the sim tick. */
export function drawFrame(paint: Paint, fog: CanvasRenderingContext2D, game: Game, view: FrameView): void {
  const { ctx, color } = paint, { round } = game;
  ctx.save();
  if (round.fx.shake > 0) ctx.translate((view.random() - 0.5) * round.fx.shake, (view.random() - 0.5) * round.fx.shake);
  drawRink(paint, round, view.seconds);
  for (const d of round.discs) drawTrail(paint, d);
  for (const d of round.discs) drawDisc(paint, round, d);
  drawBoom(paint, round);
  for (const p of round.fx.parts) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = color(p.color);
    circle(ctx, p.x, p.y, p.size);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (round.weather?.id === 'fog') drawFog(paint, fog, round);
  drawWeather(paint, round);
  drawPaddle(paint, round, view.pointer);
  drawAim(paint, game, view);
  drawPulse(paint, round);
  drawRollingControls(paint, game, view.pointer);
  drawLastShot(paint, game);
  drawTexts(paint, round);
  ctx.restore();
}
