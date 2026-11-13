// First-run 5s opening: cloudy factories → Taiwan map with two lights → sunrise. Skippable.
import Phaser from 'phaser';
import { App, persist, reducedMotion } from '../app.js';
import { el, layer } from '../ui/dom.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';

// Very simplified, stylised island outline (not a precise map).
const TAIWAN = [
  [0.62, 0.05], [0.7, 0.12], [0.72, 0.25], [0.7, 0.4], [0.66, 0.55], [0.6, 0.7], [0.54, 0.85], [0.5, 0.95],
  [0.44, 0.86], [0.36, 0.7], [0.32, 0.55], [0.33, 0.4], [0.38, 0.27], [0.46, 0.16], [0.54, 0.08],
];

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('Intro');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const s = Math.min(w, h);
    this.cameras.main.setBackgroundColor('#0b0c10');
    const lines = ['2026 年 11 月 13 日', '中午 12:30', '不同地點，同一時間。'];
    const txt = this.add.text(w / 2, h * 0.16, '', { fontFamily: FONT, fontSize: `${Math.round(s * 0.055)}px`, color: '#F5F5F5', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
    // 1) cloudy factories
    const fac = this.add.graphics();
    fac.fillStyle(0x20242d, 1);
    for (let i = 0; i < 10; i++) fac.fillRect((w / 10) * i, h * 0.75 - (i % 3) * s * 0.04, w / 10 - 6, h * 0.3);
    const clouds = [];
    for (let i = 0; i < 5; i++) clouds.push(this.add.image((w / 5) * i + 40, h * 0.55, 'cloud').setScale(s / 180).setAlpha(0.9));
    // 2) map + two lights
    const map = this.add.graphics().setAlpha(0);
    const mx = w / 2 - s * 0.3;
    const my = h * 0.28;
    const ms = s * 0.6;
    map.fillStyle(0x2a2f3b, 1);
    map.lineStyle(3, 0x64748b, 1);
    map.fillPoints(TAIWAN.map(([x, y]) => ({ x: mx + x * ms, y: my + y * ms })), true);
    map.strokePoints(TAIWAN.map(([x, y]) => ({ x: mx + x * ms, y: my + y * ms })), true);
    const tao = this.add.image(mx + 0.6 * ms, my + 0.16 * ms, 'glow').setScale(0).setAlpha(1);
    const tai = this.add.image(mx + 0.45 * ms, my + 0.38 * ms, 'glow').setScale(0).setAlpha(1);
    const lbl = (x, y, t) => this.add.text(x, y, t, { fontFamily: FONT, fontSize: `${Math.round(s * 0.04)}px`, color: '#FFD447', fontStyle: 'bold' }).setOrigin(0, 0.5).setAlpha(0);
    const l1 = lbl(mx + 0.66 * ms, my + 0.16 * ms, '桃園');
    const l2 = lbl(mx + 0.51 * ms, my + 0.38 * ms, '台中');
    // 3) sun
    const sun = this.add.image(w / 2, h * 1.1, 'glow').setScale(s / 40);

    const quick = reducedMotion();
    this.time.delayedCall(0, () => txt.setText(lines[0]));
    this.time.delayedCall(1300, () => txt.setText(`${lines[0]}\n${lines[1]}`));
    this.time.delayedCall(2600, () => txt.setText(`${lines[0]}\n${lines[1]}\n${lines[2]}`));
    this.tweens.add({ targets: clouds, x: `+=${w}`, alpha: 0, delay: 900, duration: quick ? 300 : 1600 });
    this.tweens.add({ targets: fac, alpha: 0.25, delay: 1200, duration: 600 });
    this.tweens.add({ targets: [map, l1, l2], alpha: 1, delay: 1300, duration: 600 });
    this.tweens.add({ targets: [tao, tai], scale: s / 260, delay: 1900, duration: 700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sun, y: h * 0.72, delay: 3000, duration: quick ? 400 : 1600, ease: 'Sine.easeOut' });
    this.ui = layer('intro');
    this.ui.append(el('button', { class: 'btn skip', onclick: () => this.done(), text: '略過 ▶' }));
    this.time.delayedCall(5000, () => this.done());
    this.sys.events.once('shutdown', () => this.ui.remove());
  }

  done() {
    if (this.finished) return;
    this.finished = true;
    App.save.introSeen = true;
    persist();
    this.scene.start('Menu');
  }
}
