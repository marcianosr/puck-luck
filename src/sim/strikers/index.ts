import type { Modifiers } from '@/data/perks';
import type { StrikerType } from '@/data/strikers';
import type { StrikerBehaviour, StrikerBuild } from '../types';
import { basic, shard } from './basic';
import { bomb } from './bomb';
import { comet } from './comet';
import { ghost } from './ghost';
import { heavy } from './heavy';
import { PLAIN_BEHAVIOUR, PLAIN_BUILD, type AbilityText, type StrikerKind } from './kind';
import { magnet } from './magnet';
import { prism } from './prism';
import { splitter } from './splitter';

const KINDS: Record<StrikerType, StrikerKind> = { basic, heavy, splitter, magnet, ghost, bomb, comet, prism, shard };

export const buildOf = (type: StrikerType, up: boolean): StrikerBuild => ({ ...PLAIN_BUILD, ...KINDS[type].build?.(up) });

export const behaviourOf = (type: StrikerType, up: boolean): StrikerBehaviour => ({ ...PLAIN_BEHAVIOUR, ...KINDS[type].behave?.(up) });

export const abilityOf = (type: StrikerType): AbilityText => KINDS[type].ability;

export const describeStriker = (type: StrikerType, up: boolean, mods: Modifiers): string => KINDS[type].describe(up, mods);

export const strikerNums = (type: StrikerType, up: boolean, mods: Modifiers): string[] => KINDS[type].nums?.(up, mods) ?? [];
