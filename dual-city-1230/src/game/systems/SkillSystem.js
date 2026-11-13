// Runner skills: 大聲號召 / 團結護盾 / 雙城共鳴. Energy (sun) cost, cooldown, duration buffs. Driven by tick(dt) so pausing
// the scene freezes cooldowns and buffs automatically.
import { BALANCE } from '../config.js';
import { spendSun } from './GameState.js';

export const SKILL_DEFS = {
  rally: { id: 'rally', name: '大聲號召', icon: '📣', effect: '號召力 ×1.6', ...BALANCE.skills.rally },
  shield: { id: 'shield', name: '團結護盾', icon: '🛡️', effect: '不怕主管與干擾', ...BALANCE.skills.shield },
  city_resonance: { id: 'city_resonance', name: '雙城共鳴', icon: '🔗', effect: '吸人＋得分×1.5', ...BALANCE.skills.city_resonance },
};

export class SkillSystem {
  constructor(state) {
    this.state = state;
    this.cooldowns = { rally: 0, shield: 0, city_resonance: 0 };
    this.active = { rally: 0, shield: 0, city_resonance: 0 };
    this.blocked = {}; // skillId -> reason (e.g. signal outage)
  }

  /** Returns null if castable, else a human-readable reason. */
  reason(id) {
    const def = SKILL_DEFS[id];
    if (!def) return '未知技能';
    if (this.blocked[id]) return this.blocked[id];
    if (this.cooldowns[id] > 0) return `冷卻 ${Math.ceil(this.cooldowns[id])}s`;
    if (this.state.sun < def.sun_cost) return `陽光不足（需 ${def.sun_cost}）`;
    return null;
  }

  cast(id) {
    const why = this.reason(id);
    if (why) return { ok: false, reason: why };
    const def = SKILL_DEFS[id];
    if (!spendSun(this.state, def.sun_cost)) return { ok: false, reason: '陽光不足' };
    this.cooldowns[id] = def.cooldown_seconds;
    if (def.duration_seconds) this.active[id] = def.duration_seconds;
    this.state.skillsUsed += 1;
    return { ok: true };
  }

  tick(dt) {
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    for (const k of Object.keys(this.active)) this.active[k] = Math.max(0, this.active[k] - dt);
  }

  isActive(id) {
    return (this.active[id] || 0) > 0;
  }

  /** Radius multiplier from skills (rally; never stacks with itself). */
  radiusMultiplier() {
    return this.isActive('rally') ? SKILL_DEFS.rally.radius_multiplier : 1;
  }

  shielded() {
    return this.isActive('shield');
  }

  resonanceActive() {
    return this.isActive('city_resonance');
  }
}
