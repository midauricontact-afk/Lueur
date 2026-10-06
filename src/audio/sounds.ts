/**
 * Petits effets sonores doux, générés avec la Web Audio API : aucun fichier audio, aucun droit d'auteur.
 * (Sur iPhone, le commutateur « silencieux » peut couper ces sons.)
 */

let ctx: AudioContext | null = null;
let config = { enabled: true, volume: 0.5 };

export function configureSound(c: { enabled: boolean; volume: number }) {
  config = c;
}

function audio(): AudioContext | null {
  if (!config.enabled || config.volume <= 0) return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  start?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  /** Glissando vers cette fréquence pendant la note. */
  slideTo?: number;
}

function tone(c: AudioContext, o: ToneOptions, bus: AudioNode) {
  const t0 = c.currentTime + (o.start ?? 0);
  const dur = o.dur ?? 0.18;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
  const peak = (o.gain ?? 0.2) * config.volume;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Un léger écho pour donner de l'air aux notes. */
function withEcho(c: AudioContext, wet = 0.25): AudioNode {
  const input = c.createGain();
  const delay = c.createDelay(0.6);
  const feedback = c.createGain();
  const out = c.createGain();
  delay.delayTime.value = 0.18;
  feedback.gain.value = 0.28;
  out.gain.value = wet;
  input.connect(c.destination);
  input.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(out).connect(c.destination);
  return input;
}

function play(fn: (c: AudioContext, bus: AudioNode) => void, echo = false) {
  const c = audio();
  if (!c) return;
  try {
    fn(c, echo ? withEcho(c) : c.destination);
  } catch {
    /* le son ne doit jamais casser l'app */
  }
}

// Notes (Hz) d'une gamme pentatonique douce.
const N = { c5: 523.25, d5: 587.33, e5: 659.25, g5: 783.99, a5: 880, c6: 1046.5, e6: 1318.5, g4: 392, a4: 440 };

export const sfx = {
  /** Toucher un bouton. */
  click: () => play((c, b) => tone(c, { freq: 740, slideTo: 620, dur: 0.07, type: 'sine', gain: 0.12 }, b)),
  /** Choisir une humeur, une émotion, un thème. */
  select: () => play((c, b) => tone(c, { freq: N.e5, dur: 0.14, type: 'triangle', gain: 0.14 }, b)),
  /** Passer à la question suivante. */
  next: () =>
    play((c, b) => {
      tone(c, { freq: N.c5, dur: 0.16, type: 'sine', gain: 0.15 }, b);
      tone(c, { freq: N.g5, start: 0.08, dur: 0.22, type: 'sine', gain: 0.15 }, b);
    }, true),
  /** Revenir en arrière. */
  back: () => play((c, b) => tone(c, { freq: 600, slideTo: 440, dur: 0.12, type: 'sine', gain: 0.1 }, b)),
  /** Interrupteur. */
  toggle: () => play((c, b) => tone(c, { freq: 880, slideTo: 1000, dur: 0.06, type: 'sine', gain: 0.1 }, b)),
  /** Fin du questionnaire : un petit arpège lumineux. */
  done: () =>
    play((c, b) => {
      [N.c5, N.e5, N.g5, N.c6, N.e6].forEach((f, i) => tone(c, { freq: f, start: i * 0.11, dur: 0.5, type: 'triangle', gain: 0.13 }, b));
      tone(c, { freq: N.g4, dur: 0.9, type: 'sine', gain: 0.07 }, b);
    }, true),
  /** Petit curseur déplacé. */
  tick: () => play((c, b) => tone(c, { freq: 1200, dur: 0.03, type: 'sine', gain: 0.05 }, b)),
};
