// Shared app context across scenes.
import { loadSave, writeSave } from './systems/Storage.js';
import { Audio } from './systems/AudioSystem.js';

const params = new URLSearchParams(location.search);

export const App = {
  save: loadSave(),
  run: null, // current run state (GameState) — created on start, cleared on menu
  game: null,
  dpr: 1,
  testMode: params.has('test'),
  timeScale: 1, // tests may fast-forward
  hooks: {},
};

export function persist() {
  writeSave(App.save);
}

export function reducedMotion() {
  const media = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return media || !!App.save.settings.reducedMotion;
}

export function setSound(on) {
  App.save.settings.soundEnabled = on;
  Audio.setEnabled(on);
  persist();
}

/** CSS-px layout for the two city panels. */
export function computeLayout(w, h, insets) {
  const top = insets.top;
  const bottom = insets.bottom;
  const availH = Math.max(160, h - top - bottom);
  const portrait = w / h < 0.95;
  const gap = 6;
  const pad = 6;
  if (portrait) {
    const cw = w - pad * 2;
    const ch = (availH - gap) / 2;
    return {
      mode: 'portrait',
      taoyuan: { x: pad, y: top, w: cw, h: ch },
      taichung: { x: pad, y: top + ch + gap, w: cw, h: ch },
    };
  }
  const maxW = Math.min(w, 1400);
  const left = (w - maxW) / 2 + pad;
  const cw = (maxW - pad * 2 - gap) / 2;
  return {
    mode: 'landscape',
    taoyuan: { x: left, y: top, w: cw, h: availH },
    taichung: { x: left + cw + gap, y: top, w: cw, h: availH },
  };
}
