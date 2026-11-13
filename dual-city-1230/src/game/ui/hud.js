// DOM HUD for the runner acts. Kept deliberately clean: crowd count, progress to the
// finish, 號召力, a plain energy bar, and three skill buttons that glow when ready.
import { SKILL_DEFS } from '../systems/SkillSystem.js';
import { el, fmtScore, layer, onPress } from './dom.js';

const DEFAULT_HINT = '拖曳畫面（或方向鍵）移動，黃圈碰到的人會跟你走！';

export function createHud(h) {
  const root = layer('hud runner-hud');
  const clockSmall = el('small', { text: '' });
  const clock = el('div', { class: 'hud-clock' }, [clockSmall, el('b', { text: '12:00' })]);
  const crowdB = el('b', { text: '0' });
  const targetS = el('span', { text: '/30' });
  const crowd = el('div', { class: 'hud-crowd' }, [el('small', { text: '集結人數' }), el('span', { class: 'crowd-num' }, [crowdB, targetS])]);
  const score = el('div', { class: 'hud-score' }, [el('small', { text: '遊戲分數' }), el('b', { text: '0' })]);
  const pause = el('button', { class: 'btn-icon', 'aria-label': '暫停', onclick: h.onPause, text: '⏸' });
  const top = el('div', { class: 'hud-top' }, [clock, crowd, score, pause]);

  const progFill = el('i');
  const progDot = el('span', { class: 'prog-dot' });
  const radiusB = el('b', { text: '52' });
  const radius = el('span', { class: 'radius-badge', title: '號召力 = 黃色圈圈大小' }, ['號召力 ', radiusB]);
  const progress = el('div', { class: 'run-progress' }, [
    el('span', { class: 'prog-label' }),
    el('span', { class: 'prog-bar', role: 'progressbar', 'aria-label': '前往集結區進度' }, [progFill, progDot, el('em', { text: '🏁' })]),
    radius,
  ]);
  const chips = el('div', { class: 'status-chips', 'aria-live': 'polite' });

  const sunFill = el('i');
  const sunText = el('b', { text: '20' });
  const combo = el('span', { class: 'hud-combo' });
  const sun = el('div', { class: 'energy' }, [el('span', { class: 'energy-label', text: '☀ 能量' }), el('span', { class: 'energy-bar' }, sunFill), sunText, combo]);
  const skills = {};
  const skillRow = el('div', { class: 'skill-row2', role: 'group', 'aria-label': '技能' });
  Object.values(SKILL_DEFS).forEach((def, i) => {
    const cdFill = el('span', { class: 'sk2-cd' });
    const state = el('small', { class: 'sk2-state' });
    const btn = el('button', { class: `skill2 sk2-${def.id}`, 'aria-label': `${def.name}：${def.effect}，消耗 ${def.sun_cost} 能量（按鍵 ${i + 1}）` }, [
      cdFill,
      el('b', { text: `${def.icon} ${def.name}` }),
      el('small', { class: 'sk2-eff', text: def.effect }),
      state,
    ]);
    onPress(btn, () => h.onSkill(def.id));
    skills[def.id] = { btn, cdFill, state };
    skillRow.append(btn);
  });
  const hint = el('div', { class: 'hud-hint', 'aria-live': 'polite', text: DEFAULT_HINT });
  const bottom = el('div', { class: 'hud-bottom' }, [sun, skillRow, hint]);
  root.append(el('div', { class: 'hud-topwrap' }, [top, progress, chips]), bottom);

  const last = {};
  const set = (key, value, fn) => {
    if (last[key] === value) return;
    last[key] = value;
    fn(value);
  };

  return {
    root,
    insets() {
      const t = chips.getBoundingClientRect();
      const b = bottom.getBoundingClientRect();
      return { top: t.bottom + 2, bottom: window.innerHeight - b.top + 2 };
    },
    setTitle(city, act) {
      clockSmall.textContent = act;
      progress.querySelector('.prog-label').textContent = city;
    },
    /** Hints expire after ~4 s and fall back to the default line. */
    hint(text, sticky = false) {
      clearTimeout(this._hintT);
      set('hint', text, (v) => (hint.textContent = v));
      if (!sticky) this._hintT = setTimeout(() => set('hint', DEFAULT_HINT, (v) => (hint.textContent = v)), 4000);
    },
    pulseSkill(id) {
      const b = skills[id]?.btn;
      if (!b) return;
      b.classList.remove('cast');
      void b.offsetWidth;
      b.classList.add('cast');
    },
    update(v) {
      set('clock', v.clock, (x) => (clock.querySelector('b').textContent = x));
      set('crowd', v.crowd, (x) => {
        crowdB.textContent = x;
        crowd.classList.remove('bump');
        void crowd.offsetWidth;
        crowd.classList.add('bump');
      });
      set('target', v.target, (x) => (targetS.textContent = `/${x}`));
      crowd.classList.toggle('done', v.crowd >= v.target);
      set('score', fmtScore(v.score), (x) => (score.querySelector('b').textContent = x));
      score.classList.toggle('boosted', !!v.scoreBoost);
      progFill.style.width = `${v.progress * 100}%`;
      progDot.style.left = `${v.progress * 100}%`;
      set('radius', v.radius, (x) => (radiusB.textContent = x));
      radius.dataset.state = v.radiusState || '';
      sunFill.style.width = `${(v.sun / v.sunCap) * 100}%`;
      set('sun', Math.floor(v.sun), (x) => (sunText.textContent = x));
      set('combo', `${v.combo}|${v.multiplier}`, () => {
        combo.textContent = v.combo > 1 ? `COMBO ×${v.multiplier}` : '';
        combo.classList.toggle('hot', v.multiplier >= 3);
      });
      const sig = v.chips.map((c) => `${c.kind}${c.text}${c.left != null ? Math.ceil(c.left) : ''}`).join('|');
      set('chips', sig, () => {
        chips.replaceChildren(
          ...v.chips.map((c) =>
            el('span', { class: `chip ${c.kind}` }, [
              el('span', { text: c.text }),
              c.left != null ? el('b', { text: `${Math.ceil(c.left)}s` }) : null,
              c.left != null && c.total ? el('i', { style: { width: `${Math.max(0, Math.min(100, (c.left / c.total) * 100))}%` } }) : null,
            ]),
          ),
        );
      });
      for (const [id, s] of Object.entries(skills)) {
        const def = SKILL_DEFS[id];
        const r = v.skillReasons[id];
        const activeLeft = v.skillActive[id] || 0;
        const cd = v.skillCd[id] || 0;
        if (s.btn.disabled !== !!r) s.btn.disabled = !!r;
        s.btn.classList.toggle('ready', !r);
        s.btn.classList.toggle('active', activeLeft > 0);
        // cooldown shade drains from top; when only short on energy, show how full the bar is
        const shade = cd > 0 ? cd / def.cooldown_seconds : r ? 1 - Math.min(1, v.sun / def.sun_cost) : 0;
        s.cdFill.style.height = `${shade * 100}%`;
        const label = activeLeft > 0 ? `生效 ${Math.ceil(activeLeft)}s` : !r ? '' : cd > 0 ? `${Math.ceil(cd)}s` : `能量 ${def.sun_cost}`;
        set(`st-${id}`, label, (x) => (s.state.textContent = x));
      }
    },
    destroy() {
      root.remove();
    },
  };
}
