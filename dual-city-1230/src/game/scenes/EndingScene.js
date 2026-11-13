// Win/lose transition (~4s, skippable) → the SAME real-photo gallery either way.
import Phaser from 'phaser';
import { App, persist, reducedMotion } from '../app.js';
import { citiesReached } from '../systems/GameState.js';
import { recordRun } from '../systems/Storage.js';
import { evaluateAchievements } from '../systems/achievements.js';
import { newlyUnlocked, unlockedPerks } from '../perks/perks.js';
import { Audio } from '../systems/AudioSystem.js';
import { TUNING } from '../config.js';
import { clearToasts, el, layer, toast } from '../ui/dom.js';
import { openGallery } from '../ui/gallery.js';
import { shareScore } from '../ui/shareCard.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';

export const ENDING_TEXT = {
  win: ['陽光照進黑箱！', '雙城的光，匯聚成希望。'],
  lose: ['黑箱尚未融化，陽光不會停止。', '下一次，我們會帶來更多光。'],
};

/** One concrete tip for next time, based on how the boss fight actually went. */
export function failTip(run) {
  const b = run?.bossStats || {};
  const tips = [];
  if (b.hp != null && b.maxHp && b.hp / b.maxHp < 0.15) tips.push(`只差 ${b.hp} HP！試試在護盾空隙放「雙城合擊」`);
  if ((b.landed || 0) >= 3) tips.push(`黑幕落地 ${b.landed} 次削弱了光束：看到白光黑幕先點它！`);
  if ((b.burned || 0) < 4) tips.push('燒掉黑幕可以累積「雙城合擊」，金色黑幕充能兩倍');
  tips.push('弱點移動或被干擾時，記得再點一次白光弱點');
  return `💡 ${tips[0]}`;
}

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  init(data) {
    this.result = data.result === 'win' ? 'win' : 'lose';
    this.done = false;
  }

  create() {
    const run = App.run;
    clearToasts();
    this.cameras.main.setBackgroundColor('#0b0c10');
    this.recordOnce(run);
    Audio.music('memory');
    Audio.setQuiet(true);
    Audio.sfx(this.result === 'win' ? 'win' : 'lose');
    this.drawTransition();
    const [t1, t2] = ENDING_TEXT[this.result];
    this.ui = layer('ending-transition');
    this.ui.append(
      el('div', { class: `end-card ${this.result}` }, [el('h2', { text: t1 }), el('p', { text: t2 }), this.result === 'lose' ? el('div', { class: 'end-tip' }, failTip(run)) : null]),
      el('button', { class: 'btn skip', onclick: () => this.toGallery(), text: '略過 ▶' }),
    );
    this.timer = this.time.delayedCall(TUNING.transitionSeconds * 1000, () => this.toGallery());
    this.sys.events.once('shutdown', () => {
      this.ui?.remove();
      this.gallery?.close();
      Audio.setQuiet(false);
    });
    App.hooks.scene = this;
  }

  recordOnce(run) {
    if (!run || run.recorded) return;
    run.recorded = true;
    const save = App.save;
    const bossWin = this.result === 'win';
    const bossFailedBefore = !!save.stats.bossFailedSinceWin;
    const perksBefore = unlockedPerks(save);
    const { newHigh } = recordRun(save, {
      difficulty: run.difficulty,
      score: run.score,
      longestCombo: run.longestCombo,
      bossWin,
      clearSeconds: run.clearSeconds,
      lunchArrivals: run.recruits || 0,
      skillsUsed: run.skillsUsed,
    });
    const unlocked = evaluateAchievements(save, { citiesReached: run.citiesReachedFinal ?? citiesReached(run), bossWin, difficulty: run.difficulty, bossFailedBefore });
    save.stats.bossFailedSinceWin = bossWin ? false : true;
    if ((run.stageArrived || []).length === 2 && !run.managerCaught) save.stats.noManagerRun = true;
    if ((run.stageStars || []).includes(3)) save.stats.threeStars = true;
    persist();
    run.newHigh = newHigh;
    run.newPerks = newlyUnlocked(perksBefore, unlockedPerks(save));
    unlocked.forEach((a, i) => setTimeout(() => toast(`🏅 成就解鎖：${a.name}`, 'good'), 600 + i * 700));
    run.newPerks.forEach((p, i) => setTimeout(() => toast(`🎒 新夥伴解鎖：${p.icon} ${p.name}（到首頁「夥伴裝備」裝備）`, 'good'), 600 + (unlocked.length + i) * 700));
  }

  drawTransition() {
    const w = this.scale.width;
    const h = this.scale.height;
    const s = Math.min(w, h) / 400;
    const g = this.add.graphics();
    const cx = w / 2;
    const cy = h / 2 - 40 * s;
    const lowFx = reducedMotion();
    // two city lights stay on in both endings
    g.fillStyle(0xffd447, 1);
    g.fillCircle(cx - 140 * s, cy + 120 * s, 8 * s);
    g.fillCircle(cx + 140 * s, cy + 120 * s, 8 * s);
    this.add.text(cx - 140 * s, cy + 136 * s, '桃園', { fontFamily: FONT, fontSize: `${12 * s}px`, color: '#FFD447' }).setOrigin(0.5, 0);
    this.add.text(cx + 140 * s, cy + 136 * s, '台中', { fontFamily: FONT, fontSize: `${12 * s}px`, color: '#FFD447' }).setOrigin(0.5, 0);
    if (this.result === 'win') {
      // golden shatter in slow motion
      for (let i = 0; i < (lowFx ? 6 : 26); i++) {
        const piece = this.add.rectangle(cx, cy, (10 + Math.random() * 18) * s, (10 + Math.random() * 18) * s, i % 3 ? 0x0c0d11 : 0xffd447);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({
          targets: piece, x: cx + Math.cos(a) * 180 * s, y: cy + Math.sin(a) * 180 * s, angle: Math.random() * 360, alpha: 0,
          duration: lowFx ? 800 : 3200, ease: 'Cubic.easeOut',
        });
      }
      const sun = this.add.image(cx, cy, 'glow').setScale(0.2 * s);
      this.tweens.add({ targets: sun, scale: 5 * s, duration: lowFx ? 600 : 3000, ease: 'Sine.easeOut' });
    } else {
      // black box remains, but the light keeps shining from both cities
      this.add.rectangle(cx, cy, 120 * s, 100 * s, 0x0c0d11).setStrokeStyle(2 * s, 0x3a3e4a);
      g.lineStyle(4 * s, 0xffd447, 0.6);
      g.lineBetween(cx - 140 * s, cy + 120 * s, cx - 30 * s, cy + 30 * s);
      g.lineBetween(cx + 140 * s, cy + 120 * s, cx + 30 * s, cy + 30 * s);
    }
  }

  toGallery() {
    if (this.done) return;
    this.done = true;
    this.timer?.remove();
    this.ui?.remove();
    this.ui = null;
    const run = App.run;
    const restart = run.difficulty;
    this.openedGallery = true;
    openGallery({
      result: { score: run.score, difficultyLabel: run.settings.label, newHigh: run.newHigh, newPerks: run.newPerks || [] },
      onReplay: () => this.scene.start('Menu', { startDifficulty: restart, startCity: run.city }),
      onHome: () => {
        App.run = null;
        this.scene.start('Menu');
      },
      onShare: () =>
        shareScore({
          score: run.score,
          difficultyLabel: run.settings.label,
          bossWin: run.bossResult === 'win',
          cities: {
            [run.city]: { arrived: run.cities[run.city].arrived, target: (run.stageTargets || []).reduce((a, b) => a + (b || 0), 0) || run.settings.targets[run.city] },
            [run.allyCity]: { arrived: run.cities[run.allyCity].arrived, target: run.settings.targets[run.allyCity] },
          },
        }),
    }).then((g) => (this.gallery = g));
  }
}
