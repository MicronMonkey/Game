// 11/13 真實紀錄相簿 (P0). Identical for Boss win, Boss loss, unmet targets, and direct
// access from the home screen. Photos come ONLY from public/data/event-photos.json —
// nothing is ever generated or substituted. Missing photos show "整理中".
import { App, persist } from '../app.js';
import { evaluateAchievements } from '../systems/achievements.js';
import { el, layer, toast } from './dom.js';

export const PHOTO_JSON = 'data/event-photos.json';
const CITY_INFO = {
  taoyuan: { name: '桃園', title: '桃園集結現場', missing: '桃園真實活動照片整理中' },
  taichung: { name: '台中', title: '台中集結現場', missing: '台中真實活動照片整理中' },
};

export function resolveSrc(src, base = import.meta.env.BASE_URL) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  return `${base}${src.replace(/^\.?\//, '')}`;
}

/** Validate/normalise the photo config; never throws. */
export function normalizePhotos(data) {
  const out = { taoyuan: [], taichung: [] };
  if (!data || typeof data !== 'object') return out;
  for (const c of Object.keys(out)) {
    const arr = Array.isArray(data[c]) ? data[c] : [];
    out[c] = arr
      .filter((p) => p && typeof p.src === 'string' && p.src.trim())
      .map((p) => ({ src: p.src.trim(), caption: String(p.caption || ''), credit: String(p.credit || ''), alt: String(p.alt || p.caption || `${CITY_INFO[c].name}活動照片`) }));
  }
  return out;
}

let cache = null;
export async function loadPhotos() {
  if (cache) return cache;
  try {
    const res = await fetch(resolveSrc(PHOTO_JSON), { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    cache = normalizePhotos(await res.json());
  } catch {
    cache = normalizePhotos(null); // 404 / bad JSON → both cities show 整理中
  }
  return cache;
}

function markViewed(city) {
  if (App.save.galleryViewed[city]) return;
  App.save.galleryViewed[city] = true;
  const unlocked = evaluateAchievements(App.save);
  persist();
  unlocked.forEach((a) => toast(`🏅 成就解鎖：${a.name}`, 'good'));
}

function carousel(city, photos, openLightbox) {
  const info = CITY_INFO[city];
  const section = el('section', { class: `album album-${city}`, 'data-city': city, 'aria-label': info.title });
  section.append(el('h3', {}, [el('span', { class: 'pin', text: '●' }), info.title]));
  if (!photos.length) {
    section.append(el('div', { class: 'photo-missing', role: 'status' }, [el('div', { class: 'pm-icon', text: '🗂️' }), el('p', { text: info.missing }), el('small', { text: '取得授權的真實照片後，只需更新 data/event-photos.json 即會顯示。' })]));
    return section;
  }
  let idx = 0;
  const track = el('div', { class: 'track' });
  const counter = el('span', { class: 'counter' });
  const caption = el('p', { class: 'caption' });
  const credit = el('small', { class: 'credit' });
  const dots = el('div', { class: 'dots', role: 'tablist' });
  const slides = photos.map((p, i) => {
    const img = el('img', { alt: p.alt, loading: i === 0 ? 'eager' : 'lazy', decoding: 'async', draggable: 'false' });
    img.addEventListener('error', () => {
      slide.replaceChildren(el('div', { class: 'photo-broken', text: '照片載入失敗' }));
    });
    img.src = resolveSrc(p.src);
    const slide = el('button', { class: 'slide', 'aria-label': `放大：${p.alt}`, onclick: () => openLightbox(photos, i) }, img);
    track.append(slide);
    dots.append(el('button', { class: 'dot', 'aria-label': `第 ${i + 1} 張`, onclick: () => go(i) }));
    return slide;
  });
  const go = (i) => {
    idx = (i + photos.length) % photos.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    counter.textContent = `${idx + 1} / ${photos.length}`;
    caption.textContent = photos[idx].caption;
    credit.textContent = photos[idx].credit ? `來源：${photos[idx].credit}` : '';
    [...dots.children].forEach((d, j) => d.setAttribute('aria-current', String(j === idx)));
    slides.forEach((s, j) => s.setAttribute('tabindex', j === idx ? '0' : '-1'));
  };
  const prev = el('button', { class: 'nav prev', 'aria-label': '上一張', onclick: () => go(idx - 1), text: '‹' });
  const next = el('button', { class: 'nav next', 'aria-label': '下一張', onclick: () => go(idx + 1), text: '›' });
  const viewport = el('div', { class: 'viewport', tabindex: '0', 'aria-roledescription': 'carousel' }, [track]);
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(idx - 1);
    if (e.key === 'ArrowRight') go(idx + 1);
  });
  swipe(viewport, (dir) => go(idx + dir));
  section.append(el('div', { class: 'stage' }, [prev, viewport, next]), el('div', { class: 'meta' }, [counter, caption, credit]), dots);
  go(0);
  return section;
}

function swipe(node, onSwipe) {
  let x0 = null;
  let y0 = null;
  node.addEventListener('pointerdown', (e) => {
    x0 = e.clientX;
    y0 = e.clientY;
  });
  node.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      onSwipe(dx < 0 ? 1 : -1);
      e.preventDefault();
    }
  });
}

