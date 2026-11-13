// DOM HUD for the two-city acts. All touch targets ≥ 44×44 CSS px; skills show icon +
// name + countdown number (never colour alone).
import { CITIES, CITY_LABELS } from '../config.js';
import { SKILL_DEFS } from '../systems/SkillSystem.js';
import { el, fmtScore, fmtTime, layer } from './dom.js';

export function createHud(h) {
  const root = layer('hud');
  const clock = el('div', { class: 'hud-clock' }, [el('small', { text: '遊戲內虛擬時間' }), el('b', { text: '12:00' })]);
  const countdown = el('div', { class: 'hud-count' }, [el('small', { text: '剩餘' }), el('b', { text: '01:30' })]);
  const score = el('div', { class: 'hud-score' }, [el('small', { text: '遊戲分數' }), el('b', { text: '0' })]);
  const pause = el('button', { class: 'btn-icon', 'aria-label': '暫停', onclick: h.onPause, text: '⏸' });
  const top = el('div', { class: 'hud-top' }, [clock, countdown, score, pause]);

  const cityHeads = {};
  for (const c of CITIES) {
    const count = el('span', { class: 'ch-count', text: '0/30' });
    const fill = el('i');
    const bar = el('span', { class: 'ch-bar', role: 'progressbar', 'aria-label': `${CITY_LABELS[c]}集結進度`, 'aria-valuemin': 0, 'aria-valuemax': 30 }, fill);
    const events = el('span', { class: 'ch-events' });
    const head = el('div', { class: `city-head city-${c}` }, [el('b', { text: `${CITY_LABELS[c]} ●` }), count, bar, events]);
    cityHeads[c] = { head, count, fill, bar, events };
    root.append(head);
  }

  const sunFill = el('i');
  const sunText = el('b', { text: '20' });
  const sun = el('div', { class: 'hud-sun' }, [el('span', { text: '☀ 陽光' }), el('span', { class: 'sun-bar' }, sunFill), sunText]);
  const combo = el('div', { class: 'hud-combo', text: '' });
  const skills = {};
  const skillRow = el('div', { class: 'skill-row' });
  for (const def of Object.values(SKILL_DEFS)) {
    const cd = el('span', { class: 'sk-cd' });
    const btn = el('button', { class: 'skill', onclick: () => h.onSkill(def.id), 'aria-label': `${def.name}，消耗 ${def.sun_cost} 陽光` }, [
      el('span', { class: 'sk-icon', text: def.icon }),
      el('span', { class: 'sk-name', text: def.name }),
      el('span', { class: 'sk-cost', text: `☀${def.sun_cost}` }),
      cd,
    ]);
    skills[def.id] = { btn, cd };
    skillRow.append(btn);
  }
  const boxBtn = el('button', { class: 'skill box-toggle', 'aria-pressed': 'false', onclick: h.onBoxToggle }, [
    el('span', { class: 'sk-icon', text: '⬚' }),
    el('span', { class: 'sk-name', text: '框選' }),
    el('span', { class: 'sk-cost', text: '關' }),
  ]);
  skillRow.append(boxBtn);
  const hint = el('div', { class: 'hud-hint', 'aria-live': 'polite', text: '點人物 → 點集結區' });
  const signal = el('div', { class: 'signal-panel', hidden: true }, [el('span', { text: '📡 雙城訊號中斷：依序點 1→2→3 重新連線' })]);
  const signalBtns = el('div', { class: 'signal-btns' });
  signal.append(signalBtns);
  const bottom = el('div', { class: 'hud-bottom' }, [el('div', { class: 'hud-row' }, [sun, combo]), skillRow, hint, signal]);
  root.append(el('div', { class: 'hud-topwrap' }, [top]), bottom);

  const last = {};
  const set = (node, key, value, fn) => {
    if (last[key] === value) return;
    last[key] = value;
    fn(node, value);
  };

  return {
    root,
    insets() {
      const t = top.getBoundingClientRect();
      const b = bottom.getBoundingClientRect();
      return { top: t.bottom + 2, bottom: window.innerHeight - b.top + 2 };
    },
    placeCity(city, rect) {
      const hd = cityHeads[city].head;
      hd.style.left = `${rect.x}px`;
      hd.style.top = `${rect.y}px`;
      hd.style.width = `${rect.w}px`;
    },
    setAct(text) {
      countdown.querySelector('small').textContent = `${text}・剩餘`;
    },
    setClockLabel(label) {
      clock.querySelector('small').textContent = label;
    },
    setBox(on) {
      boxBtn.setAttribute('aria-pressed', String(on));
      boxBtn.classList.toggle('on', on);
      boxBtn.querySelector('.sk-cost').textContent = on ? '開' : '關';
    },
    hint(text) {
      set(hint, 'hint', text, (n, v) => (n.textContent = v));
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
    update(v) {
      set(clock.querySelector('b'), 'clock', v.clock, (n, x) => (n.textContent = x));
      set(countdown.querySelector('b'), 'cd', fmtTime(v.remaining), (n, x) => (n.textContent = x));
      countdown.classList.toggle('warn', v.remaining <= 10);
      set(score.querySelector('b'), 'score', fmtScore(v.score), (n, x) => (n.textContent = x));
      set(sunText, 'sun', Math.floor(v.sun), (n, x) => (n.textContent = `${x}/${v.sunCap}`));
      sunFill.style.width = `${(v.sun / v.sunCap) * 100}%`;
      set(combo, 'combo', v.combo, (n, x) => {
        n.textContent = x > 1 ? `COMBO ×${v.multiplier}（${x} 連）` : '';
        n.classList.toggle('hot', v.multiplier >= 3);
      });
      for (const c of CITIES) {
        const cv = v.cities[c];
        const ch = cityHeads[c];
        set(ch.count, `cc-${c}`, `${cv.arrived}/${cv.target}`, (n, x) => (n.textContent = x));
        ch.fill.style.width = `${Math.min(100, (cv.arrived / cv.target) * 100)}%`;
        ch.bar.setAttribute('aria-valuenow', Math.min(cv.arrived, cv.target));
        ch.head.classList.toggle('done', cv.arrived >= cv.target);
        set(ch.events, `ev-${c}`, cv.events, (n, x) => (n.textContent = x));
      }
      for (const [id, s] of Object.entries(skills)) {
        const r = v.skillReasons[id];
        const activeLeft = v.skillActive[id] || 0;
        const disabled = !!r;
        if (s.btn.disabled !== disabled) s.btn.disabled = disabled;
        s.btn.classList.toggle('active', activeLeft > 0);
        const label = activeLeft > 0 ? `${Math.ceil(activeLeft)}s` : v.skillCd[id] > 0 ? `${Math.ceil(v.skillCd[id])}` : r && r.startsWith('訊號') ? '✕' : '';
        set(s.cd, `cd-${id}`, label, (n, x) => (n.textContent = x));
        s.btn.title = r || '可施放';
      }
    },
    destroy() {
      root.remove();
    },
  };
}
