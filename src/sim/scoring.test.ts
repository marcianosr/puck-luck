import { describe, expect, it } from "vitest";
import { BASE_MODIFIERS, modifiersFor, type PerkId } from "@/data/perks";
import {
	chainValue,
	grownModifiers,
	scoreHit,
	type HitBonuses,
} from "./scoring";

const mods = (...ids: PerkId[]) => modifiersFor(new Set(ids));
const plain = { chain: 1, shotMult: 1, inWeather: false };
const noBonus: HitBonuses = {
	clash: false,
	prism: false,
	banked: false,
	curled: false,
	gold: false,
	perfect: false,
	shotMult: 1,
};

describe("chainValue", () => {
	it("pays 10 per link of the chain", () => {
		expect(chainValue({ ...plain, chain: 5 }, BASE_MODIFIERS)).toBe(50);
	});

	it("caps at a 24-chain, or 40 with Long Chains", () => {
		expect(chainValue({ ...plain, chain: 30 }, BASE_MODIFIERS)).toBe(240);
		expect(chainValue({ ...plain, chain: 50 }, mods("cap"))).toBe(400);
	});

	it("multiplies by the Comet shot multiplier", () => {
		expect(
			chainValue({ ...plain, chain: 3, shotMult: 3 }, BASE_MODIFIERS),
		).toBe(90);
	});

	it("doubles hits after a 10-chain with Chain Reactor, not before", () => {
		expect(chainValue({ ...plain, chain: 10 }, mods("reactor"))).toBe(100);
		expect(chainValue({ ...plain, chain: 11 }, mods("reactor"))).toBe(220);
	});

	it("applies Storm Chaser only in weather rounds", () => {
		expect(chainValue({ ...plain, chain: 4 }, mods("storm"))).toBe(40);
		expect(
			chainValue({ ...plain, chain: 4, inWeather: true }, mods("storm")),
		).toBe(60);
	});
});

describe("scoreHit", () => {
	it("returns the base value untagged without bonuses", () => {
		expect(scoreHit(30, noBonus, BASE_MODIFIERS)).toEqual({
			points: 30,
			tags: [],
		});
	});

	it("stacks every bonus in order: clash, bank, curl, gold, perfect", () => {
		const all = {
			...noBonus,
			clash: true,
			banked: true,
			curled: true,
			gold: true,
			perfect: true,
		};
		// 10 ×10 clash ×2 bank ×1.5 curl ×3 gold ×1.5 perfect
		expect(scoreHit(10, all, BASE_MODIFIERS)).toEqual({
			points: 1350,
			tags: [
				"Clash ×10",
				"Bank Shot ×2",
				"Curl Shot ×1.5",
				"Gold ×3",
				"Perfect ×1.5",
			],
		});
	});

	it("rounds after the curl and perfect multipliers", () => {
		expect(
			scoreHit(15, { ...noBonus, curled: true }, BASE_MODIFIERS).points,
		).toBe(23);
	});

	it("treats a Prism hit as a clash and tags it as Prism first", () => {
		expect(
			scoreHit(10, { ...noBonus, prism: true }, mods("fever")),
		).toEqual({ points: 150, tags: ["Prism", "Clash ×15"] });
	});

	it("keeps caller tags in front and labels Supernova shots", () => {
		expect(
			scoreHit(10, { ...noBonus, shotMult: 3 }, BASE_MODIFIERS, ["Phase"])
				.tags,
		).toEqual(["Phase", "Supernova"]);
	});
});

describe("scoreHit with a run-wide score multiplier", () => {
	it("applies the score multiplier last, rounded, and tags it as Momentum", () => {
		const momentum = { ...BASE_MODIFIERS, scoreMult: 1.3 };
		// 15 ×1.5 curl = 23, ×1.3 momentum = 29.9
		expect(scoreHit(15, { ...noBonus, curled: true }, momentum)).toEqual({
			points: 30,
			tags: ["Curl Shot ×1.5", "Momentum ×1.3"],
		});
	});

	it("leaves points and tags untouched at ×1", () => {
		expect(scoreHit(30, noBonus, BASE_MODIFIERS)).toEqual({
			points: 30,
			tags: [],
		});
	});
});

describe("grownModifiers", () => {
	const freshRun = { clashes: 0, round: 1 };

	it("returns the owned modifiers unchanged without growth perks", () => {
		expect(grownModifiers(mods("fever"), { clashes: 7, round: 5 })).toEqual(
			mods("fever"),
		);
	});

	it("adds one clash multiplier per clash landed this run with Clash Collector", () => {
		expect(grownModifiers(mods("collector"), freshRun).clashMult).toBe(10);
		expect(
			grownModifiers(mods("collector"), { ...freshRun, clashes: 4 })
				.clashMult,
		).toBe(14);
	});

	it("grows on top of Clash Fever", () => {
		expect(
			grownModifiers(mods("collector", "fever"), {
				...freshRun,
				clashes: 4,
			}).clashMult,
		).toBe(19);
	});

	it("gives Momentum ×1.3 after two cleared rounds", () => {
		expect(grownModifiers(mods("momentum"), freshRun).scoreMult).toBe(1);
		expect(
			grownModifiers(mods("momentum"), { ...freshRun, round: 3 })
				.scoreMult,
		).toBeCloseTo(1.3);
	});
});
