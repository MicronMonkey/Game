// Run state: difficulty, score, per-city progress, combo, sun energy, timers.
// Pure JS (no Phaser) so it can be unit-tested in Node.
import { BALANCE, CITIES, TUNING, difficultySettings } from '../config.js';
import { arrivalScore, comboMultiplier } from './scoring.js';

export function createRunState(difficulty = 'normal', city = 'taoyuan') {
  const settings = difficultySettings(difficulty);
  const blank = () => ({ arrived: 0, byType: {} });
  const mine = CITIES.includes(city) ? city : 'taoyuan';
  return {
    difficulty,
    settings,
    city: mine, // the city the player runs
    allyCity: mine === 'taichung' ? 'taoyuan' : 'taichung', // advances automatically
    allyProgress: 0,
    seed: Math.floor(Math.random() * 1e6),
    score: 0,
    sun: TUNING.startingSun,
    sunCapacity: BALANCE.scoring.sun_capacity,
    combo: 0,
    longestCombo: 0,
    lastArrivalAt: -Infinity, // run-clock seconds
    runClock: 0, // seconds of un-paused gameplay across acts
    cities: Object.fromEntries(CITIES.map((c) => [c, blank()])),
    scoredIds: new Set(),
    sprinterBonusUsed: 0,
    skillsUsed: 0,
    bonuses: [], // {label, points}
    bossResult: null, // 'win' | 'lose'
    bossInitialDamage: 0,
    clearSeconds: null,
  };
}

export function citiesReached(state) {
  return CITIES.filter((c) => state.cities[c].arrived >= state.settings.targets[c]).length;
}

export function addSun(state, amount) {
  state.sun = Math.max(0, Math.min(state.sunCapacity, state.sun + amount));
  return state.sun;
}

export function spendSun(state, amount) {
  if (state.sun < amount) return false;
  state.sun = Math.max(0, state.sun - amount);
  return true;
}

export function addBonus(state, label, points) {
  const p = Math.max(0, Math.floor(points));
  if (p <= 0) return 0;
  state.score += p;
  state.bonuses.push({ label, points: p });
  return p;
}

/**
 * Register a character arrival. Returns null if this id already scored (anti double-count),
 * else a result object describing what happened.
 * opts: { resonance:boolean, sunFactor:number, extraSun:number }
 */
export function registerArrival(state, cityId, charId, type, opts = {}) {
  if (state.scoredIds.has(charId)) return null;
  state.scoredIds.add(charId);
  const window = BALANCE.scoring.combo_window_seconds;
  if (state.runClock - state.lastArrivalAt <= window) state.combo += 1;
  else state.combo = 1;
  state.lastArrivalAt = state.runClock;
  state.longestCombo = Math.max(state.longestCombo, state.combo);
  const points = arrivalScore(state.combo, !!opts.resonance);
  state.score += points;
  const sunFactor = opts.sunFactor ?? 1;
  const sunGain = (BALANCE.scoring.sun_per_arrival + (opts.extraSun || 0)) * sunFactor;
  addSun(state, sunGain);
  const c = state.cities[cityId];
  c.arrived += 1;
  c.byType[type] = (c.byType[type] || 0) + 1;
  return { points, combo: state.combo, multiplier: comboMultiplier(state.combo), sunGain, arrived: c.arrived };
}

/** Runner: a bystander joined the crowd. Combo + score (resonance ×1.5). */
export function registerRecruit(state, opts = {}) {
  const window = BALANCE.scoring.combo_window_seconds;
  if (state.runClock - state.lastArrivalAt <= window) state.combo += 1;
  else state.combo = 1;
  state.lastArrivalAt = state.runClock;
  state.longestCombo = Math.max(state.longestCombo, state.combo);
  const points = arrivalScore(state.combo, !!opts.resonance) * (opts.media ? 2 : 1);
  state.score += points;
  state.recruits = (state.recruits || 0) + 1;
  return { points, combo: state.combo, multiplier: comboMultiplier(state.combo) };
}

/** Combo resets when the window expires. Call every tick. */
export function tickCombo(state) {
  if (state.combo > 0 && state.runClock - state.lastArrivalAt > BALANCE.scoring.combo_window_seconds) {
    state.combo = 0;
  }
}

/**
 * Sprinter time bonus: +2s per arrival, max +10s per run, and the countdown can never
 * exceed the act's initial time + 10s. Returns seconds actually granted.
 */
export function sprinterTimeBonus(state, remaining, actInitial) {
  const cfg = BALANCE.characters.sprinter;
  const left = cfg.max_bonus_seconds_per_run - state.sprinterBonusUsed;
  const ceiling = actInitial + cfg.max_bonus_seconds_per_run - remaining;
  const grant = Math.max(0, Math.min(cfg.bonus_seconds, left, ceiling));
  state.sprinterBonusUsed += grant;
  return grant;
}