function lightbox(photos, start, onClose) {
  let idx = start;
  const root = layer('lightbox');
  const img = el('img', { alt: '' });
  const cap = el('p', { class: 'lb-cap' });
  const show = () => {
    const p = photos[idx];
    img.onerror = () => {
      img.removeAttribute('src');
      cap.textContent = '照片載入失敗';
    };
    img.src = resolveSrc(p.src);
    img.alt = p.alt;
    cap.textContent = `${idx + 1} / ${photos.length}　${p.caption}${p.credit ? `（來源：${p.credit}）` : ''}`;
  };
  const close = () => {
    root.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Backspace') close();
    if (e.key === 'ArrowLeft') { idx = (idx - 1 + photos.length) % photos.length; show(); }
    if (e.key === 'ArrowRight') { idx = (idx + 1) % photos.length; show(); }
  };
  document.addEventListener('keydown', onKey);
  const stage = el('div', { class: 'lb-stage' }, img);
  swipe(stage, (d) => { idx = (idx + d + photos.length) % photos.length; show(); });
  root.append(
    el('button', { class: 'btn-icon lb-close', 'aria-label': '關閉', onclick: close, text: '✕' }),
    el('button', { class: 'nav prev', 'aria-label': '上一張', onclick: () => { idx = (idx - 1 + photos.length) % photos.length; show(); }, text: '‹' }),
    stage,
    el('button', { class: 'nav next', 'aria-label': '下一張', onclick: () => { idx = (idx + 1) % photos.length; show(); }, text: '›' }),
    cap,
  );
  show();
  setTimeout(() => root.querySelector('.lb-close').focus(), 30);
}

/**
 * Open the gallery. opts: { onReplay, onHome, onShare, result: {score, difficultyLabel, newHigh} }
 * The album part is built only from the photo JSON — `result` is shown in a separate strip
 * after the album and never changes which photos appear or their order.
 */
export async function openGallery(opts = {}) {
  const root = layer('gallery');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', '11/13 真實紀錄相簿');
  const close = () => {
    observer?.disconnect();
    document.removeEventListener('keydown', onKey);
    root.remove();
  };
  const onKey = (e) => {
    if (document.querySelector('.lightbox')) return;
    if (e.key === 'Escape' || (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement))) {
      close();
      opts.onHome?.();
    }
  };
  document.addEventListener('keydown', onKey);
  const inner = el('div', { class: 'gallery-inner' });
  root.append(inner);
  inner.append(
    el('header', { class: 'g-hero' }, [
      el('div', { class: 'g-date', text: '2026.11.13｜桃園 × 台中' }),
      el('h2', { text: '這一天，我們站在一起。' }),
      el('p', { text: '不同地點，同一時間，同一份信念。' }),
      el('small', { class: 'g-label', text: '活動紀錄（以下為真實照片區，與遊戲虛構畫面分開）' }),
    ]),
  );
  const loading = el('p', { class: 'g-loading', text: '相簿載入中…' });
  inner.append(loading);
  const photos = await loadPhotos();
  loading.remove();
  const open = (list, i) => lightbox(list, i);
  const tao = carousel('taoyuan', photos.taoyuan, open);
  const tai = carousel('taichung', photos.taichung, open);
  inner.append(tao, tai);
  inner.append(
    el('footer', { class: 'g-end' }, [
      el('p', { class: 'g-quote', text: '遊戲有輸贏，團結沒有終點。' }),
      el('p', { text: '謝謝每一位在 11/13 留下身影的夥伴。' }),
    ]),
  );
  if (opts.result) {
    const r = opts.result;
    inner.append(el('div', { class: 'g-result' }, [el('span', { text: `本局遊戲分數（${r.difficultyLabel}）` }), el('b', { text: r.score.toLocaleString('en-US') }), r.newHigh ? el('em', { text: '新紀錄！' }) : null]));
    if (r.newPerks?.length) inner.append(el('div', { class: 'g-perks' }, [el('b', { text: '🎒 新夥伴解鎖' }), ...r.newPerks.map((p) => el('span', { text: `${p.icon} ${p.name}：${p.effect}` })), el('small', { text: '回首頁「夥伴裝備」即可裝備' })]));
  }
  const actions = el('div', { class: 'g-actions' }, [
    opts.onReplay ? el('button', { class: 'btn primary', onclick: () => { close(); opts.onReplay(); }, text: '↻ 再玩一次' }) : null,
    opts.onShare ? el('button', { class: 'btn', onclick: () => opts.onShare(), text: '⤴ 分享遊戲成績' }) : null,
    el('button', { class: 'btn', onclick: () => { close(); opts.onHome?.(); }, text: '⌂ 回到首頁' }),
    el('button', { class: 'btn ghost', onclick: () => inner.scrollTo({ top: tao.offsetTop - 12, behavior: 'smooth' }), text: '▲ 觀看完整真實相簿' }),
  ]);
  inner.append(actions, el('p', { class: 'g-disclaimer', text: '遊戲分數為虛構遊戲設計，不代表活動實際人數。' }));
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && markViewed(en.target.dataset.city)),
      { root: inner, threshold: 0.35 },
    );
    observer.observe(tao);
    observer.observe(tai);
  } else {
    markViewed('taoyuan');
    markViewed('taichung');
  }
  setTimeout(() => actions.querySelector('button')?.focus({ preventScroll: true }), 50);
  return { root, close, photos };
}
