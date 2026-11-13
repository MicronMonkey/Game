// 6-step first-time tutorial (skippable; completion persisted).
import { App, persist } from '../app.js';
import { el, layer } from './dom.js';

export const TUTORIAL_STEPS = [
  { icon: '🏭', title: '① 選廠區', text: '開始時選擇桃園廠或台中廠。你負責帶領這座廠，另一座廠是夥伴，會在上方自動同步前進。' },
  { icon: '👆', title: '② 一個一個點人', text: '點一位 Q 版夥伴，腳下出現金色光圈就是選中了；想多帶幾個人就一個一個點。再點一次可以取消。' },
  { icon: '📍', title: '③ 點目的地', text: '點金色「集結區」，選中的人就出發，路上會出現流動的 >>>> 箭頭指向目的地。紅色箭頭代表他走錯路了，再點他重新指引！' },
  { icon: '🔴', title: '④ 紅光 = 被干擾', text: '人物腳下發紅光就是被干擾：❓迷路、📢開會、🐢排隊。上方紅色標籤會寫出干擾內容與剩餘秒數，點畫面上的紅色標誌可以解除。' },
  { icon: '☀️', title: '⑤ 陽光技能條', text: '每位夥伴抵達都會補陽光。技能條上的刻度是三個技能的花費；技能生效時人物會發金光、出現殘影，上方有金色倒數，時間到就消失。' },
  { icon: '📦', title: '⑥ Boss：黑箱', text: '拖曳瞄準橘色弱點。光束掃過落下的黑幕可以燒掉它，累積「雙城合擊」大招；黑幕落地會削弱光束。最後依序擊破 1→2→3 三道鎖！' },
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
