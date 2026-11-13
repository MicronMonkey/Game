// DOM HUD for the city acts: one playable city + an automatic partner city.
// Skills are presented as a framed skill panel with icon, effect, cost and a radial
// cooldown; buffs/debuffs appear as labelled chips with countdowns.
import { CITY_LABELS } from '../config.js';
import { SKILL_DEFS } from '../systems/SkillSystem.js';
import { el, fmtScore, fmtTime, layer } from './dom.js';

export const SKILL_EFFECT = {
  lunch_sprint: '全員加速 40%',
  sunlight: '掃開烏雲',
  city_resonance: '得分 ×1.5',
};

export function createHud(h) {
  const root = layer('hud');
  const clock = el('div', { class: 'hud-clock' }, [el('small', { text: '遊戲內虛擬時間' }), el('b', { text: '12:00' })]);
  const countdown = el('div', { class: 'hud-count' }, [el('small', { text: '剩餘' }), el('b', { text: '01:30' })]);
  const score = el('div', { class: 'hud-score' }, [el('small', { text: '遊戲分數' }), el('b', { text: '0' })]);
  const pause = el('button', { class: 'btn-icon', 'aria-label': '暫停', onclick: h.onPause, text: '⏸' });
  const top = el('div', { class: 'hud-top' }, [clock, countdown, score, pause]);

  // city strip
  const myName = el('b');
  const myCount = el('span', { class: 'ch-count', text: '0/30' });
  const myFill = el('i');
  const myBar = el('span', { class: 'ch-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 30 }, myFill);
  const allyName = el('span', { class: 'ally-name' });
  const allyCount = el('span', { class: 'ally-count', text: '0/30' });
  const allyFill = el('i');
  const ally = el('span', { class: 'ally', title: '夥伴廠由電腦自動推進（虛構）' }, [allyName, el('span', { class: 'ally-bar' }, allyFill), allyCount]);
  const cityStrip = el('div', { class: 'city-strip' }, [myName, myCount, myBar, ally]);
  const chips = el('div', { class: 'status-chips', 'aria-live': 'polite' });

  // bottom panel
  const sunFill = el('i');
  const sunText = el('b', { text: '20/100' });
  const ticks = el('span', { class: 'sun-ticks' });
  for (const def of Object.values(SKILL_DEFS)) {
    ticks.append(el('span', { class: 'tick', style: { left: `${def.sun_cost}%` }, title: `${def.name} ${def.sun_cost}` }, el('em', { text: def.icon })));
  }
  const sun = el('div', { class: 'hud-sun' }, [el('span', { class: 'sun-label', text: '☀ 陽光技能條' }), el('span', { class: 'sun-bar' }, [sunFill, ticks]), sunText]);
  const combo = el('div', { class: 'hud-combo', text: '' });
  const skills = {};
  const skillRow = el('div', { class: 'skill-panel', role: 'group', 'aria-label': '技能' });
  for (const def of Object.values(SKILL_DEFS)) {
    const state = el('span', { class: 'sk-state', text: '' });
    const icon = el('span', { class: 'sk-orb' }, el('span', { class: 'sk-icon', text: def.icon }));
    const btn = el('button', { class: `skill-card sk-${def.id}`, onclick: () => h.onSkill(def.id), 'aria-label': `${def.name}：${SKILL_EFFECT[def.id]}，消耗 ${def.sun_cost} 陽光` }, [
      icon,
      el('span', { class: 'sk-text' }, [el('b', { class: 'sk-name', text: def.name }), el('small', { class: 'sk-eff', text: SKILL_EFFECT[def.id] })]),
      el('span', { class: 'sk-cost', text: `☀${def.sun_cost}` }),
      state,
    ]);
    skills[def.id] = { btn, state, icon };
    skillRow.append(btn);
  }
  const hint = el('div', { class: 'hud-hint', 'aria-live': 'polite', text: '點人物 → 點集結區' });
  const signal = el('div', { class: 'signal-panel', hidden: true }, [el('span', { text: '📡 雙城訊號中斷：依序點 1→2→3 重新連線' })]);
  const signalBtns = el('div', { class: 'signal-btns' });
  signal.append(signalBtns);
  const bottom = el('div', { class: 'hud-bottom' }, [el('div', { class: 'hud-row' }, [sun, combo]), skillRow, hint, signal]);
  root.append(el('div', { class: 'hud-topwrap' }, [top, cityStrip, chips]), bottom);

  const last = {};
  const set = (key, value, fn) => {
    if (last[key] === value) return;
    last[key] = value;
    fn(value);
  };

  return {
    root,
    /** CSS-px area left for the field. */
    insets() {
      const t = chips.getBoundingClientRect();
      const b = bottom.getBoundingClientRect();
      return { top: t.bottom + 2, bottom: window.innerHeight - b.top + 2 };
    },
    setCities(mine, partner) {
      myName.textContent = `${CITY_LABELS[mine]}廠`;
      allyName.textContent = `${CITY_LABELS[partner]}夥伴`;
      myBar.setAttribute('aria-label', `${CITY_LABELS[mine]}集結進度`);
    },
    setAct(text) {
      countdown.querySelector('small').textContent = `${text}・剩餘`;
    },
    setClockLabel(label) {
      clock.querySelector('small').textContent = label;
    },
    hint(text) {
      set('hint', text, (v) => (hint.textContent = v));
    },
    flashHint() {
      hint.classList.remove('flash');
      void hint.offsetWidth;
      hint.classList.add('flash');
    },
    showSignal(onTap) {
      signal.hidden = false;
      signalBtns.replaceChildren();
      const order = [1, 2, 3].sort(() => Math.random() - 0.5);
      for (const n of order) {
        signalBtns.append(el('button', { class: 'sig-dot', 'data-n': n, onclick: (e) => onTap(n, e.currentTarget), text: String(n) }));
      }
    },
    markSignal(n, ok) {
      const b = signalBtns.querySelector(`[data-n="${n}"]`);
      if (b) b.classList.toggle('ok', ok);
    },
    resetSignal() {
      signalBtns.querySelectorAll('.sig-dot').forEach((b) => b.classList.remove('ok'));
    },
    hideSignal() {
      signal.hidden = true;
    },
    /** Pop animation on a skill card when cast. */
    pulseSkill(id) {
      const b = skills[id]?.btn;
      if (!b) return;
      b.classList.remove('cast');
      void b.offsetWidth;
      b.classList.add('cast');
    },
    update(v) {
      set('clock', v.clock, (x) => (clock.querySelector('b').textContent = x));
      set('cd', fmtTime(v.remaining), (x) => (countdown.querySelector('b').textContent = x));
      countdown.classList.toggle('warn', v.remaining <= 10);
      set('score', fmtScore(v.score), (x) => (score.querySelector('b').textContent = x));
      score.classList.toggle('boosted', !!v.scoreBoost);
      set('sun', Math.floor(v.sun), (x) => (sunText.textContent = `${x}/${v.sunCap}`));
      sunFill.style.width = `${(v.sun / v.sunCap) * 100}%`;
      sun.classList.toggle('debuffed', !!v.sunDebuff);
      set('combo', `${v.combo}|${v.multiplier}`, () => {
        combo.textContent = v.combo > 1 ? `COMBO ×${v.multiplier}（${v.combo} 連）` : '';
        combo.classList.toggle('hot', v.multiplier >= 3);
      });
      set('my', `${v.mine.arrived}/${v.mine.target}`, (x) => (myCount.textContent = x));
      myFill.style.width = `${Math.min(100, (v.mine.arrived / v.mine.target) * 100)}%`;
      myBar.setAttribute('aria-valuenow', Math.min(v.mine.arrived, v.mine.target));
      cityStrip.classList.toggle('done', v.mine.arrived >= v.mine.target);
      set('ally', `${v.ally.arrived}/${v.ally.target}`, (x) => (allyCount.textContent = x));
      allyFill.style.width = `${Math.min(100, (v.ally.arrived / v.ally.target) * 100)}%`;
      ally.classList.toggle('done', v.ally.arrived >= v.ally.target);
      // chips
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
        const r = v.skillReasons[id];
        const activeLeft = v.skillActive[id] || 0;
        const cd = v.skillCd[id] || 0;
        const total = SKILL_DEFS[id].cooldown_seconds;
        const disabled = !!r;
        if (s.btn.disabled !== disabled) s.btn.disabled = disabled;
        s.btn.classList.toggle('active', activeLeft > 0);
        s.btn.classList.toggle('ready', !r);
        s.icon.style.setProperty('--cd', cd > 0 ? `${(cd / total) * 360}deg` : '0deg');
        const label = activeLeft > 0 ? `生效中 ${Math.ceil(activeLeft)}s` : !r ? '就緒！' : cd > 0 ? `冷卻 ${Math.ceil(cd)}s` : r;
        set(`st-${id}`, label, (x) => (s.state.textContent = x));
        s.btn.title = r || '可施放';
      }
    },
    destroy() {
      root.remove();
    },
  };
}
