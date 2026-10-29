import "./style.css";
import { createSfx } from "@/audio/sfx";
import { TICK_MS, W, H } from "@/data/constants";
import { attachPointer } from "@/input/pointer";
import { randomSeed } from "@/lib/rng";
import { advanceClock } from "@/loop";
import { fitCanvas } from "@/render/canvas";
import { drawFrame } from "@/render/frame";
import { cssPalette } from "@/render/paint";
import { advanceEffects } from "@/sim/effects";
import { createGame, parkForKitPick, startRun } from "@/sim/game";
import { step } from "@/sim/physics";
import type { Game, GameEvent } from "@/sim/types";
import { $, byId, closest } from "@/ui/dom";
import {
	renderCoins,
	renderBounties,
	renderHand,
	renderPerks,
	renderRoundHeader,
	renderScore,
} from "@/ui/hud";
import { createFeel } from "@/ui/feel";
import { createCoach } from "@/ui/hints";
import { hideInfo, isInfoOpen, showInfo } from "@/ui/info";
import { hideOverlays, setupKitPicker, showRunOver } from "@/ui/overlays";
import { setupRunSheet } from "@/ui/runSheet";
import { setupSettings } from "@/ui/settings";
import { createShopView } from "@/ui/shop";

const MAX_CATCH_UP_TICKS = 5;
const RESULT_DELAY_MS = 650;

/** `?seed=123` replays the same runs; without it every run gets a fresh seed. */
const fixedSeed = (() => {
	const raw = new URLSearchParams(location.search).get("seed");
	return raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : null;
})();
const seedForRun = () => fixedSeed ?? randomSeed();

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sfx = createSfx(() => settings.sound());
const settings = setupSettings(() => sfx.play("buy", 0));
const feel = createFeel(settings.buzz, sfx);
// Browsers keep audio locked until a user gesture; every press is a chance to unlock or resume it.
for (const type of ["pointerdown", "keydown"])
	addEventListener(type, () => sfx.unlock(), { capture: true });
const runSheet = setupRunSheet(() => game);
const shop = createShopView(() => game);
const coach = createCoach();

function showRunPhase(): void {
	if (game.runPhase === "shop") shop.open();
	if (game.runPhase === "over") showRunOver(game);
}

function onGameEvent(event: GameEvent): void {
	switch (event.type) {
		case "score":
			return renderScore(game, event.bump, reduceMotion);
		case "coins":
			return renderCoins(game);
		case "bounties":
			renderBounties(game);
			runSheet.refreshBadge();
			return;
		case "hand":
			return renderHand(game);
		case "perks":
			return renderPerks(game);
		case "feel":
			return feel(event);
		case "round":
			hideOverlays();
			renderRoundHeader(game);
			renderHand(game);
			renderScore(game, false, reduceMotion);
			renderBounties(game);
			runSheet.resetForRound();
			return;
		case "shop":
			return shop.refresh();
		case "runPhase":
			// Let the last shot's effects land before covering the rink.
			setTimeout(showRunPhase, RESULT_DELAY_MS);
	}
}

const game: Game = createGame({
	seed: seedForRun(),
	reduceMotion,
	emit: (event) => {
		onGameEvent(event);
		coach.update(game);
	},
});

const kitPicker = setupKitPicker((kit) => startRun(game, kit, seedForRun()));
const newRun = () => {
	parkForKitPick(game);
	kitPicker.show();
};

function context2d(target: HTMLCanvasElement): CanvasRenderingContext2D {
	const context = target.getContext("2d");
	if (!context) throw new Error("Canvas 2D is not supported");
	return context;
}

const canvas = byId("c", HTMLCanvasElement);
const ctx = context2d(canvas);
const fogCanvas = Object.assign(document.createElement("canvas"), {
	width: W,
	height: H,
});
const fogCtx = context2d(fogCanvas);
const scale = fitCanvas(canvas, $("stage"), ctx);
const paint = { ctx, color: cssPalette() };

const pointer = attachPointer(canvas, {
	game: () => game,
	gain: settings.gain,
	scale,
	consumePress: () => {
		if (!isInfoOpen()) return false;
		hideInfo();
		return true;
	},
});

const cabinet = $("stage").closest(".cab");
cabinet?.addEventListener("click", (e) => {
	const key = closest(e.target, "[data-k]", HTMLElement)?.dataset.k;
	if (key) {
		e.stopPropagation();
		showInfo(game, key);
		return;
	}
	if (isInfoOpen() && !closest(e.target, "#info", HTMLElement)) hideInfo();
});
cabinet?.addEventListener("keydown", (e) => {
	if (!(e instanceof KeyboardEvent) || (e.key !== "Enter" && e.key !== " "))
		return;
	const key = closest(e.target, "[data-k]", HTMLElement)?.dataset.k;
	if (!key) return;
	e.preventDefault();
	showInfo(game, key);
});
$("info").addEventListener("click", hideInfo);
$("again").addEventListener("click", newRun);
$("reset").addEventListener("click", () => {
	settings.close();
	newRun();
});

let carry = 0,
	last = performance.now();
function frame(now: number): void {
	const due = advanceClock(carry, now - last, TICK_MS, MAX_CATCH_UP_TICKS);
	carry = due.carry;
	last = now;
	const sweep = pointer.sweepPoint(now);
	for (let i = 0; i < due.ticks; i++) advanceEffects(game, step(game, sweep));
	drawFrame(paint, fogCtx, game, {
		gain: settings.gain(),
		pointer: pointer.view(),
		seconds: now / 1000,
		random: Math.random,
	});
	requestAnimationFrame(frame);
}

newRun();
void document.fonts.ready.then(() => {
	last = performance.now();
	requestAnimationFrame(frame);
});
