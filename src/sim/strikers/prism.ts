import { BRAKE, type StrikerKind } from './kind';

const every = (up: boolean) => (up ? 4 : 5);

export const prism: StrikerKind = {
  ability: BRAKE,
  describe: (up, mods) => `Every ${every(up)}th hit of its shot counts as a ×${mods.clashMult} clash.`,
  nums: (up, mods) => [`Every <b>${every(up)}th</b> hit is a <b>×${mods.clashMult}</b> clash`],
  build: up => ({ clashEvery: every(up) }),
};
