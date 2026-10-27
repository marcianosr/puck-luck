import { BUMPER_R, H, POCKET_R, R, W, ZONE_TOP } from '@/data/constants';
import { FORMATION_NAMES, FORMATIONS, scatter } from '@/data/formations';
import type { TargetColor } from '@/data/palette';
import type { Modifiers } from '@/data/perks';
import { baseOf, isUpgraded, type Card } from '@/data/strikers';
import { WEATHER, WEATHER_CHANCE, WEATHER_IDS } from '@/data/weather';
import { formatNumber } from '@/lib/math';
import { between, pick, shuffle, type Rng } from '@/lib/rng';
import { layoutOf, rollContracts } from './contracts';
import { behaviourOf, buildOf } from './strikers';
import { emptyEffects } from './effects';
import { actIndex, drawHand, quotaFor, themeFor } from './run';
import type { ActiveWeather, Game, GameCore, Point, Round, Striker, Target, Zone } from './types';

const LOOP_ROUNDS = 18;
const FULL_TURN = Math.PI * 2;

const toTargetColor = (n: number): TargetColor => (n === 1 ? 1 : n === 2 ? 2 : 0);

export function createTarget(id: number, x: number, y: number, rng: Rng): Target {
  return {
    id, x, y, vx: 0, vy: 0, r: R, m: R * R, kind: 'target', color: toTargetColor(Math.floor(rng() * 3)),
    spin: 0, rot: rng() * FULL_TURN, flash: 0, squash: 0, trail: [], hp: 1, maxHp: 1, age: 0,
    dead: null, pocket: null, launched: false, gold: false, touched: false,
  };
}

interface StrikerOptions {
  id: number;
  mods: Modifiers;
  rot: number;
  scale?: number;
}

export function createStriker(card: Card | 'shard', x: number, y: number, { id, mods, rot, scale = 1 }: StrikerOptions): Striker {
  const type = card === 'shard' ? 'shard' : baseOf(card);
  const up = card !== 'shard' && isUpgraded(card);
  const build = buildOf(type, up);
  const r = R * mods.strikerScale * scale * build.radiusMult;
  return {
    id, x, y, vx: 0, vy: 0, r, m: r * r * build.massMult, kind: 'striker', type, up,
    spin: 0, rot, flash: 0, squash: 0, trail: [], age: 0, banked: false, dead: null, pocket: null, launched: false,
    build, behaviour: behaviourOf(type, up),
  };
}

export function spawnStriker(game: GameCore, card: Card | 'shard', x: number, y: number, scale = 1): Striker {
  return createStriker(card, x, y, { id: ++game.nextId, mods: game.run.mods, rot: game.fxRng() * FULL_TURN, scale });
}

function placeZones(rng: Rng, existing: () => Zone[]) {
  return (n: number, r: number, list: Zone[], ymin: number, ymax: number, gap = 18): void => {
    let tries = 0;
    const goal = list.length + n;
    while (list.length < goal && tries++ < 600) {
      const x = between(rng, r + 20, W - r - 20), y = between(rng, ymin, ymax);
      if (existing().every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + gap)) list.push({ x, y, r, flash: 0 });
    }
  };
}

function rollWeather(game: GameCore, round: Round, place: ReturnType<typeof placeZones>): ActiveWeather | null {
  const { rng, run } = game;
  if (run.round <= 1 || rng() >= WEATHER_CHANCE) return null;
  const id = pick(rng, WEATHER_IDS.filter(w => WEATHER[w].isPossibleIn(round.theme)));
  const def = WEATHER[id];
  let wind: Point | null = null;
  if (id === 'wind' || id === 'blizzard') {
    const a = between(rng, 0, FULL_TURN);
    wind = { x: Math.cos(a), y: Math.sin(a) };
  }
  if (id === 'thaw' && !round.patches.length) place(1, 40, round.patches, 140, ZONE_TOP - 80);
  return { id, name: def.nameIn(round.theme), desc: def.descIn(round.theme), wind };
}

function pickFormation(rng: Rng, last: string): string {
  let name: string;
  do name = pick(rng, FORMATION_NAMES);
  while (name === last);
  return name;
}

