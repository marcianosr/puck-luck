import { hit } from '../scoring';
import { PLAIN_LOOK, BRAKE, type StrikerKind } from './kind';

const PHASE_FORCE = 4;
const phases = (up: boolean) => (up ? 4 : 2);

export const ghost: StrikerKind = {
  ability: BRAKE,
  describe: up => `Phases through the first ${phases(up)} targets it touches, scoring each.`,
  nums: up => [`Phases <b>${phases(up)}</b>`],
  behave: up => {
    let phasesLeft = phases(up);
    const through = new Set<number>();
    return {
      passesThrough: (game, self, other, overlapping) => {
        if (!overlapping) {
          through.delete(other.id);
          return false;
        }
        if (through.has(other.id)) return true;
        if (phasesLeft <= 0 || other.kind !== 'target') return false;
        through.add(other.id);
        phasesLeft--;
        hit(game, self, other, other.x, other.y, PHASE_FORCE, ['Phase']);
        return true;
      },
      look: self => ({ ...PLAIN_LOOK, translucent: phasesLeft > 0 || !self.launched }),
    };
  },
};
