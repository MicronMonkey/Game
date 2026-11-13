// 第三幕「陽光照進黑箱」— aim the sunbeam (finger drag / mouse / arrow keys).
// See BossSystem for the rules: weakpoint + crits, burn falling 黑幕 to charge the
// 「雙城合擊」super, orbiting shield plates, and the final numbered locks.
import Phaser from 'phaser';
import { App, reducedMotion } from '../app.js';
import { BALANCE } from '../config.js';
import { BEAM_SRC, BOSS_BODY, BOSS_FIELD, BOSS_TUNING, BossSystem } from '../systems/BossSystem.js';
import { addBonus } from '../systems/GameState.js';
import { bossRemainingBonus } from '../systems/scoring.js';
import { Audio } from '../systems/AudioSystem.js';
import { el, fmtScore, fmtTime, layer, onPress, toast } from '../ui/dom.js';
import { pauseMenu } from '../ui/modal.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';

export class BossScene extends Phaser.Scene {
  constructor() {
    super('Boss');
  }

  init() {
    this.paused = false;
    this.ended = false;
    this.intro = 1.8;
  }

  create() {
    const run = App.run;
    this.run = run;
    this.lowFx = reducedMotion();
    this.cameras.main.setBackgroundColor('#0b0c10');
    const arrived = run.cities[run.city]?.arrived || 0;
    this.boss = new BossSystem({
      maxHp: run.settings.bossHp,
      seconds: run.settings.bossSeconds,
      initialDamage: run.bossInitialDamage,
      powerBonus: Math.min(0.3, arrived / 200),
    });
    this.aim = { x: 200, y: 200 };
    this.keys = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN');

    this.root = this.add.container(0, 0);
    this.bg = this.add.graphics();
    this.bossG = this.add.graphics();
    this.veilLayer = this.add.container(0, 0);
    this.cloudLayer = this.add.container(0, 0);
    this.beamG = this.add.graphics();
    this.fx = this.add.container(0, 0);
    this.dimRect = this.add.rectangle(200, 200, 400, 400, 0x000000, 0);
    this.root.add([this.bg, this.bossG, this.veilLayer, this.cloudLayer, this.beamG, this.fx, this.dimRect]);
    this.drawBackground();
    this.cloudSprites = [];
    this.veilSprites = new Map();

    this.buildHud();
    this.layout();
    this.scale.on('resize', this.layout, this);

    // Touch screens aim ONLY with the on-screen joystick (a finger on the field would hide
    // the target). A desktop mouse may still point directly; arrow keys also work.
    const onCanvas = (p) => !p.event || p.event.target === this.game.canvas;
    this.input.on('pointerdown', (p) => {
      Audio.unlock();
      if (this.paused || this.ended || !onCanvas(p) || p.wasTouch) return;
      this.setAimFromPointer(p);
    });
    this.input.on('pointermove', (p) => {
      if (this.paused || this.ended || p.wasTouch || !onCanvas(p)) return;
      this.setAimFromPointer(p);
    });
    this.keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.paused) this.resumeGame();
        else this.pauseGame();
      }
      if (e.key === ' ' || e.key === 'Enter') {
        this.trySuper();
        e.preventDefault();
      }
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
    this.banner('FINAL BOSS', '陽光照進黑箱！');
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
      el('div', { class: 'boss-hp' }, [el('small', {}, ['黑箱 HP ', this.phaseText]), el('span', { class: 'hp-bar', role: 'progressbar', 'aria-label': 'Boss 血量' }, [this.hpFill, el('span', { class: 'hp-mark', style: { left: '60%' } }), el('span', { class: 'hp-mark', style: { left: '20%' } })]), this.hpText]),
      el('div', { class: 'hud-score' }, [el('small', { text: '遊戲分數' }), this.scoreText]),
      el('button', { class: 'btn-icon', 'aria-label': '暫停', onclick: () => this.pauseGame(), text: '⏸' }),
    ]);
    this.chips = el('div', { class: 'status-chips' });
    this.hintText = el('div', { class: 'hud-hint', 'aria-live': 'polite', text: '用左下「瞄準」搖桿移動準星到橘色弱點；光束掃過黑幕可燒掉它！' });
    this.chargeFill = el('i');
    this.superFill = el('i');
    this.superBtn = el('button', { class: 'super-btn', disabled: true, 'aria-label': '雙城合擊' }, [
      el('span', { class: 'super-fill' }, this.superFill),
      el('span', { class: 'super-label' }, [el('b', { text: '🔆 雙城合擊' }), el('small', { text: '燒掉黑幕充能' })]),
    ]);
    onPress(this.superBtn, () => this.trySuper());
    this.joy = { x: 0, y: 0 };
    this.joyKnob = el('span', { class: 'joy-knob' });
    this.joyBase = el('div', { class: 'joy', role: 'application', 'aria-label': '武器控制器：拖曳移動瞄準點' }, [el('span', { class: 'joy-ring' }), this.joyKnob, el('small', { class: 'joy-label', text: '瞄準' })]);
    this.bindJoystick(this.joyBase);
    const bottom = el('div', { class: 'hud-bottom' }, [
      el('div', { class: 'charge' }, [el('span', { text: '暴擊充能' }), el('span', { class: 'charge-bar' }, this.chargeFill)]),
      el('div', { class: 'boss-controls' }, [this.joyBase, this.superBtn]),
      this.hintText,
    ]);
    this.hud.append(el('div', { class: 'hud-topwrap' }, [top, this.chips]), bottom);
    this.hudTop = this.chips;
    this.hudBottom = bottom;
  }

  /** Virtual joystick: deflection → reticle velocity. Uses pointer capture so it keeps
   *  tracking even when the thumb slides off, and works alongside the super button. */
  bindJoystick(base) {
    let id = null;
    const R = 46;
    const set = (e) => {
      const r = base.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      this.joy.x = dx / R;
      this.joy.y = dy / R;
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const reset = () => {
      id = null;
      this.joy.x = 0;
      this.joy.y = 0;
      this.joyKnob.style.transform = 'translate(0px, 0px)';
      base.classList.remove('on');
    };
    base.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      Audio.unlock();
      id = e.pointerId;
      base.setPointerCapture?.(e.pointerId);
      base.classList.add('on');
      set(e);
    });
    base.addEventListener('pointermove', (e) => e.pointerId === id && set(e));
    base.addEventListener('pointerup', (e) => e.pointerId === id && reset());
    base.addEventListener('pointercancel', (e) => e.pointerId === id && reset());
    base.addEventListener('lostpointercapture', (e) => e.pointerId === id && reset());
  }

  layout() {
    const dpr = App.dpr;
    const t = this.hudTop.getBoundingClientRect().bottom + 4;
    const b = window.innerHeight - this.hudBottom.getBoundingClientRect().top + 4;
    const w = window.innerWidth;
    const h = Math.max(200, window.innerHeight - t - b);
    const s = Math.min(w / BOSS_FIELD.w, h / BOSS_FIELD.h) * dpr;
    this.fieldScale = s;
    this.root.setScale(s).setPosition((w * dpr - BOSS_FIELD.w * s) / 2, t * dpr + (h * dpr - BOSS_FIELD.h * s) / 2);
  }

  setAimFromPointer(p) {
    const s = this.fieldScale;
    this.aim.x = Phaser.Math.Clamp((p.x - this.root.x) / s, 0, BOSS_FIELD.w);
    this.aim.y = Phaser.Math.Clamp((p.y - this.root.y) / s, 0, 360);
  }

  trySuper() {
    if (this.paused || this.ended) return;
    if (this.boss.activateSuper()) {
      Audio.sfx('skill');
      Audio.sfx('crit');
      this.banner('雙城合擊！', '光束全開，無視護盾', '#FF9F1C');
      if (!this.lowFx) this.cameras.main.flash(250, 255, 212, 71);
    } else {
      Audio.sfx('deny');
      this.hintText.textContent = `雙城合擊充能 ${Math.floor(this.boss.superMeter * 100)}%：用光束燒掉落下的黑幕！`;
    }
  }

  banner(title, sub, color = '#FFD447') {
    if (this.bannerObjs) this.bannerObjs.forEach((o) => o.destroy());
    const plate = this.add.rectangle(200, 290, 300, 62, 0x0b0c10, 0.82).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
    const t = this.add.text(200, 280, title, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color, stroke: '#101216', strokeThickness: 5, resolution: 3 }).setOrigin(0.5);
    const s = this.add.text(200, 306, sub, { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#F5F5F5', resolution: 3 }).setOrigin(0.5);
    this.fx.add([plate, t, s]);
    this.bannerObjs = [plate, t, s];
    t.setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [plate, t, s], alpha: 0, delay: 1300, duration: 500, onComplete: () => { plate.destroy(); t.destroy(); s.destroy(); } });
  }

  // ---------- drawing ----------
  drawBackground() {
    const g = this.bg;
    g.clear();
    g.fillStyle(0x15171d, 1);
    g.fillRoundedRect(0, 0, 400, 400, 14);
    // two cities' crowds at the bottom (the light comes from them)
    g.fillStyle(0x1f232c, 1);
    for (let i = 0; i < 6; i++) g.fillRect(6 + i * 22, 300 - (i % 3) * 18, 18, 100 + (i % 3) * 18);
    for (let i = 0; i < 6; i++) g.fillRect(262 + i * 22, 300 - ((i + 1) % 3) * 18, 18, 100 + ((i + 1) % 3) * 18);
    // ground line where veils land
    g.lineStyle(2, 0xe83b3b, 0.45);
    g.lineBetween(10, BOSS_TUNING.veilLandY, 390, BOSS_TUNING.veilLandY);
    for (let i = 0; i < 16; i++) {
      g.fillStyle(0x0b0b0e, 1);
      g.fillCircle(30 + i * 23, 382, 6);
      g.fillStyle(0xffd447, 0.8);
      g.fillCircle(30 + i * 23, 382 - 7, 1.6);
    }
    const lbl = (x, txt) => this.add.text(x, 384, txt, { fontFamily: FONT, fontSize: '10px', color: '#FFD447', resolution: 3 }).setOrigin(0.5, 0);
    this.root.add([lbl(46, '桃園'), lbl(354, '台中')]);
    g.fillStyle(0xffd447, 0.25);
    g.fillCircle(BEAM_SRC.x, BEAM_SRC.y, 36);
    g.fillStyle(0xffd447, 1);
    g.fillCircle(BEAM_SRC.x, BEAM_SRC.y, 18);
  }

  drawBoss(time) {
    const b = this.boss;
    const g = this.bossG;
    g.clear();
    const hitShake = (b.lastHit === 'weak' || b.lastHit === 'lock') && !this.lowFx ? Math.sin(time / 30) * 1.5 : 0;
    const cx = BOSS_BODY.x + hitShake;
    const cy = BOSS_BODY.y + Math.sin(time / 600) * 3;
    const w = BOSS_BODY.w;
    const h = BOSS_BODY.h;
    // aura
    g.fillStyle(0x6b1f2a, 0.18 + 0.08 * Math.sin(time / 300));
    g.fillCircle(cx, cy, 120);
    // 3D-ish black box
    g.fillStyle(0x2a2d36, 1);
    g.fillPoints([{ x: cx - w / 2, y: cy - h / 2 }, { x: cx - w / 2 + 22, y: cy - h / 2 - 18 }, { x: cx + w / 2 + 22, y: cy - h / 2 - 18 }, { x: cx + w / 2, y: cy - h / 2 }], true);
    g.fillStyle(0x1b1d24, 1);
    g.fillPoints([{ x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2 + 22, y: cy - h / 2 - 18 }, { x: cx + w / 2 + 22, y: cy + h / 2 - 18 }, { x: cx + w / 2, y: cy + h / 2 }], true);
    g.fillStyle(0x0c0d11, 1);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.lineStyle(2, 0x3a3e4a, 1);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    // eyes (angrier in later phases)
    g.fillStyle(0xe83b3b, 1);
    const tilt = b.phase * 4;
    g.fillTriangle(cx - 50, cy - 28 - tilt, cx - 18, cy - 20, cx - 44, cy - 12);
    g.fillTriangle(cx + 50, cy - 28 - tilt, cx + 18, cy - 20, cx + 44, cy - 12);
    // slot that drops veils
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - 50, cy + h / 2 - 8, 100, 6);
    // cracks grow with damage
    const cracks = Math.floor((1 - b.hp / b.maxHp) * 12);
    g.lineStyle(2, 0xffd447, 0.85);
    for (let i = 0; i < cracks; i++) {
      const sx = cx - w / 2 + 8 + ((i * 37) % (w - 16));
      const sy = cy - h / 2 + 8 + ((i * 53) % (h - 20));
      g.lineBetween(sx, sy, sx + 12, sy + 10);
      g.lineBetween(sx + 12, sy + 10, sx + 6, sy + 22);
    }
    // shield plates
    for (const pl of b.plates()) {
      g.fillStyle(0x3a3f4d, 1);
      g.fillCircle(pl.x, pl.y, pl.r);
      g.lineStyle(3, 0x9aa3b5, 1);
      g.strokeCircle(pl.x, pl.y, pl.r);
      g.fillStyle(0x101216, 1);
      g.fillRect(pl.x - 10, pl.y - 3, 20, 6);
    }
    if (b.phase === 3) {
      // chains + numbered locks, the current one glowing
      g.lineStyle(5, 0x9aa3b5, 0.9);
      g.lineBetween(cx - w / 2 - 10, cy - h / 2 - 10, cx + w / 2 + 10, cy + h / 2 + 10);
      g.lineBetween(cx + w / 2 + 10, cy - h / 2 - 10, cx - w / 2 - 10, cy + h / 2 + 10);
      b.locks.forEach((lk, i) => {
        if (lk.broken) return;
        const cur = i === b.lockIndex;
        if (cur) {
          g.fillStyle(0xe83b3b, 0.35 + 0.15 * Math.sin(time / 120));
          g.fillCircle(lk.x, lk.y, lk.r * 1.5);
        }
        g.fillStyle(cur ? 0xe83b3b : 0x5a2a30, 1);
        g.fillRoundedRect(lk.x - 14, lk.y - 6, 28, 22, 4);
        g.lineStyle(4, cur ? 0xf5f5f5 : 0x8a93a3, 1);
        g.beginPath();
        g.arc(lk.x, lk.y - 6, 9, Math.PI, 0);
        g.strokePath();
        if (cur && lk.hold > 0) {
          g.lineStyle(4, 0xffffff, 1);
          g.beginPath();
          g.arc(lk.x, lk.y + 2, lk.r + 6, -Math.PI / 2, -Math.PI / 2 + (lk.hold / BOSS_TUNING.lockHoldSeconds) * Math.PI * 2);
          g.strokePath();
        }
      });
    } else {
      const wp = b.weak;
      const pulse = 1 + Math.sin(time / 150) * 0.08;
      g.fillStyle(0xff9f1c, 0.35);
      g.fillCircle(wp.x, wp.y, wp.r * 1.35 * pulse);
      g.fillStyle(0xff9f1c, 1);
      g.fillCircle(wp.x, wp.y, wp.r * 0.55);
      g.lineStyle(3, 0xffd447, 1);
      g.strokeCircle(wp.x, wp.y, wp.r);
      if (b.charge > 0) {
        g.lineStyle(4, 0xffffff, 1);
        g.beginPath();
        g.arc(wp.x, wp.y, wp.r + 6, -Math.PI / 2, -Math.PI / 2 + (b.charge / BALANCE.boss.critical_charge_seconds) * Math.PI * 2);
        g.strokePath();
      }
    }
  }

  ensureLockLabels() {
    const b = this.boss;
    if (b.phase !== 3) return;
    if (!this.lockTexts) this.lockTexts = [];
    b.locks.forEach((lk, i) => {
      let t = this.lockTexts[i];
      if (!t) {
        t = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#FFFFFF', resolution: 3 }).setOrigin(0.5);
        this.fx.add(t);
        this.lockTexts[i] = t;
      }
      t.setPosition(lk.x, lk.y + 6).setText(String(lk.n)).setVisible(!lk.broken);
    });
  }

  drawBeam(time, firing) {
    const g = this.beamG;
    g.clear();
    const b = this.boss;
    const superOn = b.superTime > 0;
    // reticle
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(this.aim.x, this.aim.y, 12);
    g.lineBetween(this.aim.x - 18, this.aim.y, this.aim.x - 8, this.aim.y);
    g.lineBetween(this.aim.x + 8, this.aim.y, this.aim.x + 18, this.aim.y);
    if (!firing) return;
    let end = this.aim;
    if (b.lastHit === 'blocked' && b.blockedAt) end = b.blockedAt;
    const flick = this.lowFx ? 0 : Math.sin(time / 40) * 1.5;
    const weak = this.boss.landed.length > 0;
    const core = superOn ? 0xffffff : b.lastHit === 'weak' || b.lastHit === 'lock' ? 0xffffff : b.lastHit === 'blocked' ? 0x8a93a3 : 0xffd447;
    const glow = superOn ? 34 : 14;
    g.lineStyle(glow + flick, superOn ? 0xff9f1c : 0xff9f1c, superOn ? 0.45 : weak ? 0.12 : 0.25);
    g.lineBetween(BEAM_SRC.x, BEAM_SRC.y, end.x, end.y);
    g.lineStyle(superOn ? 14 : weak ? 3 : 6, core, 0.95);
    g.lineBetween(BEAM_SRC.x, BEAM_SRC.y, end.x, end.y);
    if (b.lastHit === 'blocked') {
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(end.x, end.y, 6 + Math.random() * 3);
    }
  }

  syncSprites() {
    const b = this.boss;
    while (this.cloudSprites.length < b.clouds.length) {
      const s = this.add.image(0, 0, 'cloud');
      this.cloudLayer.add(s);
      this.cloudSprites.push(s);
    }
    while (this.cloudSprites.length > b.clouds.length) this.cloudSprites.pop().destroy();
    b.clouds.forEach((c, i) => this.cloudSprites[i].setPosition(c.x, c.y).setDisplaySize(c.r * 2.4, c.r * 1.6));
    const alive = new Set();
    for (const v of b.veils) {
      alive.add(v.id);
      let s = this.veilSprites.get(v.id);
      if (!s) {
        s = this.add.image(v.x, v.y, 'veil');
        this.veilLayer.add(s);
        this.veilSprites.set(v.id, s);
      }
      s.setPosition(v.x, v.y).setRotation(Math.sin(v.y / 18) * 0.3);
      s.setTint(v.burn > 0 ? 0xff9f1c : 0xffffff);
    }
    for (const [id, s] of this.veilSprites) {
      if (!alive.has(id)) {
        s.destroy();
        this.veilSprites.delete(id);
      }
    }
  }

  impact(x, y, big, tint) {
    const n = this.lowFx ? 3 : big ? 14 : 2;
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, 'spark').setScale(big ? 1.4 : 0.8);
      if (tint) s.setTint(tint);
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
        this.scene.start('Menu', { startDifficulty: this.run.difficulty, startCity: this.run.city });
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
      const sp = 230 * dt;
      if (this.keys.LEFT.isDown) this.aim.x -= sp;
      if (this.keys.RIGHT.isDown) this.aim.x += sp;
      if (this.keys.UP.isDown) this.aim.y -= sp;
      if (this.keys.DOWN.isDown) this.aim.y += sp;
    }
    const jl = Math.hypot(this.joy.x, this.joy.y);
    if (jl > 0.08 && !this.paused) {
      // ease-in curve: small tilts for fine aiming, full tilt for fast sweeps
      const v = 300 * Math.pow(Math.min(1, jl), 1.4);
      this.aim.x += (this.joy.x / jl) * v * dt;
      this.aim.y += (this.joy.y / jl) * v * dt;
    }
    this.aim.x = Phaser.Math.Clamp(this.aim.x, 0, 400);
    this.aim.y = Phaser.Math.Clamp(this.aim.y, 0, 360);
    let firing = true;
    if (this.intro > 0) {
      this.intro -= dt;
      firing = false;
    }
    const evs = firing ? this.boss.tick(dt, this.aim) : [];
    if (firing) this.run.runClock += dt;
    for (const e of evs) this.onBossEvent(e);
    this.drawBoss(time);
    this.ensureLockLabels();
    this.syncSprites();
    this.drawBeam(time, firing);
    const hit = this.boss.lastHit;
    if (firing && (hit === 'weak' || hit === 'body' || hit === 'lock') && Math.random() < 0.5) this.impact(this.aim.x, this.aim.y, false);
    this.dimRect.fillAlpha = this.boss.landed.length ? 0.12 * Math.min(2, this.boss.landed.length) : 0;
    this.updateHud();
    if (this.boss.result) this.finish(this.boss.result);
  }

  onBossEvent(e) {
    switch (e.type) {
      case 'crit':
        Audio.sfx('crit');
        this.impact(e.x, e.y, true);
        this.floatText(e.x, e.y - 20, `暴擊 -${BALANCE.boss.critical_damage}`, '#FFFFFF', 18);
        if (!this.lowFx) this.cameras.main.shake(160, 0.006);
        break;
      case 'hit':
        if (Math.random() < 0.08) Audio.sfx('hit');
        break;
      case 'burn':
        Audio.sfx('arrive', 2);
        this.impact(e.x, e.y, false, 0xff9f1c);
        this.impact(e.x, e.y, false, 0xffffff);
        this.run.score += 30;
        this.floatText(e.x, e.y - 10, '+30 燒掉黑幕', '#FFD447', 11);
        if (e.superReady) {
          toast('🔆 雙城合擊充能完成！按按鈕或空白鍵', 'good');
          this.hintText.textContent = '🔆 雙城合擊就緒！按下去，光束全開、無視護盾';
        }
        break;
      case 'landed':
        Audio.sfx('deny');
        this.floatText(e.x, BOSS_TUNING.veilLandY - 12, '黑幕落地！光束 -25%', '#FF8080', 12);
        if (!this.lowFx) this.cameras.main.shake(120, 0.004);
        this.hintText.textContent = '黑幕落地會削弱光束！掃過落下的黑幕把它燒掉';
        break;
      case 'lockBroken':
        Audio.sfx('crit');
        this.impact(e.x, e.y, true, 0xffffff);
        this.floatText(e.x, e.y - 24, `鎖 ${e.n} 擊破！`, '#FFFFFF', 18);
        if (!this.lowFx) this.cameras.main.shake(180, 0.008);
        break;
      case 'attack':
        Audio.sfx('event');
        toast(`黑箱招式：${e.name}`, 'warn');
        this.hintText.textContent = e.name === '最後一道鎖' ? '最後一道鎖！依序瞄準亮紅色的鎖 1→2→3，持續照射 1 秒擊破' : '禁言烏雲擋住光束！從旁邊繞過去';
        break;
      case 'phase':
        Audio.sfx('boss');
        if (e.phase === 2) {
          this.banner('第二階段', '護盾環繞・弱點移動');
          this.hintText.textContent = '灰色護盾會擋光！趁空隙照射移動的弱點';
        }
        if (e.phase === 3) this.banner('最後一道鎖', '依序擊破 1→2→3', '#E83B3B');
        break;
      case 'super':
        break;
      default:
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
    this.superFill.style.width = `${(b.superTime > 0 ? b.superTime / BOSS_TUNING.superSeconds : b.superMeter) * 100}%`;
    const can = b.canSuper();
    if (this.superBtn.disabled === can) this.superBtn.disabled = !can;
    this.superBtn.classList.toggle('ready', can);
    this.superBtn.classList.toggle('active', b.superTime > 0);
    this.scoreText.textContent = fmtScore(this.run.score);
    const chips = [];
    if (b.powerBonus > 0) chips.push(`<span class="chip buff"><span>👥 夥伴之光 光束 +${Math.round(b.powerBonus * 100)}%</span></span>`);
    if (b.superTime > 0) chips.push(`<span class="chip buff res"><span>🔆 雙城合擊</span><b>${Math.ceil(b.superTime)}s</b></span>`);
    if (b.landed.length) chips.push(`<span class="chip debuff"><span>⬛ 黑幕落地 光束 -${Math.min(2, b.landed.length) * 25}%</span><b>${Math.ceil(Math.max(...b.landed))}s</b></span>`);
    const sig = chips.join('');
    if (sig !== this.lastChips) {
      this.lastChips = sig;
      this.chips.innerHTML = sig;
    }
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
    run.bossStats = { hp: Math.ceil(this.boss.hp), maxHp: this.boss.maxHp, crits: this.boss.crits, burned: this.boss.burned, time: this.boss.time };
    this.scene.start('Ending', { result });
  }
}
