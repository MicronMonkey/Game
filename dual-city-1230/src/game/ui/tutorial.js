// 6-step first-time tutorial (skippable; completion persisted).
import { App, persist } from '../app.js';
import { el, layer } from './dom.js';

export const TUTORIAL_STEPS = [
  { icon: '👆', title: '① 選人', text: '點一下城市裡的 Q 版夥伴，腳下出現金色光圈就是選中了。可以連點多人。' },
  { icon: '📍', title: '② 指派', text: '再點「集結區」（金色圓圈），選中的人就會沿著道路走過去。手機可開「框選」一次框住多人；電腦直接用滑鼠拖曳。' },
  { icon: '☀️', title: '③ 陽光值', text: '每位夥伴抵達都會 +分數、+陽光。3 秒內連續抵達會累積 COMBO，倍率最高 ×5。黑衣夥伴額外 +2 陽光。' },
  { icon: '👟', title: '④ 技能', text: '午休衝刺（全體加速）、陽光照耀（掃開烏雲、叫醒疲勞人）、雙城共鳴（加速並加分）。按鈕會顯示冷卻秒數與不能施放的原因。' },
  { icon: '🔗', title: '⑤ 雙城', text: '桃園與台中同時進行，不會因為你看另一邊就暫停！留意排隊、迷路、開會、烏雲、訊號中斷等突發事件。' },
  { icon: '📦', title: '⑥ Boss', text: '拖曳手指或移動滑鼠瞄準黑箱的橘色弱點，持續命中 3 秒觸發暴擊。不論輸贏，最後都會看到 11/13 真實紀錄相簿。' },
];

export function showTutorial({ onDone }) {
  const root = layer('tutorial');
  let i = 0;
  const icon = el('div', { class: 'tut-icon' });
  const title = el('h2');
  const text = el('p');
  const dots = el('div', { class: 'dots' }, TUTORIAL_STEPS.map(() => el('span', { class: 'dot' })));
  const next = el('button', { class: 'btn primary' });
  const prev = el('button', { class: 'btn', text: '‹ 上一步' });
  const finish = () => {
    App.save.tutorialCompleted = true;
    persist();
    document.removeEventListener('keydown', onKey);
    root.remove();
    onDone?.();
  };
  const render = () => {
    const s = TUTORIAL_STEPS[i];
    icon.textContent = s.icon;
    title.textContent = s.title;
    text.textContent = s.text;
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    next.textContent = i === TUTORIAL_STEPS.length - 1 ? '開始！' : '下一步 ›';
    prev.disabled = i === 0;
  };
  next.onclick = () => (i < TUTORIAL_STEPS.length - 1 ? (i++, render()) : finish());
  prev.onclick = () => i > 0 && (i--, render());
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') next.click();
    if (e.key === 'ArrowLeft') prev.click();
    if (e.key === 'Escape') finish();
  };
  document.addEventListener('keydown', onKey);
  root.append(
    el('div', { class: 'tut-card', role: 'dialog', 'aria-label': '遊戲教學' }, [
      el('button', { class: 'btn ghost tut-skip', onclick: finish, text: '跳過教學' }),
      icon, title, text, dots,
      el('div', { class: 'modal-actions' }, [prev, next]),
    ]),
  );
  render();
  setTimeout(() => next.focus(), 30);
}
