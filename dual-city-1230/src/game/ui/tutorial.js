// 6-step first-time tutorial (skippable; completion persisted).
import { App, persist } from '../app.js';
import { el, layer } from './dom.js';

export const TUTORIAL_STEPS = [
  { icon: '🏃', title: '① 你是帶頭的主角', text: '選好桃園廠或台中廠後，畫面會一直往前捲動。拖曳畫面（電腦用方向鍵／WASD）讓主角上下左右移動。' },
  { icon: '🟡', title: '② 黃色圈圈＝號召力', text: '路人只要進到你的黃色圈圈，就會加入、跟著你走。圈圈越大，一次能號召越多人。灰色「觀望中」的人群要號召力夠大才會加入。' },
  { icon: '🚪', title: '③ 選門', text: '路上會有左右兩道門：「+10 人」「人數 ×1.2」是好門，「-10 人」「號召力 -20」是陷阱。往你要的那一邊走過去！' },
  { icon: '🍱', title: '④ 道具', text: '📣大聲公 號召力變大、🍱便當 +5 人、☀️陽光 補能量、☕咖啡 兩者都有一點；💬謠言 會讓號召力變小，要閃開。' },
  { icon: '👔', title: '⑤ 小心困難', text: '主管會把夥伴拉回去開會、會議室會一直把人拉走、灰色「信心不足」霧氣讓號召力變小、塞車的車陣會卡住夥伴。' },
  { icon: '✨', title: '⑥ 技能與 Boss', text: '號召夥伴會累積能量，技能準備好就會發光：📣大聲號召、🛡️團結護盾、🔗雙城共鳴（吸人＋得分×1.5）。帶足人數抵達終點後，挑戰黑箱 Boss：用左下的搖桿移動準星，右手按「雙城合擊」！' },
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
