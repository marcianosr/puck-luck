import { BRAKE, type StrikerKind } from './kind';

const HOOK_BEND = 1.8;

export const basic: StrikerKind = {
  ability: BRAKE,
  describe: up => (up ? `Curl bends ${Math.round((HOOK_BEND - 1) * 100)}% harder.` : 'A plain striker.'),
  nums: up => (up ? [`Bend <b>×${HOOK_BEND}</b>`] : []),
  build: up => ({ curlMult: up ? HOOK_BEND : 1 }),
};

export const shard: StrikerKind = {
  ability: BRAKE,
  describe: () => 'A shard broken off a Splitter.',
};
