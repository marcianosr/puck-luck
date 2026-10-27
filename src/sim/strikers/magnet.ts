import type { Disc } from '../types';
import type { StrikerKind } from './kind';

const MIN_PULL_SPEED = 0.5;
const PULSE_REACH = 1.6;
const PULSE_STRENGTH = 4.5;
const pull = (up: boolean) => (up ? { radius: 160, strength: 0.22 } : { radius: 100, strength: 0.14 });

/** Accelerates every target within `radius` towards `from`, harder the closer it is. */
function drawTargetsIn(discs: readonly Disc[], from: Disc, radius: number, strength: number, minDist: (t: Disc) => number): void {
  for (const t of discs) {
    if (t.kind !== 'target') continue;
    const dx = from.x - t.x, dy = from.y - t.y, dist = Math.hypot(dx, dy);
    if (dist >= radius || dist <= minDist(t)) continue;
    const a = strength * (1 - dist / radius);
    t.vx += (dx / dist) * a;
    t.vy += (dy / dist) * a;
  }
}

export const magnet: StrikerKind = {
  ability: { name: 'Pulse', desc: 'One strong pull on every target nearby.' },
  describe: up => (up ? 'Pulls from further, and harder.' : 'Pulls nearby targets in while it slides.'),
  nums: up => [`Pull reach <b>${pull(up).radius}</b>`],
  behave: up => {
    const { radius, strength } = pull(up);
    return {
      onSubstep: (game, self, f, speed) => {
        if (speed > MIN_PULL_SPEED) drawTargetsIn(game.round.discs, self, radius, strength * f, t => self.r + t.r);
      },
      ability: (game, self) => {
        const reach = radius * PULSE_REACH;
        drawTargetsIn(game.round.discs, self, reach, PULSE_STRENGTH, () => 1);
        game.round.fx.pulse = { x: self.x, y: self.y, t: 0, r: reach };
        return true;
      },
    };
  },
};
