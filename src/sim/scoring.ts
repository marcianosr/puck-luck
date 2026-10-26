import { W } from "@/data/constants";
import { TARGET_COLORS } from "@/data/palette";
import type { Modifiers } from "@/data/perks";
import { formatNumber } from "@/lib/math";
import { progressContract } from "./contracts";
import { pop, shake, showBanner, spray } from "./effects";
import type { Disc, Game, Run, Striker, Target } from "./types";

const POINTS_PER_CHAIN = 10;
const GOLD_MULT = 3;
const PERFECT_MULT = 1.5;
const FULL_CLEAR_POINTS = 500;
const SHATTER_POINTS = 100;
const MIN_HIT_FORCE = 0.15;
const CURL_SHOT_MIN_SPIN = 0.15;

export interface ChainState {
	chain: number;
	shotMult: number;
	inWeather: boolean;
}

/** What the next link of a chain is worth before any hit bonuses. */
export function chainValue(
	{ chain, shotMult, inWeather }: ChainState,
	mods: Modifiers,
): number {
	const longChain = chain > mods.longChainFrom ? mods.longChainMult : 1;
	const weather = inWeather ? mods.weatherHitMult : 1;
	return Math.round(
		Math.min(chain, mods.chainCap) *
			POINTS_PER_CHAIN *
			shotMult *
			longChain *
			weather,
	);
}

export interface HitBonuses {
	clash: boolean;
	prism: boolean;
	banked: boolean;
	curled: boolean;
	gold: boolean;
	perfect: boolean;
	shotMult: number;
}

/** Applies hit bonuses in a fixed order; the rounding points match the original game. */
export function scoreHit(
	base: number,
	bonus: HitBonuses,
	mods: Modifiers,
	extraTags: readonly string[] = [],
): { points: number; tags: string[] } {
	let points = base;
	const tags = [...extraTags];
	if (bonus.prism) tags.push("Prism");
	if (bonus.clash || bonus.prism) {
		points *= mods.clashMult;
		tags.push(`Clash ×${mods.clashMult}`);
	}
	if (bonus.banked) {
		points *= mods.bankMult;
		tags.push(`Bank Shot ×${mods.bankMult}`);
	}
	if (bonus.curled) {
		points = Math.round(points * mods.curlShotMult);
		tags.push(`Curl Shot ×${mods.curlShotMult}`);
	}
	if (bonus.gold) {
		points *= GOLD_MULT;
		tags.push(`Gold ×${GOLD_MULT}`);
	}
	if (bonus.perfect) {
		points = Math.round(points * PERFECT_MULT);
		tags.push(`Perfect ×${PERFECT_MULT}`);
	}
	if (mods.scoreMult > 1) {
		points = Math.round(points * mods.scoreMult);
		tags.push(`Momentum ×${formatMult(mods.scoreMult)}`);
	}
	if (bonus.shotMult > 1)
		tags.push(bonus.shotMult > 2 ? "Supernova" : "Comet");
	return { points, tags };
}

const formatMult = (n: number): string => String(Math.round(n * 100) / 100);

/** The run stats that growth perks feed on. */
export type GrowthStats = Pick<Run, "clashes" | "round">;

/**
 * Turns owned modifiers into the ones a hit is scored with, by letting growth perks feed on run stats.
 * Growth counts the whole run, not just since the perk was bought, so a late pickup pays out at once.
 */
export function grownModifiers(mods: Modifiers, stats: GrowthStats): Modifiers {
	const roundsCleared = stats.round - 1;
	return {
		...mods,
		clashMult: mods.clashMult + mods.clashGrowth * stats.clashes,
		scoreMult: mods.scoreMult + mods.momentumGrowth * roundsCleared,
	};
}

export const currentChainValue = (game: Game): number =>
	chainValue(
		{
			chain: game.round.chain,
			shotMult: game.round.shotMult,
			inWeather: !!game.round.weather,
		},
		grownModifiers(game.run.mods, game.run),
	);

export function award(
	game: Game,
	points: number,
	x: number,
	y: number,
	tags: string[],
	big = false,
): void {
	const { round, run } = game;
	round.score += points;
	round.shotPts += points;
	run.total += points;
	game.emit({ type: "score", bump: true });
	pop(game, x, y, [...tags, `+${formatNumber(points)}`], big);
	if (round.phase === "roll")
		progressContract(game, "shot", round.shotPts, true);
	if (!round.quotaHit && round.score >= round.quota) {
		round.quotaHit = true;
		showBanner(game, {
			text: "Quota reached!",
			sub: "Everything else is bonus coins",
			t: 1.6,
		});
		game.emit({ type: "buzz", pattern: [30, 40, 30] });
	}
}

