// Pure scoring helpers (no Phaser). Formulas follow docs/03.
import { BALANCE } from '../config.js';

const S = BALANCE.scoring;

/** min(max, 1 + floor((comboCount-1)/steps)) */
export function comboMultiplier(comboCount) {
  if (comboCount <= 0) return 1;
  return Math.min(S.combo_max_multiplier, 1 + Math.floor((comboCount - 1) / S.combo_steps_per_multiplier));
}

/** 100 × combo multiplier × resonance score multiplier, rounded to integer. */
export function arrivalScore(comboCount, resonanceActive) {
  const resonance = resonanceActive ? 1 + BALANCE.skills.city_resonance.score_bonus : 1;
  return Math.round(S.base_per_arrival * comboMultiplier(comboCount) * resonance);
}

export function remainingSecondsBonus(seconds) {
  return Math.max(0, Math.floor(seconds)) * S.remaining_second_points;
}

export function bossRemainingBonus(seconds) {
  return Math.max(0, Math.floor(seconds)) * S.boss_remaining_second_points;
}

/** Initial boss damage based on how many cities reached their target in acts 1–2. */
export function bossInitialDamage(citiesReached) {
  if (citiesReached >= 2) return BALANCE.boss.both_cities_initial_damage;
  if (citiesReached === 1) return BALANCE.boss.one_city_initial_damage;
  return 0;
}
