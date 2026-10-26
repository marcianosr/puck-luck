import { clamp } from '@/lib/math';
import { isBoolean, isNumber, load, save } from '@/lib/storage';
import { $, byId } from './dom';

const GAIN_KEY = 'chainSmashGain';
const HAPTICS_KEY = 'chainSmashHaptics';
const DEFAULT_GAIN = 1.7;

export interface Settings {
  gain: () => number;
  buzz: (pattern: number | number[]) => void;
}

export function setupSettings(): Settings {
  const slider = byId('gain', HTMLInputElement), out = $('gainOut'), hapticsBtn = $('hapt');
  let gain = clamp(load(GAIN_KEY, isNumber, DEFAULT_GAIN), Number(slider.min), Number(slider.max));
  let haptics = load(HAPTICS_KEY, isBoolean, true);

  const showGain = () => {
    slider.value = String(gain);
    out.textContent = `${gain.toFixed(1)}×`;
  };
  const showHaptics = () => {
    hapticsBtn.classList.toggle('on', haptics);
    hapticsBtn.textContent = haptics ? 'Haptics on' : 'Haptics off';
  };
  const buzz = (pattern: number | number[]) => {
    if (!haptics || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw instead of ignoring vibration without a user gesture.
    }
  };

  slider.addEventListener('input', () => {
    gain = Number(slider.value);
    showGain();
    save(GAIN_KEY, gain);
  });
  hapticsBtn.addEventListener('click', () => {
    haptics = !haptics;
    save(HAPTICS_KEY, haptics);
    showHaptics();
    buzz(15);
  });
  showGain();
  showHaptics();
  return { gain: () => gain, buzz };
}
