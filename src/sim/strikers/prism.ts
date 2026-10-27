import type { Modifiers } from '@/data/perks';
import { BRAKE, type StrikerKind } from './kind';

const CLASH_EVERY = 5;
const prismMult = (up: boolean) => (up ? 1.5 : 1);
const clashMultOf = (up: boolean, mods: Modifiers) => Math.round(mods.clashMult * prismMult(up));

export const prism: StrikerKind = {
  ability: BRAKE,
  describe: (up, mods) => `Every ${CLASH_EVERY}th hit of its shot counts as a ×${clashMultOf(up, mods)} clash.`,
  nums: (up, mods) => [`Every <b>${CLASH_EVERY}th</b> hit is a <b>×${clashMultOf(up, mods)}</b> clash`],
  build: up => ({ clashEvery: CLASH_EVERY, prismMult: prismMult(up) }),
};
