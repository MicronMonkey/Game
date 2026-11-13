// Home screen: Phaser background with Q-style gatherers walking, DOM menu on top.
import Phaser from 'phaser';
import { App, reducedMotion } from '../app.js';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../config.js';
import { CHAR_TYPES, charKey } from '../art/textures.js';
import { createRunState } from '../systems/GameState.js';
import { ACHIEVEMENTS } from '../systems/achievements.js';
import { Audio } from '../systems/AudioSystem.js';
import { el, fmtScore, layer } from '../ui/dom.js';
import { modal, settingsToggles } from '../ui/modal.js';
import { openGallery } from '../ui/gallery.js';
import { showTutorial } from '../ui/tutorial.js';

export const DISCLAIMER =
  '本作依 2026/11/13 桃園、台中同時集結活動發想，人物、對話、障礙、遊戲人數及 Boss 均為虛構遊戲設計，不代表當日實際情況。僅真實紀錄相簿使用經確認的活動照片。';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.startDifficulty = data?.startDifficulty || null;
    this.startCity = data?.startCity || null;
  }

  create() {
    App.run = null;
    App.hooks.scene = this;
    this.cameras.main.setBackgroundColor('#101216');
    this.walkers = [];
    this.drawBackdrop();
    this.scale.on('resize', this.drawBackdrop, this);
    this.buildMenu();
    Audio.music('menu');
    this.sys.events.once('shutdown', () => {
      this.scale.off('resize', this.drawBackdrop, this);
      this.ui.remove();
    });
    if (this.startDifficulty && this.startCity) this.startRun(this.startDifficulty, this.startCity);
  }

  drawBackdrop() {
    this.bg?.destroy();
    this.walkers.forEach((w) => w.s.destroy());
    this.walkers = [];
    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.add.graphics().setDepth(-10);
    this.bg = g;
    const sky = [0x101216, 0x15181f, 0x1b1f28];
    sky.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRect(0, (h * i) / 3, w, h / 3 + 1);
    });
    // sun glow behind title
    g.fillStyle(0xffd447, 0.08);
    g.fillCircle(w / 2, h * 0.22, Math.min(w, h) * 0.35);
    g.fillStyle(0xffd447, 0.12);
    g.fillCircle(w / 2, h * 0.22, Math.min(w, h) * 0.18);
    // factory silhouettes
    g.fillStyle(0x20242d, 1);
    const unit = Math.max(30, w / 14);
    for (let x = 0, i = 0; x < w; x += unit, i++) {
      const bh = h * (0.12 + ((i * 7) % 5) * 0.025);
      g.fillRect(x, h * 0.86 - bh, unit - 4, bh);
    }
    g.fillStyle(0x2a2f3b, 1);
    g.fillRect(0, h * 0.86, w, h * 0.14);
    const scale = Math.max(0.8, Math.min(1.6, h / 600)) * App.dpr * 0.75;
    const n = reducedMotion() ? 4 : 9;
    for (let i = 0; i < n; i++) {
      const type = CHAR_TYPES[i % CHAR_TYPES.length];
      const dirRight = i % 2 === 0;
      const s = this.add.image(Math.random() * w, h * 0.9 + (i % 3) * 6 * App.dpr, charKey(type, i % 3, 'side', 0)).setScale(scale).setFlipX(!dirRight).setOrigin(0.5, 1);
      this.walkers.push({ s, type, v: i % 3, speed: (30 + Math.random() * 40) * App.dpr * (dirRight ? 1 : -1), t: Math.random() * 3 });
    }
  }

  update(time, delta) {
    const dt = delta / 1000;
    const w = this.scale.width;
    for (const k of this.walkers) {
      k.t += dt;
      k.s.x += k.speed * dt * (reducedMotion() ? 0.3 : 1);
      if (k.s.x > w + 40) k.s.x = -40;
      if (k.s.x < -40) k.s.x = w + 40;
      k.s.setTexture(charKey(k.type, k.v, 'side', Math.floor(k.t * 6) % 2));
    }
  }

  buildMenu() {
    this.ui = layer('menu');
    const btn = (label, onclick, cls = '') => el('button', { class: `btn ${cls}`, onclick: () => { Audio.unlock(); Audio.sfx('click'); onclick(); } }, label);
    this.ui.append(
      el('div', { class: 'menu-card' }, [
        el('div', { class: 'menu-kicker', text: '2026.11.13 ・ 12:30' }),
        el('h1', {}, ['12:30！', el('br'), '雙城集結令']),
        el('div', { class: 'menu-en', text: '12:30 — Two Cities, One Voice' }),
        el('p', { class: 'menu-tag', text: '不同地點，同一時間。讓陽光照亮黑箱！' }),
        el('nav', { class: 'menu-buttons' }, [
          btn('▶ 開始遊戲', () => this.chooseDifficulty(), 'primary big'),
          btn('📖 遊戲教學', () => showTutorial({})),
          btn('🏆 最高紀錄', () => this.showRecords()),
          btn('📷 11/13 真實紀錄', () => this.openAlbum(), 'gold'),
        ]),
        settingsToggles(),
        el('button', { class: 'link', onclick: () => this.showDisclaimer(), text: '事件與遊戲免責說明' }),
      ]),
    );
  }

  chooseDifficulty() {
    const desc = {
      easy: '捲動較慢・障礙較少・Boss HP 800',
      normal: '標準速度與障礙・Boss HP 1000',
      hell: '捲動更快・主管更多・Boss HP 1250',
    };
    const m = modal({
      title: '選擇難度',
      body: [
        el('div', { class: 'diff-list' }, DIFFICULTIES.map((d) =>
          el('button', { class: `btn diff diff-${d}`, onclick: () => { m.close(); this.chooseCity(d); } }, [
            el('b', { text: DIFFICULTY_LABELS[d] }),
            el('small', { text: desc[d] }),
            el('small', { text: `最高分 ${fmtScore(App.save.scores[d].highest)}` }),
          ]))),
      ],
      actions: [{ label: '取消' }],
    });
  }

  chooseCity(difficulty) {
    const card = (id, name, sub, art) =>
      el('button', { class: `btn city-card city-${id}`, onclick: () => { m.close(); this.startRun(difficulty, id); } }, [
        el('span', { class: 'city-art', text: art }),
        el('b', { text: name }),
        el('small', { text: sub }),
      ]);
    const m = modal({
      title: '選擇你的廠區',
      body: [
        el('p', { class: 'small', text: '你是帶頭的主角：一路號召夥伴走到集結區。另一座廠由夥伴同步推進（虛構）。' }),
        el('div', { class: 'city-pick' }, [
          card('taoyuan', '桃園廠', '廠房・停車場・集結廣場', '🏭'),
          card('taichung', '台中廠', '工廠・綠地・裝置藝術前', '🌳'),
        ]),
      ],
      actions: [{ label: '返回', onClick: () => this.chooseDifficulty() }],
    });
  }

  startRun(difficulty, city) {
    const go = () => {
      App.run = createRunState(difficulty, city);
      this.scene.start('Gathering');
    };
    if (!App.save.tutorialCompleted) showTutorial({ onDone: go });
    else go();
  }

  showRecords() {
    const s = App.save;
    const rows = DIFFICULTIES.map((d) =>
      el('tr', {}, [
        el('th', { text: DIFFICULTY_LABELS[d] }),
        el('td', { text: fmtScore(s.scores[d].highest) }),
        el('td', { text: s.scores[d].bestClearSeconds != null ? `${s.scores[d].bestClearSeconds}s` : '—' }),
      ]),
    );
    modal({
      title: '最高紀錄（本機）',
      body: [
        el('table', { class: 'records' }, [el('thead', {}, el('tr', {}, [el('th', { text: '難度' }), el('th', { text: '最高遊戲分數' }), el('th', { text: '最佳通關' })])), el('tbody', {}, rows)]),
        el('p', { class: 'small', text: `遊玩 ${s.stats.played} 次・Boss 勝利 ${s.stats.bossWins} 次・最長連擊 ${s.stats.longestCombo}` }),
        el('h3', { text: '成就' }),
        el('ul', { class: 'ach-list' }, ACHIEVEMENTS.map((a) => el('li', { class: s.achievements.includes(a.id) ? 'got' : '' }, [el('b', { text: `${s.achievements.includes(a.id) ? '🏅' : '🔒'} ${a.name}` }), el('small', { text: a.desc })]))),
        el('p', { class: 'small', text: '各難度分開記錄；遊戲分數不代表實際活動人數。' }),
      ],
      actions: [{ label: '關閉', primary: true }],
    });
  }

  showDisclaimer() {
    modal({
      title: '事件與遊戲免責說明',
      body: [
        el('p', { text: DISCLAIMER }),
        el('p', { text: '遊戲內的突發事件（排隊、迷路、開會、烏雲、訊號中斷）與 Boss 皆為象徵性的喜劇設計，不代表當天真實發生，也不指涉任何特定個人。' }),
        el('p', { text: '本遊戲不蒐集姓名、聯絡方式、IP 或位置；紀錄只存在你的瀏覽器（localStorage：dualCity1230.save.v1）。' }),
      ],
      actions: [{ label: '我知道了', primary: true }],
    });
  }

  openAlbum() {
    this.ui.hidden = true;
    openGallery({ onHome: () => (this.ui.hidden = false) });
  }
}
