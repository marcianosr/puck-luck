import { PERKS } from '@/data/perks';
import { baseOf, isUpgraded, strikerName } from '@/data/strikers';
import { formatNumber } from '@/lib/math';
import { contractCoins } from '@/sim/contracts';
import type { Game } from '@/sim/types';
import { $ } from './dom';

export const coinHtml = '<span class="coin"></span>';
export const tokenHtml = '<span class="token"></span>';

export function renderHand({ round }: Game): void {
  $('hand').innerHTML = round.hand.map((card, i) => {
    const classes = ['sd', 'tapk', isUpgraded(card) && 'up', i < round.used && 'used', i === round.used && round.phase !== 'done' && 'next'].filter(Boolean).join(' ');
    return `<span class="${classes}" data-t="${baseOf(card)}" title="${strikerName(card)}" tabindex="0" role="button" data-k="striker:${card}"></span>`;
  }).join('');
}

export function renderScore({ round }: Game, bump: boolean, reduceMotion: boolean): void {
  const el = $('score');
  el.textContent = formatNumber(round.score);
  if (bump && !reduceMotion) {
    el.classList.remove('bump');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('bump');
  }
  const progress = Math.min(1, round.score / round.quota);
  $('progFill').style.width = `${progress * 100}%`;
  $('prog').classList.toggle('full', progress >= 1);
}

export function renderCoins({ run }: Game): void {
  $('coins').textContent = String(run.coins);
  $('tokens').textContent = String(run.tokens);
  $('tokWrap').hidden = !run.tokens;
}

export function renderPerks({ run }: Game): void {
  const owned = PERKS.filter(p => run.perks.has(p.id));
  $('perks').innerHTML = owned.length
    ? owned.map(p => `<span class="chip ${p.rarity} tapk" tabindex="0" role="button" data-k="perk:${p.id}">${p.name}</span>`).join('')
    : '<span class="chip none">No perks yet. Clear a round to visit the shop.</span>';
}

export function renderContracts({ round, run }: Game): void {
  const contracts = round.contracts.map((k, i) => {
    const reward = `${coinHtml}${contractCoins(k.def, run.mods.contractBonusCoins)}${k.def.token ? ` ${tokenHtml}1` : ''}`;
    const progress = k.def.tracksRecord ? (k.done ? 'done' : '') : `${Math.min(k.prog, k.goal)}/${k.goal}`;
    return `<span class="ct tapk${k.done ? ' done' : ''}" tabindex="0" role="button" data-k="contract:${i}">${k.def.text(k.goal)}${progress ? ` <span class="pg">${progress}</span>` : ''} ${reward}</span>`;
  }).join('');
  const weather = round.weather
    ? `<span class="chip weather tapk" tabindex="0" role="button" data-k="weather">${round.weather.name}: ${round.weather.desc}</span>`
    : '';
  $('contracts').innerHTML = contracts + weather;
}

export function renderRoundHeader({ round, run }: Game): void {
  $('round').textContent = String(run.round);
  $('quota').textContent = formatNumber(round.quota);
  $('actName').textContent = round.theme.name;
}
