# Puck Luck — domain glossary

**Run** — one playthrough from kit pick to missed quota. Owns coins, tokens, deck, perks, modifiers and run stats.

**Round** — one rink with a quota, a hand of strikers and contracts. Cleared when the score reaches the quota after the last shot.

**Shot** — one striker from launch until everything stops rolling.

**Chain** — the running count of scoring contacts within a shot. Each contact is a **chain link**, whatever caused it: target hit, striker clash, bumper or live boards. Every chain link raises the chain, scores the current chain value and counts toward the longest chain. Every 10th link freezes the frame and shakes the screen.
_Avoid_: combo, streak.

**Contract** — an optional per-round goal that pays coins (and sometimes a token) when done. Either counts occurrences (sinks, clashes) or tracks a record (longest chain, best shot).

**Play log** — the sim's record of what happened during play (a sink, a chain link, a clash, a perfect release…). The single input for both contract progress and run stats. Sim-internal; the UI only sees coarse events.
_Avoid_: event bus, facts (in code, use the play log's own type names).

**Flick** — what the finger did at release: raw speed, direction and spin. Turned into a shot by launching.
_Avoid_: "shot" for the gesture reading.

**Striker** — a disc the player launches. Each striker type (Basic, Heavy, Splitter, Magnet, Ghost, Bomb, Comet, Prism, and Shard, which only a Splitter spawns) is one module that owns its numbers, description, tap ability, behaviour hooks and private state. An upgraded card (`heavy+`) is the same type with its upgraded numbers.

**Look** — the render hints a striker module exposes (aura radius, blinking, translucent). Render draws looks, never checks striker types.

**Run phase** — where the run is: kit pick → playing → shop → over. Owned by the sim; the UI only shows it.

**Settle** — paying out a cleared round (round bonus, carry-over) as it ends, before the shop opens.
