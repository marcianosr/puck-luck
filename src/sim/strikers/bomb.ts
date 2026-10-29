import { shake, spray } from '../effects';
import { award, freeze } from '../scoring';
import type { Game, Striker } from '../types';
import { PLAIN_LOOK, type StrikerKind } from './kind';

const FUSE_TICKS = 12;
const FUSE_SPEED = 0.7;
const blast = (up: boolean) => (up ? { radius: 170, force: 13, points: 150 } : { radius: 125, force: 10, points: 50 });

function explode(game: Game, self: Striker, { radius, force, points }: ReturnType<typeof blast>): void {
  self.dead = 'boom';
  spray(game, self.x, self.y, 36, 'gold', 4.5);
  spray(game, self.x, self.y, 18, 'frost', 3);
  shake(game, 12);
  freeze(game, 5);
  game.emit({ type: 'feel', cue: 'boom' });
  game.round.fx.boom = { x: self.x, y: self.y, t: 0, r: radius };
  for (const d of game.round.discs) {
    if (d === self) continue;
    const dx = d.x - self.x, dy = d.y - self.y, dist = Math.hypot(dx, dy) || 1;
    if (dist >= radius) continue;
    const k = force * (1 - dist / radius);
    d.vx += (dx / dist) * k;
    d.vy += (dy / dist) * k;
  }
  award(game, points, self.x, self.y, ['Boom!'], true);
}

export const bomb: StrikerKind = {
  ability: { name: 'Detonate', desc: 'Explodes right now.' },
  describe: up =>
    up ? `Bigger blast, worth ${blast(up).points}.` : `Explodes when it slows down, blasting everything nearby. Worth ${blast(up).points}.`,
  nums: up => [`Blast radius <b>${blast(up).radius}</b>`, `Blast <b>+${blast(up).points}</b>`],
  behave: up => {
    let armed = true;
    const detonate = (game: Game, self: Striker) => {
      armed = false;
      explode(game, self, blast(up));
    };
    return {
      onTick: (game, self, speed) => {
        if (armed && self.age > FUSE_TICKS && speed < FUSE_SPEED) detonate(game, self);
      },
      ability: (game, self) => {
        if (!armed) return false;
        detonate(game, self);
        return true;
      },
      look: self => ({ ...PLAIN_LOOK, fuseLit: armed && self.launched }),
    };
  },
};
