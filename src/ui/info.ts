import { PERFECT_BAND } from '@/data/constants';
import { isPerkId, perkById } from '@/data/perks';
import { ABILITY, baseOf, isCard, isUpgraded, STRIKERS, strikerName, type Card } from '@/data/strikers';
import { WEATHER_CLEAR_COINS } from '@/data/weather';
import { contractCoins } from '@/sim/contracts';
import type { Game } from '@/sim/types';
import { $ } from './dom';

const AUTO_HIDE_MS = 7000;

interface InfoCard {
  title: string;
  tag: string;
  body: string;
  nums: string[];
}

const percent = (n: number) => Math.round(n * 100);

function curlShotLine(game: Game): string {
  return `Curl Shot: <b>×${game.run.mods.curlShotMult}</b> on every hit while your striker still spins`;
}

function perkInfo(game: Game, id: string): InfoCard | null {
  if (!isPerkId(id)) return null;
  const p = perkById(id);
  const nums = [...p.nums];
  if (p.group === 'curl' || id === 'curl') nums.push(curlShotLine(game));
  return { title: p.name, tag: `${p.rarity} perk${p.group ? ' · curl style (one at a time)' : ''}`, body: p.desc, nums };
}

function strikerInfo(game: Game, card: Card): InfoCard {
  const id = baseOf(card), s = STRIKERS[id], ability = ABILITY[id], up = isUpgraded(card), mods = game.run.mods;
  const nums = [
    `Tap while rolling: <b>${ability.name}</b>. ${ability.desc}`,
    'Swipe while rolling: <b>Nudge</b> once per shot',
    `Perfect release (gold band, <b>${percent(PERFECT_BAND.min)}–${percent(PERFECT_BAND.max)}%</b> power): first hit <b>×1.5</b>`,
  ];
  if (id === 'basic' && up) nums.push('Bend <b>×1.8</b>', curlShotLine(game));
  if (id === 'heavy') nums.push(`Mass <b>×${up ? 3.5 : 2.5}</b>`);
  if (id === 'comet') nums.push(`Every hit <b>×${up ? 3 : 2}</b>`);
  if (id === 'prism') nums.push(`Every <b>${up ? 4 : 5}th</b> hit is a <b>×${mods.clashMult}</b> clash`);
  if (!up) nums.push(`Upgrades to <b>${s.up}</b>: ${s.upDesc}`);
  return { title: strikerName(card), tag: `${s.rarity} striker${up ? ' · upgraded' : ''}`, body: up ? `${s.desc} Upgrade: ${s.upDesc}` : s.desc, nums };
}

function contractInfo(game: Game, index: number): InfoCard | null {
  const c = game.round.contracts[index];
  if (!c) return null;
  const nums = [`Reward: <b>${contractCoins(c.def, game.run.mods.contractBonusCoins)}</b> coins${c.def.token ? ' and <b>1</b> upgrade token' : ''}`];
  if (!c.def.tracksRecord) nums.push(`Progress: <b>${Math.min(c.prog, c.goal)}/${c.goal}</b>`);
  return { title: c.def.text(c.goal), tag: c.done ? 'contract · done' : 'contract', body: 'Optional goal for this round.', nums };
}

function weatherInfo(game: Game): InfoCard | null {
  const w = game.round.weather;
  if (!w) return null;
  const nums = [`Clearing a weather round pays <b>+${WEATHER_CLEAR_COINS}</b> coins`];
  if (game.run.mods.weatherHitMult > 1) nums.push(`Storm Chaser: every hit <b>×${game.run.mods.weatherHitMult}</b>`);
  if (w.id === 'snow') nums.push(`Stickiness now: <b>+${Math.round(game.round.frPenalty / 0.002)}</b>`);
  return { title: w.name, tag: 'weather', body: w.desc, nums };
}

/** Resolves a `data-k` key like `perk:fever`, `striker:heavy+`, `contract:1` or `weather`. */
export function infoFor(game: Game, key: string): InfoCard | null {
  const [kind = '', id = ''] = key.split(':');
  switch (kind) {
    case 'perk': return perkInfo(game, id);
    case 'striker': return isCard(id) ? strikerInfo(game, id) : null;
    case 'contract': return contractInfo(game, Number(id));
    case 'weather': return weatherInfo(game);
    default: return null;
  }
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export const isInfoOpen = (): boolean => !$('info').hidden;

export function hideInfo(): void {
  $('info').hidden = true;
  clearTimeout(hideTimer);
}

export function showInfo(game: Game, key: string): void {
  const card = infoFor(game, key);
  if (!card) return;
  $('infoTitle').textContent = card.title;
  $('infoTag').textContent = card.tag;
  $('infoBody').textContent = card.body;
  $('infoNums').innerHTML = card.nums.map(n => `<li>${n}</li>`).join('');
  $('info').hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideInfo, AUTO_HIDE_MS);
}
