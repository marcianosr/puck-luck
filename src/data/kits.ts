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
  { id: 'bruiser', name: 'Bruiser', desc: '3 Basic, 2 Heavy and a Wrecker that smashes armor. 3 coins.', deck: ['basic', 'basic', 'basic', 'heavy', 'heavy', 'heavy+'], coins: 3 },
  { id: 'trickster', name: 'Trickster', desc: '4 Hooks and a Ghost, with the Late Break curl style. 2 coins.', deck: ['basic+', 'basic+', 'basic+', 'basic+', 'ghost'], coins: 2, perks: ['late'] },
  { id: 'demo', name: 'Demolition', desc: '4 Basic and 2 Bombs. 2 coins.', deck: ['basic', 'basic', 'basic', 'basic', 'bomb', 'bomb'], coins: 2 },
  { id: 'gambler', name: 'Gambler', desc: '6 Basic, 12 coins and Piggy Bank, but every quota is 20% higher.', deck: ['basic', 'basic', 'basic', 'basic', 'basic', 'basic'], coins: 12, perks: ['piggy'], quotaMul: 1.2 },
];

export const DEFAULT_KIT: Kit = KITS[0] ?? { id: 'empty', name: 'Empty', desc: '', deck: ['basic'], coins: 0 };
