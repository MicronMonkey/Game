// 第三幕「陽光照進黑箱」— aim the sunbeam (finger drag / mouse / arrow keys).
import Phaser from 'phaser';
import { App, reducedMotion } from '../app.js';
import { BALANCE, TUNING } from '../config.js';
import { BOSS_BODY, BOSS_FIELD, BossSystem } from '../systems/BossSystem.js';
import { addBonus } from '../systems/GameState.js';
import { bossRemainingBonus } from '../systems/scoring.js';
import { Audio } from '../systems/AudioSystem.js';
import { el, fmtScore, fmtTime, layer, toast } from '../ui/dom.js';
import { pauseMenu } from '../ui/modal.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';

export class BossScene extends Phaser.Scene {
  constructor() {
    super('Boss');
  }

  init() {
    this.paused = false;
    this.ended = false;
    this.intro = 1.6;
  }

  create() {
    const run = App.run;
    this.run = run;
    this.lowFx = reducedMotion();
    this.cameras.main.setBackgroundColor('#0b0c10');
    this.boss = new BossSystem({ maxHp: run.settings.bossHp, seconds: run.settings.bossSeconds, initialDamage: run.bossInitialDamage });
    this.aim = { x: 200, y: 250 };
    this.keys = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN');

    this.root = this.add.container(0, 0);
    this.bg = this.add.graphics();
    this.bossG = this.add.graphics();
    this.cloudLayer = this.add.container(0, 0);
    this.beamG = this.add.graphics();
    this.fx = this.add.container(0, 0);
    this.root.add([this.bg, this.bossG, this.cloudLayer, this.beamG, this.fx]);
    this.drawBackground();
    this.cloudSprites = [];

    this.buildHud();
    this.layout();
    this.scale.on('resize', this.layout, this);

    this.input.on('pointerdown', (p) => {
      Audio.unlock();
      if (this.paused || this.ended) return;
      if (this.boss.frozen > 0) {
        this.thawTap();
        return;
      }
      this.setAimFromPointer(p);
    });
    this.input.on('pointermove', (p) => {
      if (this.paused || this.ended || this.boss.frozen > 0) return;
      if (p.isDown || !p.wasTouch) this.setAimFromPointer(p);
    });
    this.keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.paused) this.resumeGame();
        else this.pauseGame();
      }
      if ((e.key === ' ' || e.key === 'Enter') && this.boss.frozen > 0) this.thawTap();
    };
    window.addEventListener('keydown', this.keyHandler);
    this.visHandler = () => document.hidden && this.pauseGame();
    this.blurHandler = () => this.pauseGame();
    document.addEventListener('visibilitychange', this.visHandler);
    window.addEventListener('blur', this.blurHandler);
    this.sys.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      window.removeEventListener('keydown', this.keyHandler);
      document.removeEventListener('visibilitychange', this.visHandler);
      window.removeEventListener('blur', this.blurHandler);
      this.hud.remove();
      this.pauseUi?.root.remove();
    });

    Audio.music('boss');
    Audio.sfx('boss');
    this.banner('FINAL BOSS — 陽光照進黑箱！', run.bossInitialDamage ? `雙城之光先造成 ${run.bossInitialDamage} 傷害` : '拖曳手指／移動滑鼠瞄準弱點');
    App.hooks.scene = this;
  }

  // ---------- HUD (DOM) ----------
  buildHud() {
    this.hud = layer('hud boss-hud');
    this.hpFill = el('i');
    this.hpText = el('b', { text: '' });
    this.timeText = el('b', { text: '' });
    this.scoreText = el('b', { text: fmtScore(this.run.score) });
    this.phaseText = el('span', { class: 'phase', text: '階段 1' });
    const top = el('div', { class: 'hud-top' }, [
      el('div', { class: 'hud-count' }, [el('small', { text: '剩餘' }), this.timeText]),
      el('div', { class: 'boss-hp' }, [el('small', {}, ['黑箱 HP ', this.phaseText]), el('span', { class: 'hp-bar', role: 'progressbar', 'aria-label': 'Boss 血量' }, this.hpFill), this.hpText]),
      el('div', { class: 'hud-score' }, [el('small', { text: '遊戲分數' }), this.scoreText]),
      el('button', { class: 'btn-icon', 'aria-label': '暫停', onclick: () => this.pauseGame(), text: '⏸' }),
    ]);
    this.hintText = el('div', { class: 'hud-hint', 'aria-live': 'polite', text: '瞄準橘色弱點：持續命中 3 秒觸發暴擊' });
    this.chargeFill = el('i');
    this.thawBtn = el('button', { class: 'btn primary thaw', hidden: true, onclick: () => this.thawTap(), text: '❄ 解凍（點 4 下）' });
    const bottom = el('div', { class: 'hud-bottom' }, [
      el('div', { class: 'charge' }, [el('span', { text: '暴擊充能' }), el('span', { class: 'charge-bar' }, this.chargeFill)]),
      this.hintText,
      this.thawBtn,
    ]);
    this.hud.append(el('div', { class: 'hud-topwrap' }, top), bottom);
    this.hudTop = top;
    this.hudBottom = bottom;
  }

  layout() {
    const dpr = App.dpr;
    const t = this.hudTop.getBoundingClientRect().bottom + 4;
    const b = window.innerHeight - this.hudBottom.getBoundingClientRect().top + 4;
    const w = window.innerWidth;
    const h = Math.max(200, window.innerHeight - t - b);
    const s = Math.min(w / BOSS_FIELD.w, h / BOSS_FIELD.h) * dpr;
    this.fieldScale = s;
    this.root.setScale(s).setPosition(((w * dpr) - BOSS_FIELD.w * s) / 2, t * dpr + ((h * dpr) - BOSS_FIELD.h * s) / 2);
  }

  setAimFromPointer(p) {
    const s = this.fieldScale;
    this.aim.x = Phaser.Math.Clamp((p.x - this.root.x) / s, 0, BOSS_FIELD.w);
    this.aim.y = Phaser.Math.Clamp((p.y - this.root.y) / s, 0, BOSS_FIELD.h - 30);
  }

  thawTap() {
    if (this.boss.tapThaw()) {
      Audio.sfx('click');
      const left = TUNING.bossFreezeTapsToThaw - this.boss.thawTaps;
      if (this.boss.frozen > 0) this.thawBtn.textContent = `❄ 解凍（再 ${left} 下）`;
    }
  }

  banner(title, sub) {
    const t = this.add.text(200, 40, title, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#FFD447', stroke: '#101216', strokeThickness: 5, resolution: 3 }).setOrigin(0.5);
    const s = this.add.text(200, 64, sub, { fontFamily: FONT, fontSize: '12px', color: '#F5F5F5', stroke: '#101216', strokeThickness: 3, resolution: 3 }).setOrigin(0.5);
    this.fx.add([t, s]);
    this.tweens.add({ targets: [t, s], alpha: 0, delay: 1800, duration: 600, onComplete: () => { t.destroy(); s.destroy(); } });
  }

  // ---------- drawing ----------
  drawBackground() {
    const g = this.bg;
    g.clear();
    g.fillStyle(0x15171d, 1);
    g.fillRoundedRect(0, 0, 400, 400, 14);
    // city silhouettes left (桃園) and right (台中)
    g.fillStyle(0x1f232c, 1);
    for (let i = 0; i < 6; i++) g.fillRect(6 + i * 22, 300 - (i % 3) * 18 - 30, 18, 100 + (i % 3) * 18);
    for (let i = 0; i < 6; i++) g.fillRect(262 + i * 22, 300 - ((i + 1) % 3) * 18 - 30, 18, 100 + ((i + 1) % 3) * 18);
    g.fillStyle(0xffd447, 0.9);
    g.fillCircle(40, 300, 5);
    g.fillCircle(360, 300, 5);
    const lbl = (x, txt) => this.add.text(x, 312, txt, { fontFamily: FONT, fontSize: '11px', color: '#FFD447', resolution: 3 }).setOrigin(0.5, 0);
    this.root.add([lbl(40, '桃園'), lbl(360, '台中')]);
    // sun source
    g.fillStyle(0xffd447, 0.25);
    g.fillCircle(200, 398, 40);
    g.fillStyle(0xffd447, 1);
    g.fillCircle(200, 398, 22);
  }

  drawBoss(time) {
    const b = this.boss;
    const g = this.bossG;
    g.clear();
    const shake = b.lastHit === 'weak' && !this.lowFx ? Math.sin(time / 30) * 1.5 : 0;
    const cx = BOSS_BODY.x + shake;
    const cy = BOSS_BODY.y + Math.sin(time / 600) * 4;
    const w = BOSS_BODY.w;
    const h = BOSS_BODY.h;
    // 3D-ish black box
    g.fillStyle(0x2a2d36, 1);
    g.fillPoints([{ x: cx - w / 2, y: cy - h / 2 }, { x: cx - w / 2 + 22, y: cy - h / 2 - 18 }, { x: cx + w / 2 + 22, y: cy - h / 2 - 18 }, { x: cx + w / 2, y: cy - h / 2 }], true);
    g.fillStyle(0x1b1d24, 1);
    g.fillPoints([{ x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2 + 22, y: cy - h / 2 - 18 }, { x: cx + w / 2 + 22, y: cy + h / 2 - 18 }, { x: cx + w / 2, y: cy + h / 2 }], true);
    g.fillStyle(0x0c0d11, 1);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.lineStyle(2, 0x3a3e4a, 1);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    // "協議" stamp — symbolic, fictional
    g.fillStyle(0xe83b3b, 0.75);
    g.fillRect(cx - 30, cy + h / 2 - 26, 60, 16);
    // eyes
    g.fillStyle(0xe83b3b, 1);
    g.fillTriangle(cx - 46, cy - 30, cx - 18, cy - 22, cx - 42, cy - 16);
    g.fillTriangle(cx + 46, cy - 30, cx + 18, cy - 22, cx + 42, cy - 16);
    // cracks grow as HP drops
    const dmgFrac = 1 - b.hp / b.maxHp;
    g.lineStyle(2, 0xffd447, 0.8);
    const cracks = Math.floor(dmgFrac * 10);
    for (let i = 0; i < cracks; i++) {
      const sx = cx - w / 2 + ((i * 37) % w);
      const sy = cy - h / 2 + ((i * 53) % h);
      g.lineBetween(sx, sy, sx + 12, sy + 10);
      g.lineBetween(sx + 12, sy + 10, sx + 6, sy + 22);
    }
    // phase 3 chains / final lock
    if (b.phase === 3) {
      g.lineStyle(5, 0x9aa3b5, 1);
      g.lineBetween(cx - w / 2 - 10, cy - h / 2 - 10, cx + w / 2 + 10, cy + h / 2 + 10);
      g.lineBetween(cx + w / 2 + 10, cy - h / 2 - 10, cx - w / 2 - 10, cy + h / 2 + 10);
    }
    // shield (黑箱遮蔽)
    if (b.shield > 0) {
      g.fillStyle(0x000000, 0.55);
      g.fillRoundedRect(cx - w / 2 - 14, cy - h / 2 - 24, w + 40, h + 38, 12);
      g.lineStyle(3, 0x64748b, 0.9);
      g.strokeRoundedRect(cx - w / 2 - 14, cy - h / 2 - 24, w + 40, h + 38, 12);
    }
    // weakpoint
    const wp = b.weak;
    const pulse = 1 + Math.sin(time / 150) * 0.08;
    g.fillStyle(b.phase === 3 ? 0xe83b3b : 0xff9f1c, 0.35);
    g.fillCircle(wp.x, wp.y, wp.r * 1.35 * pulse);
    g.fillStyle(b.phase === 3 ? 0xe83b3b : 0xff9f1c, 1);
    g.fillCircle(wp.x, wp.y, wp.r * 0.55);
    g.lineStyle(3, 0xffd447, 1);
    g.strokeCircle(wp.x, wp.y, wp.r);
    if (b.phase === 3) {
      // padlock glyph
      g.lineStyle(3, 0xf5f5f5, 1);
      g.strokeCircle(wp.x, wp.y - 6, 6);
      g.fillStyle(0xf5f5f5, 1);
      g.fillRect(wp.x - 8, wp.y - 4, 16, 12);
    }
    // charge arc
    if (b.charge > 0) {
      g.lineStyle(4, 0xffffff, 1);
      g.beginPath();
      g.arc(wp.x, wp.y, wp.r + 6, -Math.PI / 2, -Math.PI / 2 + (b.charge / BALANCE.boss.critical_charge_seconds) * Math.PI * 2);
      g.strokePath();
    }
  }

  drawBeam(time, firing) {
    const g = this.beamG;
    g.clear();
    const b = this.boss;
    // reticle
    g.lineStyle(2, b.frozen > 0 ? 0x9bd1ff : 0xffffff, 0.9);
    g.strokeCircle(this.aim.x, this.aim.y, 12);
    g.lineBetween(this.aim.x - 18, this.aim.y, this.aim.x - 8, this.aim.y);
    g.lineBetween(this.aim.x + 8, this.aim.y, this.aim.x + 18, this.aim.y);
    if (b.frozen > 0) {
      g.fillStyle(0x9bd1ff, 0.45);
      g.fillRoundedRect(160, 350, 80, 40, 8);
      g.lineStyle(2, 0xe8f6ff, 1);
      g.strokeRoundedRect(160, 350, 80, 40, 8);
      return;
    }
    if (!firing) return;
    const flick = this.lowFx ? 0 : Math.sin(time / 40) * 1.5;
    const col = b.lastHit === 'weak' ? 0xffffff : b.lastHit === 'blocked' || b.lastHit === 'shield' ? 0x8a93a3 : 0xffd447;
    g.lineStyle(14 + flick, 0xff9f1c, 0.25);
    g.lineBetween(200, 390, this.aim.x, this.aim.y);
    g.lineStyle(6, col, 0.95);
    g.lineBetween(200, 390, this.aim.x, this.aim.y);
  }

  syncClouds() {
    const clouds = this.boss.clouds;
    while (this.cloudSprites.length < clouds.length) {
      const s = this.add.image(0, 0, 'cloud').setScale(0.9);
      this.cloudLayer.add(s);
      this.cloudSprites.push(s);
    }
    while (this.cloudSprites.length > clouds.length) this.cloudSprites.pop().destroy();
    clouds.forEach((c, i) => this.cloudSprites[i].setPosition(c.x, c.y).setDisplaySize(c.r * 2.4, c.r * 1.6));
  }

  impact(x, y, big) {
    const n = this.lowFx ? 3 : big ? 14 : 2;
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, 'spark').setScale(big ? 1.4 : 0.8);
      this.fx.add(s);
      const a = Math.random() * Math.PI * 2;
      const d = big ? 40 + Math.random() * 30 : 14;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: big ? 600 : 260, onComplete: () => s.destroy() });
    }
  }

  floatText(x, y, text, color = '#FFD447', size = 16) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#101216', strokeThickness: 4, resolution: 3 }).setOrigin(0.5);
    this.fx.add(t);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ---------- pause ----------
  pauseGame() {
    if (this.paused || this.ended) return;
    this.paused = true;
    this.tweens.pauseAll();
    Audio.pauseMusic();
    this.pauseUi = pauseMenu({
      onResume: () => this.resumeGame(),
      onRestart: () => {
        this.ended = true;
        this.scene.start('Menu', { startDifficulty: this.run.difficulty });
      },
      onHome: () => {
        this.ended = true;
        App.run = null;
        this.scene.start('Menu');
      },
    });
  }

  resumeGame() {
    if (!this.paused) return;
    this.pauseUi?.root.remove();
    this.pauseUi = null;
    this.paused = false;
    this.tweens.resumeAll();
    Audio.resumeMusic();
  }

  // ---------- loop ----------
  update(time, deltaMs) {
    if (this.paused || this.ended) return;
    const dt = Math.min(0.1, deltaMs / 1000) * App.timeScale;
    if (this.keys) {
      const sp = 220 * dt;
      if (this.boss.frozen <= 0) {
        if (this.keys.LEFT.isDown) this.aim.x -= sp;
        if (this.keys.RIGHT.isDown) this.aim.x += sp;
        if (this.keys.UP.isDown) this.aim.y -= sp;
        if (this.keys.DOWN.isDown) this.aim.y += sp;
        this.aim.x = Phaser.Math.Clamp(this.aim.x, 0, 400);
        this.aim.y = Phaser.Math.Clamp(this.aim.y, 0, 370);
      }
    }
    let firing = true;
    if (this.intro > 0) {
      this.intro -= dt;
      firing = false;
    }
    const aim = firing && this.boss.frozen <= 0 ? this.aim : null;
    const evs = firing ? this.boss.tick(dt, aim) : [];
    if (firing) this.run.runClock += dt;
    for (const e of evs) this.onBossEvent(e);
    this.drawBoss(time);
    this.syncClouds();
    this.drawBeam(time, !!aim);
    if (aim && (this.boss.lastHit === 'weak' || this.boss.lastHit === 'body') && Math.random() < 0.5) this.impact(aim.x, aim.y, false);
    this.updateHud();
    if (this.boss.result) this.finish(this.boss.result);
  }

  onBossEvent(e) {
    if (e.type === 'crit') {
      Audio.sfx('crit');
      this.impact(e.x, e.y, true);
      this.floatText(e.x, e.y - 20, `暴擊 -${BALANCE.boss.critical_damage}`, '#FFFFFF', 18);
      if (!this.lowFx) this.cameras.main.shake(160, 0.006);
    } else if (e.type === 'hit') {
      if (Math.random() < 0.08) Audio.sfx('hit');
    } else if (e.type === 'attack') {
      Audio.sfx('event');
      toast(`黑箱招式：${e.name}`, 'warn');
      const tips = {
        黑箱遮蔽: '黑箱遮蔽中：本體暫時無法受傷，等它散開！',
        冰封陽光: '陽光被冰封！點畫面或按「解凍」4 下',
        禁言烏雲: '禁言烏雲擋住光束！繞開雲朵瞄準',
        最後一道鎖: '最後一道鎖！只有持續命中鎖頭才有傷害',
      };
      this.hintText.textContent = tips[e.name] || e.name;
      if (e.name === '冰封陽光') {
        this.thawBtn.hidden = false;
        this.thawBtn.textContent = `❄ 解凍（點 ${TUNING.bossFreezeTapsToThaw} 下）`;
      }
    } else if (e.type === 'thawed') {
      this.thawBtn.hidden = true;
      this.hintText.textContent = '解凍成功！繼續照射';
    } else if (e.type === 'phase') {
      Audio.sfx('boss');
      if (e.phase === 2) this.banner('第二階段', '弱點開始移動，烏雲來襲');
      if (e.phase === 3) this.banner('最後一道鎖', '持續命中鎖頭！');
    }
  }

  updateHud() {
    const b = this.boss;
    this.hpFill.style.width = `${(b.hp / b.maxHp) * 100}%`;
    this.hpText.textContent = `${Math.ceil(b.hp)} / ${b.maxHp}`;
    this.timeText.textContent = fmtTime(b.time);
    this.timeText.parentElement.classList.toggle('warn', b.time <= 10);
    this.phaseText.textContent = `階段 ${b.phase}`;
    this.chargeFill.style.width = `${(b.charge / BALANCE.boss.critical_charge_seconds) * 100}%`;
    if (b.frozen <= 0 && !this.thawBtn.hidden) this.thawBtn.hidden = true;
    this.scoreText.textContent = fmtScore(this.run.score);
  }

  finish(result) {
    if (this.ended) return;
    this.ended = true;
    const run = this.run;
    run.bossResult = result;
    if (result === 'win') {
      addBonus(run, '擊敗黑箱', BALANCE.scoring.boss_kill_bonus);
      addBonus(run, 'Boss 剩餘秒數', bossRemainingBonus(this.boss.time));
      run.clearSeconds = Math.round(run.runClock);
    }
    run.bossStats = { hp: Math.ceil(this.boss.hp), maxHp: this.boss.maxHp, crits: this.boss.crits, time: this.boss.time };
    this.scene.start('Ending', { result });
  }
}
