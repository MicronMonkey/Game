// Generic modal + pause menu.
import { App, persist, reducedMotion, setSound } from '../app.js';
import { el, layer } from './dom.js';

export function modal({ title, body, actions = [], className = '', onClose }) {
  const root = layer(`modal-layer ${className}`);
  const prevFocus = document.activeElement;
  const close = () => {
    root.remove();
    document.removeEventListener('keydown', onKey);
    prevFocus?.focus?.();
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  const btns = actions.map((a) =>
    el('button', {
      class: `btn ${a.primary ? 'primary' : ''}`,
      onclick: () => {
        if (a.keepOpen) a.onClick?.();
        else {
          root.remove();
          document.removeEventListener('keydown', onKey);
          a.onClick?.();
        }
      },
      text: a.label,
    }),
  );
  const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('h2', { text: title }),
    el('div', { class: 'modal-body' }, body),
    el('div', { class: 'modal-actions' }, btns),
  ]);
  root.append(box);
  setTimeout(() => box.querySelector('button')?.focus(), 30);
  return { root, close };
}

export function settingsToggles() {
  const sound = el('button', {
    class: 'btn toggle',
    'aria-pressed': String(App.save.settings.soundEnabled),
    onclick: (e) => {
      const on = !App.save.settings.soundEnabled;
      setSound(on);
      e.currentTarget.setAttribute('aria-pressed', String(on));
      e.currentTarget.textContent = on ? '🔊 音效：開' : '🔇 音效：關';
    },
    text: App.save.settings.soundEnabled ? '🔊 音效：開' : '🔇 音效：關',
  });
  const motion = el('button', {
    class: 'btn toggle',
    'aria-pressed': String(App.save.settings.reducedMotion),
    onclick: (e) => {
      App.save.settings.reducedMotion = !App.save.settings.reducedMotion;
      persist();
      e.currentTarget.setAttribute('aria-pressed', String(App.save.settings.reducedMotion));
      e.currentTarget.textContent = App.save.settings.reducedMotion ? '🌙 減少動態：開' : '✨ 減少動態：關';
      document.documentElement.classList.toggle('reduce-motion', reducedMotion());
    },
    text: App.save.settings.reducedMotion ? '🌙 減少動態：開' : '✨ 減少動態：關',
  });
  return el('div', { class: 'toggles' }, [sound, motion]);
}

export function pauseMenu({ onResume, onRestart, onHome }) {
  return modal({
    title: '暫停中',
    className: 'pause',
    body: [el('p', { text: '計時、技能冷卻與 Buff 都已停止。' }), settingsToggles()],
    actions: [
      { label: '▶ 繼續遊戲', primary: true, onClick: onResume },
      { label: '↻ 重新開始', onClick: onRestart },
      { label: '⌂ 回到首頁', onClick: onHome },
    ],
    onClose: onResume,
  });
}
