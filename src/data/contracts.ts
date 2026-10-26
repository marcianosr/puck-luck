import { formatNumber } from '@/lib/math';

export type ContractId = 'sink' | 'chain' | 'clash' | 'bank' | 'curl' | 'shatter' | 'bumper' | 'shot' | 'perfect' | 'full';

/** What a contract needs to know about the round it is rolled for. */
export interface RinkLayout {
  pockets: number;
  bumpers: number;
  armored: number;
  quota: number;
}

export interface ContractDef {
  id: ContractId;
  text: (goal: number) => string;
  goal: (act: number, rink: RinkLayout) => number;
  coins: number;
  token?: number;
  /** Best-of contracts track a record (longest chain, best shot) rather than a count. */
  tracksRecord?: boolean;
  isPossibleOn?: (rink: RinkLayout) => boolean;
}

export const CONTRACTS: readonly ContractDef[] = [
  { id: 'sink', text: g => `Sink ${g} target${g > 1 ? 's' : ''}`, goal: a => 1 + (a > 0 ? 1 : 0), coins: 3, isPossibleOn: r => r.pockets > 0 },
  { id: 'chain', text: g => `Land a ${g}-chain`, goal: a => 7 + a * 2, coins: 1, token: 1, tracksRecord: true },
  { id: 'clash', text: g => `${g} striker clash${g > 1 ? 'es' : ''}`, goal: a => 1 + (a >= 2 ? 1 : 0), coins: 3 },
  { id: 'bank', text: g => `${g} Bank Shots`, goal: () => 3, coins: 3 },
  { id: 'curl', text: g => `${g} Curl Shots`, goal: () => 3, coins: 3 },
  { id: 'shatter', text: g => `Shatter ${g} armored`, goal: () => 3, coins: 1, token: 1, isPossibleOn: r => r.armored >= 3 },
  { id: 'bumper', text: g => `Hit bumpers ${g} times`, goal: () => 5, coins: 2, isPossibleOn: r => r.bumpers > 0 },
  { id: 'shot', text: g => `Score ${formatNumber(g)} in one shot`, goal: (_, r) => Math.round((r.quota * 0.35) / 50) * 50, coins: 1, token: 1, tracksRecord: true },
  { id: 'perfect', text: g => `${g} Perfect releases`, goal: () => 2, coins: 3 },
  { id: 'full', text: () => 'Full Clear', goal: () => 1, coins: 3, token: 1, tracksRecord: true },
];

export const CONTRACTS_PER_ROUND = 2;
