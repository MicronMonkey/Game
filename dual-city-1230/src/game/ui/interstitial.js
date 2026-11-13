// Between-act summary card. Auto-continues; can be skipped.
import { el, fmtScore, layer } from './dom.js';

export function interstitial({ kicker = '', title, stars = null, lines = [], bonuses = [], button = '繼續', seconds = 4, onDone, className = '' }) {
  const root = layer(`interstitial ${className}`);
  let done = false;
  let timer = null;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    root.remove();
    onDone?.();
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') finish();
  };
  document.addEventListener('keydown', onKey);
  const card = el('div', { class: 'inter-card', role: 'dialog', 'aria-live': 'assertive' }, [
    kicker ? el('div', { class: 'kicker', text: kicker }) : null,
    stars != null ? el('div', { class: 'stars', 'aria-label': `${stars} 顆星` }, [1, 2, 3].map((n) => el('span', { class: n <= stars ? 'on' : '', style: { animationDelay: `${n * 0.18}s` }, text: '★' }))) : null,
    el('h2', { text: title }),
    stars != null ? el('small', { class: 'stars-hint', text: '★ 達標　★★ 1.5 倍　★★★ 2 倍' }) : null,
    ...lines.map((l) => el('p', { text: l })),
    bonuses.length
      ? el('ul', { class: 'bonus-list' }, bonuses.map((b) => el('li', {}, [el('span', { text: b.label }), el('b', { text: `+${fmtScore(b.points)}` })])))
      : null,
    el('button', { class: 'btn primary', onclick: finish, text: `${button} ▶` }),
    el('div', { class: 'auto-bar' }, el('i', { style: { animationDuration: `${seconds}s` } })),
  ]);
  root.append(card);
  timer = setTimeout(finish, seconds * 1000);
  setTimeout(() => card.querySelector('button')?.focus(), 30);
  return { finish };
}
