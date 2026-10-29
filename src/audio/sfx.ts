import type { FeelCue } from '@/sim/types';

interface Tone {
  kind: 'tone';
  wave: OscillatorType;
  freq: number;
  /** Glides to this frequency over the tone's length. */
  to?: number;
  ms: number;
  gain: number;
  delayMs?: number;
}

interface Noise {
  kind: 'noise';
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  ms: number;
  gain: number;
  delayMs?: number;
}

export type Voice = Tone | Noise;

const BASE_NOTE_HZ = 330;
// Major pentatonic: any run of these sounds musical, so rising chains climb a tune instead of a siren.
const PENTATONIC = [0, 2, 4, 7, 9];
const TOP_CHAIN_NOTE = 15;
const MASTER_GAIN = 0.6;
const ATTACK_S = 0.005;
const SILENT = 0.0001;
// Hits can land several per frame in a pack; more than one per gap turns into noise.
const HIT_GAP_MS = 35;

/** The note for the nth link of a chain: one pentatonic step up per link, flattening out at the top. */
export function chainNote(chain: number): number {
  const step = Math.max(0, Math.min(chain, TOP_CHAIN_NOTE) - 1);
  const semitones = (PENTATONIC[step % PENTATONIC.length] ?? 0) + 12 * Math.floor(step / PENTATONIC.length);
  return BASE_NOTE_HZ * 2 ** (semitones / 12);
}

const tone = (wave: OscillatorType, freq: number, ms: number, gain: number, extra: Partial<Tone> = {}): Tone =>
  ({ kind: 'tone', wave, freq, ms, gain, ...extra });
const noise = (filter: BiquadFilterType, freq: number, ms: number, gain: number, extra: Partial<Noise> = {}): Noise =>
  ({ kind: 'noise', filter, freq, ms, gain, ...extra });
const arpeggio = (notes: number[], stepMs: number, ms: number, gain: number): Voice[] =>
  notes.map((freq, i) => tone('triangle', freq, ms, gain, { delayMs: i * stepMs }));

export const SOUNDS: Record<FeelCue, (chain: number) => Voice[]> = {
  launch: () => [noise('bandpass', 800, 120, 0.25, { to: 2500 })],
  perfect: () => [tone('triangle', 1318, 90, 0.2), tone('triangle', 1976, 140, 0.2, { delayMs: 70 })],
  nudge: () => [tone('sine', 180, 80, 0.3, { to: 120 })],
  ability: () => [tone('square', 660, 90, 0.08, { to: 990 })],
  hit: chain => [tone('triangle', chainNote(chain), 110, 0.25), tone('sine', chainNote(chain) * 2, 60, 0.06)],
  clash: chain => [
    tone('square', chainNote(chain) * 1.5, 160, 0.1),
    tone('square', chainNote(chain) * 2.01, 160, 0.07),
    noise('highpass', 3000, 80, 0.15),
  ],
  shatter: () => [noise('highpass', 2500, 140, 0.3), tone('triangle', 1760, 120, 0.1, { to: 880 })],
  sink: () => [tone('sine', 520, 260, 0.35, { to: 110 })],
  boom: () => [noise('lowpass', 900, 600, 0.5, { to: 120 }), tone('sine', 90, 500, 0.5, { to: 40 })],
  quota: () => arpeggio([523, 659, 784, 1047], 70, 120, 0.18),
  fullClear: () => arpeggio([523, 659, 784, 1047, 1319], 60, 160, 0.18),
  bounty: () => [tone('sine', 988, 120, 0.2), tone('sine', 1319, 160, 0.2, { delayMs: 80 })],
  secondWind: () => [tone('triangle', 220, 400, 0.15, { to: 880 })],
  roundCleared: () => arpeggio([392, 523, 659, 784], 90, 200, 0.18),
  buy: () => [tone('sine', 1319, 90, 0.15), tone('sine', 1760, 110, 0.15, { delayMs: 60 })],
  upgrade: () => arpeggio([659, 988, 1319], 60, 110, 0.15),
};

export interface Sfx {
  /** Creates or resumes audio. Browsers only allow this inside a user gesture. */
  unlock: () => void;
  play: (cue: FeelCue, chain: number) => void;
}

/** A tiny synth: every sound is built from oscillators and filtered noise, so there are no files to load. */
export function createSfx(isOn: () => boolean): Sfx {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let lastHitAt = 0;

  const envelope = (audio: AudioContext, peak: number, start: number, seconds: number): GainNode => {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(SILENT, start + seconds);
    return gain;
  };

  const sound = (audio: AudioContext, out: GainNode, buffer: AudioBuffer, voice: Voice): void => {
    const start = audio.currentTime + (voice.delayMs ?? 0) / 1000, seconds = voice.ms / 1000;
    const gain = envelope(audio, voice.gain, start, seconds);
    gain.connect(out);
    if (voice.kind === 'tone') {
      const osc = audio.createOscillator();
      osc.type = voice.wave;
      osc.frequency.setValueAtTime(voice.freq, start);
      if (voice.to) osc.frequency.exponentialRampToValueAtTime(voice.to, start + seconds);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + seconds);
      return;
    }
    const src = audio.createBufferSource(), filter = audio.createBiquadFilter();
    src.buffer = buffer;
    filter.type = voice.filter;
    filter.frequency.setValueAtTime(voice.freq, start);
    if (voice.to) filter.frequency.exponentialRampToValueAtTime(voice.to, start + seconds);
    src.connect(filter).connect(gain);
    src.start(start);
    src.stop(start + seconds);
  };

  return {
    unlock() {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = MASTER_GAIN;
        master.connect(ctx.destination);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') void ctx.resume();
    },
    play(cue, chain) {
      if (!isOn() || !ctx || !master || !noiseBuffer || ctx.state !== 'running') return;
      if (cue === 'hit') {
        const now = performance.now();
        if (now - lastHitAt < HIT_GAP_MS) return;
        lastHitAt = now;
      }
      for (const voice of SOUNDS[cue](chain)) sound(ctx, master, noiseBuffer, voice);
    },
  };
}
