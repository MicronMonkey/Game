// Versioned localStorage. Uses ONLY the dualCity1230.* namespace — never reads,
// writes or clears keys from other games on the same site (e.g. 全民抓法克).
export const SAVE_KEY = 'dualCity1230.save.v1';
export const SCHEMA_VERSION = 1;

export function defaultSave() {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: 'dualCity1230',
    scores: {
      easy: { highest: 0, bestClearSeconds: null },
      normal: { highest: 0, bestClearSeconds: null },
      hell: { highest: 0, bestClearSeconds: null },
    },
    stats: { played: 0, bossWins: 0, longestCombo: 0, lunchArrivals: 0, skillsUsed: 0, bossFailedSinceWin: false },
    achievements: [],
    galleryViewed: { taoyuan: false, taichung: false },
    settings: { soundEnabled: true, reducedMotion: false },
    tutorialCompleted: false,
    introSeen: false,
  };
}

/** Bring any older/partial object up to the current schema without losing data. */
export function migrate(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base, ...raw };
  out.scores = { ...base.scores };
  for (const k of Object.keys(base.scores)) out.scores[k] = { ...base.scores[k], ...(raw.scores?.[k] || {}) };
  out.stats = { ...base.stats, ...(raw.stats || {}) };
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  out.galleryViewed = { ...base.galleryViewed, ...(raw.galleryViewed || {}) };
  out.achievements = Array.isArray(raw.achievements) ? [...new Set(raw.achievements)] : [];
  out.schemaVersion = SCHEMA_VERSION;
  out.gameId = 'dualCity1230';
  return out;
}

function backend() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

let memory = null;

export function loadSave() {
  const ls = backend();
  if (!ls) return (memory ||= defaultSave());
  try {
    const txt = ls.getItem(SAVE_KEY);
    return migrate(txt ? JSON.parse(txt) : null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  memory = save;
  const ls = backend();
  if (!ls) return false;
  try {
    ls.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function updateSave(fn) {
  const s = loadSave();
  fn(s);
  writeSave(s);
  return s;
}

/** Record a finished run; returns {save, newHigh}. */
export function recordRun(save, { difficulty, score, longestCombo, bossWin, clearSeconds, lunchArrivals = 0, skillsUsed = 0 }) {
  const slot = save.scores[difficulty] || (save.scores[difficulty] = { highest: 0, bestClearSeconds: null });
  const newHigh = score > slot.highest;
  if (newHigh) slot.highest = score;
  if (bossWin && clearSeconds != null && (slot.bestClearSeconds == null || clearSeconds < slot.bestClearSeconds)) {
    slot.bestClearSeconds = clearSeconds;
  }
  save.stats.played += 1;
  if (bossWin) save.stats.bossWins += 1;
  save.stats.longestCombo = Math.max(save.stats.longestCombo, longestCombo);
  save.stats.lunchArrivals += lunchArrivals;
  save.stats.skillsUsed += skillsUsed;
  return { save, newHigh };
}
