import { BRAKE, type StrikerKind } from './kind';

const mult = (up: boolean) => (up ? 3 : 2);

export const comet: StrikerKind = {
  ability: BRAKE,
  describe: up => `Every hit during its shot is worth ×${mult(up)}.`,
  nums: up => [`Every hit <b>×${mult(up)}</b>`],
  build: up => ({ chainMult: mult(up) }),
};
