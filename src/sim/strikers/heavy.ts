import { speedOf } from '@/lib/math';
import { shake, spray } from '../effects';
import type { Game, Striker } from '../types';
import type { StrikerKind } from './kind';

const RADIUS = 1.12;
const MIN_ANCHOR_SPEED = 0.1;
const mass = (up: boolean) => (up ? 3.5 : 2.5);

function anchor(game: Game, self: Striker): boolean {
  if (speedOf(self) < MIN_ANCHOR_SPEED) return false;
  self.vx = self.vy = 0;
  self.spin = 0;
  spray(game, self.x, self.y, 16, 'frost', 2.5);
  shake(game, 4);
  return true;
}

export const heavy: StrikerKind = {
  ability: { name: 'Anchor', desc: 'Stops dead on the spot.' },
  describe: up => (up ? `${mass(up)}× mass, shatters armor in one hit.` : `${mass(up)}× mass. Plows through packs.`),
  nums: up => [`Mass <b>×${mass(up)}</b>`],
  build: up => ({ radiusMult: RADIUS, massMult: mass(up), breaker: up }),
  behave: () => ({ ability: anchor }),
};
