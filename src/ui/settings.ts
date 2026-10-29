import { clamp } from '@/lib/math';
import { isBoolean, isNumber, load, save } from '@/lib/storage';
import { $, byId } from './dom';

const GAIN_KEY = 'chainSmashGain';
const HAPTICS_KEY = 'chainSmashHaptics';
const SOUND_KEY = 'chainSmashSound';
const DEFAULT_GAIN = 1.7;
/** `?dev` unlocks the power slider; players always shoot at the tuned default. */
const IS_DEV = new URLSearchParams(location.search).has('dev');

export interface Settings {
  gain: () => number;
  buzz: (pattern: number | number[]) => void;
  sound: () => boolean;
  close: () => void;
}

/** `onSoundOn` lets the player hear the change right away. */
export function setupSettings(onSoundOn: () => void): Settings {
  const slider = byId('gain', HTMLInputElement), out = $('gainOut'), hapticsBtn = $('hapt'), soundBtn = $('snd');
  let gain = IS_DEV ? clamp(load(GAIN_KEY, isNumber, DEFAULT_GAIN), Number(slider.min), Number(slider.max)) : DEFAULT_GAIN;
  let haptics = load(HAPTICS_KEY, isBoolean, true);
  let sound = load(SOUND_KEY, isBoolean, true);

  const showGain = () => {
    slider.value = String(gain);
    out.textContent = `${gain.toFixed(1)}×`;
  };
  const showHaptics = () => {
    hapticsBtn.classList.toggle('on', haptics);
    hapticsBtn.textContent = haptics ? 'Haptics on' : 'Haptics off';
  };
  const showSound = () => {
    soundBtn.classList.toggle('on', sound);
    soundBtn.textContent = sound ? 'Sound on' : 'Sound off';
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
  soundBtn.addEventListener('click', () => {
    sound = !sound;
    save(SOUND_KEY, sound);
    showSound();
    if (sound) onSoundOn();
  });
  showGain();
  showHaptics();
  showSound();
  return { gain: () => gain, buzz, sound: () => sound, close };
}