export function touchTarget(game: Game, t: Target): void {
	const { round } = game;
	if (t.touched) return;
	t.touched = true;
	round.touched++;
	if (round.fullClear || round.touched < round.targetTotal) return;
	round.fullClear = true;
	showBanner(game, {
		text: "Full Clear!",
		sub: `Every target touched: +${FULL_CLEAR_POINTS}`,
		t: 1.8,
	});
	award(game, FULL_CLEAR_POINTS, W / 2, 150, ["Full Clear!"], true);
	round.slowT = 30;
	game.emit({ type: "buzz", pattern: [40, 40, 80] });
	progressContract(game, "full");
}

export function shatterTarget(game: Game, t: Target): void {
	spray(game, t.x, t.y, 20, t.gold ? "gold" : TARGET_COLORS[t.color], 3);
	award(game, SHATTER_POINTS, t.x, t.y, ["Shatter!"]);
	progressContract(game, "shatter");
	game.emit({ type: "buzz", pattern: 25 });
}

const strikerOf = (a: Disc, b: Disc): Striker | null =>
	a.kind === "striker" ? a : b.kind === "striker" ? b : null;

/** A scoring contact between two discs during a shot. */
export function hit(
	game: Game,
	a: Disc,
	b: Disc,
	x: number,
	y: number,
	force: number,
	extraTags: string[] = [],
): void {
	const { round, run } = game;
	if (round.phase !== "roll" || force < MIN_HIT_FORCE) return;
	round.chain++;
	const striker = strikerOf(a, b);
	const clash = a.kind === "striker" && b.kind === "striker";
	const prism =
		!clash && round.prismN > 0 && round.chain % round.prismN === 0;
	const bonus: HitBonuses = {
		clash,
		prism,
		banked: !!striker?.banked,
		curled:
			!!striker?.launched && Math.abs(striker.spin) > CURL_SHOT_MIN_SPIN,
		gold:
			(a.kind === "target" && a.gold) || (b.kind === "target" && b.gold),
		perfect: round.perfectHits > 0,
		shotMult: round.shotMult,
	};
	const { points, tags } = scoreHit(
		currentChainValue(game),
		bonus,
		grownModifiers(run.mods, run),
		extraTags,
	);
	const isClash = clash || prism;
	if (isClash) {
		run.clashes++;
		progressContract(game, "clash");
	}
	if (bonus.banked && striker) {
		striker.banked = false;
		progressContract(game, "bank");
	}
	if (bonus.curled) progressContract(game, "curl");
	if (bonus.perfect) round.perfectHits--;
	award(game, points, x, y, tags, isClash);

	a.flash = b.flash = 1;
	a.squash = b.squash = Math.min(1, force / 6);
	run.maxChain = Math.max(run.maxChain, round.chain);
	progressContract(game, "chain", round.chain, true);
	round.fx.chainPulse = 1;

	const targets = [a, b].filter((d) => d.kind === "target");
	for (const t of targets) {
		touchTarget(game, t);
		if (t.maxHp <= 1) continue;
		t.hp -= striker?.breaker ? 2 : 1;
		if (t.hp <= 0) t.dead = "shatter";
		else spray(game, t.x, t.y, 8, "frost", 2);
	}

	spray(
		game,
		x,
		y,
		isClash ? 22 : (6 + Math.min(10, force * 1.2)) | 0,
		isClash ? "gold" : "frost",
		1 + force * 0.5,
	);
	if (isClash) {
		freeze(game, 6);
		shake(game, 9);
		round.slowT = 24;
		game.emit({ type: "buzz", pattern: [25, 30, 45] });
	} else {
		game.emit({ type: "buzz", pattern: 8 });
		if (round.chain % 10 === 0) {
			freeze(game, 3);
			shake(game, 4);
		}
	}
}

/** Hit-stop: pauses physics for a few ticks. Skipped with reduced motion. */
export function freeze(game: Game, ticks: number): void {
	game.round.freeze = game.reduceMotion ? 0 : ticks;
}
