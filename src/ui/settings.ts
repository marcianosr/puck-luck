import { clamp } from '@/lib/math';
import { isBoolean, isNumber, load, save } from '@/lib/storage';
import { $, byId } from './dom';

const GAIN_KEY = 'chainSmashGain';
const HAPTICS_KEY = 'chainSmashHaptics';
const DEFAULT_GAIN = 1.7;
/** `?dev` unlocks the power slider; players always shoot at the tuned default. */
const IS_DEV = new URLSearchParams(location.search).has('dev');

export interface Settings {
  gain: () => number;
  buzz: (pattern: number | number[]) => void;
  close: () => void;
}

export function setupSettings(): Settings {
  const slider = byId('gain', HTMLInputElement), out = $('gainOut'), hapticsBtn = $('hapt');
  let gain = IS_DEV ? clamp(load(GAIN_KEY, isNumber, DEFAULT_GAIN), Number(slider.min), Number(slider.max)) : DEFAULT_GAIN;
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

  const overlay = $('settingsOver');
  const close = () => (overlay.hidden = true);
  $('settingsBtn').addEventListener('click', () => (overlay.hidden = false));
  $('settingsClose').addEventListener('click', close);
  overlay.addEventListener('click', e => e.target === overlay && close());

  $('devPower').hidden = !IS_DEV;
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
  return { gain: () => gain, buzz, close };
}
