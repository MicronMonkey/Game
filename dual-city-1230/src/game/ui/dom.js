// Tiny DOM helpers for the HTML overlay UI (menus, HUD, gallery).
export function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}

export function uiRoot() {
  return document.getElementById('ui');
}

/** Mount a layer into #ui and return it with a destroy() helper. */
export function layer(className) {
  const n = el('div', { class: `layer ${className}` });
  uiRoot().append(n);
  return n;
}

export function clearUi() {
  uiRoot().replaceChildren();
}

export function toast(msg, kind = '') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = el('div', { id: 'toasts', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const t = el('div', { class: `toast ${kind}`, text: msg });
  box.append(t);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), 1800);
  setTimeout(() => t.remove(), 2300);
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtScore(n) {
  return Math.floor(n).toLocaleString('en-US');
}
