import type { Theme } from './themes';

export type WeatherId = 'snow' | 'thaw' | 'wind' | 'blizzard' | 'fog';

interface WeatherDef {
  isPossibleIn: (theme: Theme) => boolean;
  nameIn: (theme: Theme) => string;
  descIn: (theme: Theme) => string;
}

export const WEATHER = {
  snow: {
    isPossibleIn: t => !!t.icy && !t.indoor,
    nameIn: () => 'Snowfall',
    descIn: () => 'Ice gets stickier after every shot.',
  },
  thaw: {
    isPossibleIn: t => !!t.icy || t.patch === 'SAND',
    nameIn: t => (t.patch === 'SAND' ? 'Drifting Sand' : 'Thaw'),
    descIn: t => (t.patch === 'SAND' ? 'Sand patches grow after every shot.' : 'Slush patches grow after every shot.'),
  },
  wind: {
    isPossibleIn: () => true,
    nameIn: t => (t.indoor ? 'Air Vents' : 'Gusts'),
    descIn: t => (t.indoor ? 'Vents push moving discs one way.' : 'A steady wind pushes moving discs.'),
  },
  blizzard: {
    isPossibleIn: t => !t.indoor,
    nameIn: () => 'Blizzard',
    descIn: () => 'Wind changes direction after every shot.',
  },
  fog: {
    isPossibleIn: () => true,
    nameIn: t => (t.decor === 'lava' ? 'Smoke' : 'Fog'),
    descIn: () => 'Targets stay hidden until a striker gets close.',
  },
} as const satisfies Record<WeatherId, WeatherDef>;

export const WEATHER_IDS = Object.keys(WEATHER).filter(isWeatherId);

function isWeatherId(id: string): id is WeatherId {
  return id in WEATHER;
}

export const WEATHER_CHANCE = 0.55;
export const WEATHER_CLEAR_COINS = 2;
