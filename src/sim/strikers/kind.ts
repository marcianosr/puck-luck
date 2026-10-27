import type { Modifiers } from '@/data/perks';
import { speedOf } from '@/lib/math';
import { spray } from '../effects';
import type { Game, Look, Striker, StrikerBehaviour, StrikerBuild } from '../types';

export interface AbilityText {
  name: string;
  desc: string;
}

/**
 * Everything one striker type is. Text is written from the same numbers the behaviour uses,
 * so the shop and info cards can't drift from what the striker does.
 */
export interface StrikerKind {
  ability: AbilityText;
  /** What the card does at this level. `mods` are the run's current (grown) modifiers. */
  describe: (up: boolean, mods: Modifiers) => string;
  /** Extra numbers for the info card. */
  nums?: (up: boolean, mods: Modifiers) => string[];
  build?: (up: boolean) => Partial<StrikerBuild>;
  /** Creates fresh hooks for one striker; anything left out falls back to a plain striker. */
  behave?: (up: boolean) => Partial<StrikerBehaviour>;
}

export const PLAIN_BUILD: StrikerBuild = { radiusMult: 1, massMult: 1, curlMult: 1, breaker: false, chainMult: 1, clashEvery: 0 };

export const PLAIN_LOOK: Look = { translucent: false, fuseLit: false };

const BRAKE_FACTOR = 0.4;
const MIN_BRAKE_SPEED = 0.3;

export const BRAKE: AbilityText = { name: 'Brake', desc: `Cuts its speed by ${Math.round((1 - BRAKE_FACTOR) * 100)}%.` };

function brake(game: Game, self: Striker): boolean {
  if (speedOf(self) < MIN_BRAKE_SPEED) return false;
  self.vx *= BRAKE_FACTOR;
  self.vy *= BRAKE_FACTOR;
  spray(game, self.x, self.y, 10, 'frost', 2);
  return true;
}

export const PLAIN_BEHAVIOUR: StrikerBehaviour = { ability: brake, look: () => PLAIN_LOOK };