function blankRound(game: GameCore): Round {
  const { run } = game, theme = themeFor(run, run.round), quota = quotaFor(run.round, run.kit);
  return {
    theme, formation: '', discs: [], pockets: [], bumpers: [], patches: [], wells: [], weather: null,
    hand: [], used: 0, score: run.carry, quota, quotaHit: run.carry >= quota,
    phase: 'aim', shot: null, freeze: 0, slowK: 0, frPenalty: 0,
    targetTotal: 0, touched: 0, fullClear: false, windUsed: false, sunkCoins: 0,
    contracts: [], fx: emptyEffects(),
  };
}

/** Builds the round for `game.run.round`. Consumes gameplay randomness and resets the carried-over score. */
export function buildRound(game: GameCore): Round {
  const { rng, run } = game;
  const round = blankRound(game);
  const { theme } = round, act = actIndex(run.round);
  round.formation = pickFormation(rng, run.lastFormation);
  run.lastFormation = round.formation;

  const place = placeZones(rng, () => [...round.pockets, ...round.bumpers, ...round.patches, ...round.wells]);
  place(theme.pockets, theme.pocketR ?? POCKET_R, round.pockets, 50, ZONE_TOP - 60);
  place(theme.bumpers, BUMPER_R, round.bumpers, 90, ZONE_TOP - 70);
  place(theme.patches, 50, round.patches, 120, ZONE_TOP - 60);
  place(theme.wells, 26, round.wells, 140, ZONE_TOP - 120, 60);
  round.weather = rollWeather(game, round, place);

  const blockers = [...round.pockets, ...round.bumpers, ...round.wells];
  const formation = FORMATIONS[round.formation];
  const points = (formation ? formation(rng) : []).filter(p => blockers.every(b => Math.hypot(b.x - p.x, b.y - p.y) > b.r + R + 4));
  if (run.mods.extraTargets) scatter(rng, points, run.mods.extraTargets, blockers);
  const targets = points.map(p => createTarget(++game.nextId, p.x, p.y, rng));

  const shuffled = shuffle(rng, targets);
  const loop = Math.floor((run.round - 1) / LOOP_ROUNDS);
  const armored = act === 0 ? 0 : Math.min(targets.length - 4, 1 + act + loop * 2);
  shuffled.slice(0, armored).forEach(t => { t.hp = t.maxHp = 2; });
  shuffled.slice(armored, armored + run.mods.goldTargets).forEach(t => { t.gold = true; });

  round.discs = targets;
  round.targetTotal = targets.length;
  round.hand = drawHand(rng, run);
  round.fx.banner = {
    text: round.formation,
    sub: `${theme.name} · Round ${run.round} · Quota ${formatNumber(round.quota)}`,
    sub2: round.weather ? `Weather: ${round.weather.name}` : '',
    t: 2.6,
  };
  addAmbience(game, round);
  run.carry = 0;
  round.contracts = rollContracts(rng, run.round, layoutOf(round));
  return round;
}

export function startRound(game: Game): Round {
  game.round = buildRound(game);
  game.emit({ type: 'round' });
  return game.round;
}

function addAmbience(game: GameCore, round: Round): void {
  const { fxRng } = game, fx = round.fx;
  if (round.weather?.id === 'snow' || round.weather?.id === 'blizzard') {
    fx.flakes = Array.from({ length: 60 }, () => ({ x: between(fxRng, 0, W), y: between(fxRng, 0, H), s: between(fxRng, 0.6, 1.6), r: between(fxRng, 1, 2.4) }));
  }
  if (round.theme.decor === 'lava') {
    fx.embers = Array.from({ length: 24 }, () => ({ x: between(fxRng, 0, W), y: between(fxRng, 0, H), s: between(fxRng, 0.3, 0.9), r: between(fxRng, 1, 2.2) }));
    fx.cracks = Array.from({ length: 8 }, () => {
      const c: Point[] = [{ x: between(fxRng, 0, W), y: between(fxRng, 0, ZONE_TOP) }];
      for (let i = 0; i < 4; i++) {
        const last = c[c.length - 1] ?? { x: 0, y: 0 };
        c.push({ x: last.x + between(fxRng, -50, 50), y: last.y + between(fxRng, -50, 50) });
      }
      return c;
    });
  }
}
