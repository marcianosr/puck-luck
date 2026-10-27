import { speedOf } from '@/lib/math';
import { pop, spray } from '../effects';
import type { StrikerKind } from './kind';

const SHARD_SCALE = 0.72;
const MIN_BURST_SPEED = 5;
const SHARD_SPEED = 0.9;
const shardAngles = (up: boolean) => (up ? [-0.6, 0, 0.6] : [-0.5, 0.5]);
const COUNT_WORDS = ['zero', 'one', 'two', 'three'];

export const splitter: StrikerKind = {
  ability: { name: 'Split', desc: 'Splits right now instead of on its first hit.' },
  describe: up => `Breaks into ${COUNT_WORDS[shardAngles(up).length] ?? shardAngles(up).length} shards on its first hit.`,
  behave: up => ({
    onBounce: self => {
      if (!self.dead) self.dead = 'split';
    },
    burst: (game, self, spawnShard) => {
      const speed = Math.max(speedOf(self), MIN_BURST_SPEED), heading = Math.atan2(self.vy, self.vx);
      const shards = shardAngles(up).map(offset => {
        const a = heading + offset, side = Math.sign(offset);
        const shard = spawnShard(self.x + Math.cos(a + side * 1.2) * self.r * 0.5, self.y + Math.sin(a + side * 1.2) * self.r * 0.5, SHARD_SCALE);
        shard.vx = Math.cos(a) * speed * SHARD_SPEED;
        shard.vy = Math.sin(a) * speed * SHARD_SPEED;
        return shard;
      });
      spray(game, self.x, self.y, 12, 'striker', 2.5);
      pop(game, self.x, self.y - 10, ['Split!']);
      return shards;
    },
    ability: (_, self) => {
      self.dead = 'split';
      return true;
    },
  }),
};
