import type { PerkId } from './perks';
import type { Card } from './strikers';

export interface Kit {
  id: string;
  name: string;
  desc: string;
  deck: readonly Card[];
  coins: number;
  perks?: readonly PerkId[];
  quotaMul?: number;
  handDelta?: number;
}

export const KITS: readonly Kit[] = [
  { id: 'classic', name: 'Classic', desc: 'Balanced. 5 Basic, 1 Heavy, 4 coins.', deck: ['basic', 'basic', 'basic', 'basic', 'basic', 'heavy'], coins: 4 },
  { id: 'bruiser', name: 'Bruiser', desc: '4 Basic, a Heavy and a Wrecker that smashes armor. 2 coins.', deck: ['basic', 'basic', 'basic', 'basic', 'heavy', 'heavy+'], coins: 2 },
  { id: 'trickster', name: 'Trickster', desc: '4 Hooks and a Ghost, with the Late Break curl style. 4 coins.', deck: ['basic+', 'basic+', 'basic+', 'basic+', 'ghost'], coins: 4, perks: ['late'] },
  { id: 'demo', name: 'Demolition', desc: '3 Basic, a Heavy and 2 Bombs. 4 coins.', deck: ['basic', 'basic', 'basic', 'heavy', 'bomb', 'bomb'], coins: 4 },
  { id: 'gambler', name: 'Gambler', desc: '6 Basic, 12 coins and Piggy Bank, but every quota is 10% higher.', deck: ['basic', 'basic', 'basic', 'basic', 'basic', 'basic'], coins: 12, perks: ['piggy'], quotaMul: 1.1 },
  { id: 'shatter', name: 'Shatter', desc: '4 Basic and 2 Splitters that break into shards on their first hit. 3 coins.', deck: ['basic', 'basic', 'basic', 'basic', 'splitter', 'splitter'], coins: 3 },
  { id: 'lodestone', name: 'Lodestone', desc: '4 Basic and 2 Magnets that pull targets together. 2 coins.', deck: ['basic', 'basic', 'basic', 'basic', 'magnet', 'magnet'], coins: 2 },
  { id: 'starlight', name: 'Starlight', desc: '3 Basic, a Comet and a Prism, but no coins.', deck: ['basic', 'basic', 'basic', 'comet', 'prism'], coins: 0 },
];

export const DEFAULT_KIT: Kit = KITS[0] ?? { id: 'empty', name: 'Empty', desc: '', deck: ['basic'], coins: 0 };
