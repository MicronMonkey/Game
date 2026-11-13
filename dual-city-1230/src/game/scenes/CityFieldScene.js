// Shared base for Act 1 (GatheringScene) and Act 2 (SyncScene).
// The player runs ONE city (chosen on the menu); the partner city advances
// automatically (fictional) and is shown in the city strip.
import Phaser from 'phaser';
import { App, reducedMotion } from '../app.js';
import { BALANCE, CITY_LABELS, TUNING } from '../config.js';
import { Character, TYPE_NAMES } from '../entities/Character.js';
import { CityField } from '../entities/CityField.js';
import { addBonus, registerArrival, sprinterTimeBonus, tickCombo } from '../systems/GameState.js';
import { comboMultiplier, remainingSecondsBonus } from '../systems/scoring.js';
import { EVENT_DEFS, EventsSystem } from '../systems/EventsSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { Audio } from '../systems/AudioSystem.js';
import { createHud } from '../ui/hud.js';
import { toast } from '../ui/dom.js';
import { pauseMenu } from '../ui/modal.js';

const TYPE_WEIGHTS_EARLY = { lunch: 4, black: 3, volunteer: 1, lost: 1, sprinter: 1, tired: 1 };
const TYPE_WEIGHTS_LATE = { lunch: 3, black: 3, volunteer: 1.5, lost: 2, sprinter: 1.5, tired: 1.5 };
export const BUFF_COLORS = { lunch_sprint: 0xffd447, city_resonance: 0xff9f1c };

/** Partner city advances on its own; reaches its target at ~85% of acts 1+2 (faster while 雙城共鳴 is active). */
export function advanceAlly(run, dt, resonance) {
  const target = run.settings.targets[run.allyCity];
  const total = (run.settings.gatheringSeconds + run.settings.syncSeconds) * 0.85;
  run.allyProgress = Math.min(target + 6, (run.allyProgress || 0) + (target / total) * dt * (resonance ? 1.5 : 1));
  run.cities[run.allyCity].arrived = Math.floor(run.allyProgress);
}

export class CityFieldScene extends Phaser.Scene {
  // subclasses set: this.act (1|2)
  init() {
    this.paused = false;
    this.ended = false;
    this.elapsed = 0;
    this.lowFx = reducedMotion();
    this.rng = Math.random;
  }

  create() {
    const run = App.run;
    this.run = run;
    this.skills = run.skillSystem || (run.skillSystem = new SkillSystem(run));
    this.actSeconds = this.act === 1 ? run.settings.gatheringSeconds : run.settings.syncSeconds;
    this.remaining = this.actSeconds;
    this.cameras.main.setBackgroundColor('#101216');
    this.city = run.city;
    this.portrait = window.innerWidth / window.innerHeight < 0.95;
    this.field = new CityField(this, this.city, this.portrait);
    this.fields = { [this.city]: this.field };
    this.spawnTimer = 0.3;
    this.evsys = new EventsSystem(this, {
      interval: this.act === 1 ? TUNING.eventBaseIntervalGatheringLate : TUNING.eventBaseIntervalSync,
      frequency: run.settings.eventFrequency,
    });
    this.evsys.enabled = this.act === 2;
    this.hud = createHud({
      onPause: () => this.pauseGame(true),
      onSkill: (id) => this.castSkill(id),
    });
    this.hud.setCities(this.city, run.allyCity);
    this.hud.setAct(this.act === 1 ? '第一幕 午休集結' : '第二幕 雙城同步');
    this.hud.setClockLabel(this.act === 1 ? '遊戲內虛擬時間' : '雙城同步');

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointerup', this.onUp, this);
    this.keyHandler = (e) => this.onKey(e);
    window.addEventListener('keydown', this.keyHandler);
    this.visHandler = () => {
      if (document.hidden) this.pauseGame(true);
    };
    this.blurHandler = () => this.pauseGame(true);
    document.addEventListener('visibilitychange', this.visHandler);
    window.addEventListener('blur', this.blurHandler);
    this.cleanupFn = () => {
      this.scale.off('resize', this.layout, this);
      window.removeEventListener('keydown', this.keyHandler);
      document.removeEventListener('visibilitychange', this.visHandler);
      window.removeEventListener('blur', this.blurHandler);
      this.hud.destroy();
      this.pauseUi?.root.remove();
      this.field.destroy();
    };
    this.sys.events.once('shutdown', () => this.cleanupFn());

    // pre-populate a few gatherers so the field never starts empty
    const initial = this.act === 1 ? 4 : 6;
    for (let i = 0; i < initial; i++) this.spawn();
    Audio.music(this.act === 1 ? 'gather' : 'sync');
    App.hooks.scene = this;
    this.onCreateAct?.();
  }

  // ---------- layout ----------
  layout() {
    const dpr = App.dpr;
    const ins = this.hud.insets();
    const w = window.innerWidth;
    const maxW = Math.min(w, 1100);
    const r = { x: (w - maxW) / 2 + 6, y: ins.top, w: maxW - 12, h: Math.max(160, window.innerHeight - ins.top - ins.bottom) };
    this.layoutMode = this.portrait ? 'portrait' : 'landscape';
    this.field.place({ x: r.x * dpr, y: r.y * dpr, w: r.w * dpr, h: r.h * dpr });
  }

  // ---------- spawning ----------
  pickType() {
    const frac = this.act === 1 ? this.elapsed / this.actSeconds : 1;
    const w = frac < 0.33 ? TYPE_WEIGHTS_EARLY : TYPE_WEIGHTS_LATE;
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    let r = this.rng() * total;
    for (const [t, v] of Object.entries(w)) {
      r -= v;
      if (r <= 0) return t;
    }
    return 'lunch';
  }

  spawnInterval() {
    if (this.act === 2) return TUNING.spawnIntervalSync;
    const frac = this.elapsed / this.actSeconds;
    if (frac < 0.33) return TUNING.spawnIntervalEarly;
    if (frac < 0.66) return TUNING.spawnIntervalMid;
    return TUNING.spawnIntervalLate;
  }

  spawn() {
    const f = this.field;
    if (f.activeChars().length >= TUNING.maxPopulationPerCity) return null;
    const node = f.map.spawns[Math.floor(this.rng() * f.map.spawns.length)];
    const ch = new Character(f, this.pickType(), node, this.rng);
    f.chars.push(ch);
    return ch;
  }

  // ---------- input ----------
  // One at a time: tap a person (tap more people to add), then tap the gathering zone.
  onDown(p) {
    if (this.paused || this.ended) return;
    Audio.unlock();
    this.down = { x: p.x, y: p.y };
  }

  onUp(p) {
    const d = this.down;
    this.down = null;
    if (!d || this.paused || this.ended) return;
    if (Math.hypot(p.x - d.x, p.y - d.y) > 24 * App.dpr) return; // a swipe, not a tap
    if (!this.field.containsScreen(p.x, p.y)) return;
    this.tap(this.field, this.field.toField(p.x, p.y));
  }

  tap(f, pt) {
    const ev = f.eventAt(pt);
    if (ev) {
      Audio.sfx('click');
      if (ev.kind === 'queue') this.evsys.tapQueue(f.id, ev.key);
      else if (ev.kind === 'meeting') this.evsys.tapMeeting(f.id, ev.m);
      return;
    }
    const ch = f.charAt(pt, TUNING.selectRadius);
    if (ch) {
      ch.setSelected(!ch.selected);
      Audio.sfx('select');
      const n = f.selected().length;
      this.hud.hint(n ? `已選 ${n} 人（${TYPE_NAMES[ch.type]}）→ 點金色集結區出發` : '點人物 → 點集結區');
      return;
    }
    if (f.inZone(pt)) {
      this.orderSelected(f);
      return;
    }
    // tapping empty ground keeps the selection (no accidental loss) and points at the zone
    if (f.selected().length) {
      this.hud.hint('目的地是金色「集結區」，點它就出發！（再點人物可取消選取）');
      this.hud.flashHint();
      f.ripple(0xffd447);
    }
  }

  orderSelected(f) {
    const sel = f.selected();
    if (!sel.length) {
      this.hud.hint('先點一位人物，再點集結區');
      this.hud.flashHint();
      Audio.sfx('deny');
      return 0;
    }
    let n = 0;
    for (const ch of sel) {
      if (ch.orderToZone()) n++;
      ch.setSelected(false);
      if (this.rng() < 0.35) ch.say(ch.randomLine());
    }
    Audio.sfx('order');
    this.hud.hint(`${n} 人出發！看箭頭 >>> 指向集結區`);
    return n;
  }

  onKey(e) {
    if (this.ended) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (this.paused) this.resumeGame();
      else this.pauseGame(true);
      e.preventDefault();
      return;
    }
    if (this.paused) return;
    if (e.key === '1') this.castSkill('lunch_sprint');
    if (e.key === '2') this.castSkill('sunlight');
    if (e.key === '3') this.castSkill('city_resonance');
    if (e.key === ' ' || e.key === 'Enter') this.orderSelected(this.field);
  }

  // ---------- skills ----------
  castSkill(id) {
    if (this.paused || this.ended) return;
    Audio.unlock();
    const res = this.skills.cast(id);
    if (!res.ok) {
      Audio.sfx('deny');
      this.hud.hint(`無法施放：${res.reason}`);
      return;
    }
    Audio.sfx('skill');
    this.hud.pulseSkill(id);
    const f = this.field;
    if (id !== 'sunlight') {
      f.ripple(BUFF_COLORS[id]);
      for (const ch of f.chars) if (ch.active) f.burst(ch.x, ch.y - 14, 4, BUFF_COLORS[id]);
    }
    if (id === 'lunch_sprint') {
      this.hud.hint('👟 午休衝刺！全員移動 +40%（10 秒）');
      this.banner('午休衝刺', '全員加速 +40%');
    }
    if (id === 'city_resonance') {
      this.hud.hint(`🔗 雙城共鳴！速度 +30%、得分 ×1.5，${CITY_LABELS[this.run.allyCity]}夥伴也加速（10 秒）`);
      this.banner('雙城共鳴', '得分 ×1.5', '#FF9F1C');
    }
    if (id === 'sunlight') {
      f.sweep();
      const city = this.evsys.removeOneCloud();
      let rec = 0;
      for (const ch of f.chars) {
        if (ch.type === 'tired' && !ch.recovered && ch.active) {
          ch.recover();
          f.burst(ch.x, ch.y - 14, 8, 0xfff3b0);
          rec++;
        }
      }
      this.banner('陽光照耀', city ? '烏雲掃開！' : '疲勞人恢復', '#FFF3B0');
      this.hud.hint(city ? `☀️ 陽光照耀！烏雲掃開${rec ? `，${rec} 位疲勞人恢復` : ''}` : `☀️ 陽光照耀！${rec ? `${rec} 位疲勞人恢復速度` : '目前沒有烏雲或疲勞人'}`);
    }
    this.onSkillCast?.(id);
  }

  // ---------- events host callbacks ----------
  onEventStart(type, city) {
    Audio.sfx('event');
    const def = EVENT_DEFS[type];
    this.banner(`⚠ ${def.name}`, '紅光的人被干擾了', '#FF6B6B');
    this.hud.hint(def.hint);
    if (type === 'signal') {
      this.hud.showSignal((n, btn) => {
        const r = this.evsys.tapSignal(n);
        if (r === 'ok') this.hud.markSignal(n, true);
        if (r === 'reset') {
          this.hud.resetSignal();
          Audio.sfx('deny');
        }
        btn.blur();
      });
    }
  }

  onEventEnd(type, city, byPlayer) {
    if (type === 'signal') {
      this.hud.hideSignal();
      if (byPlayer) toast('金線恢復！雙城共鳴可再施放', 'good');
    } else if (byPlayer) {
      const msg = { queue: '排隊分流完成！', meeting: '通知彈飛，會議解散！', cloud: '陰雲被掃開！' }[type];
      if (msg) this.hud.hint(msg);
      this.field.ripple(0xf5f5f5);
    }
  }

  // ---------- arrival ----------
  onArrive(ch) {
    const f = ch.field;
    const res = registerArrival(this.run, f.id, ch.id, ch.type, {
      resonance: this.skills.resonanceActive(),
      sunFactor: f.sunFactor(),
      extraSun: ch.type === 'black' ? BALANCE.characters.black.extra_sun : 0,
    });
    ch.markArrived();
    if (!res) return; // already scored — impossible to double count
    f.floatText(ch.x, ch.y - 40, `+${res.points}`, this.skills.resonanceActive() ? '#FF9F1C' : '#FFD447', res.multiplier >= 3 ? 16 : 13);
    if (res.sunGain > 0) f.floatText(ch.x + 16, ch.y - 26, `☀+${+res.sunGain.toFixed(1)}`, f.cloud ? '#9aa3b5' : '#fff3b0', 10);
    if (!this.lowFx) f.burst(ch.x, ch.y - 10, res.multiplier >= 3 ? 12 : 6);
    f.addCrowdDot(ch.type);
    Audio.sfx('arrive', res.combo);
    if (ch.type === 'sprinter') {
      const g = sprinterTimeBonus(this.run, this.remaining, this.actSeconds);
      if (g > 0) {
        this.remaining += g;
        f.floatText(ch.x, ch.y - 56, `+${g}s`, '#7CF7C4', 12);
      }
    }
    if (this.rng() < 0.25) ch.say(ch.randomLine());
    const target = this.run.settings.targets[f.id];
    if (res.arrived === target) {
      Audio.sfx('goal');
      toast(`${CITY_LABELS[f.id]}收到！集結達標 ${target}/${target}`, 'good');
      f.ripple(0xffd447);
      this.onCityGoal?.(f.id);
    }
  }

  // ---------- pause ----------
  pauseGame(showMenu) {
    if (this.paused || this.ended) return;
    this.paused = true;
    this.tweens.pauseAll();
    Audio.pauseMusic();
    this.down = null;
    if (showMenu) {
      this.pauseUi = pauseMenu({
        onResume: () => this.resumeGame(),
        onRestart: () => this.restartRun(),
        onHome: () => this.goHome(),
      });
    }
  }

  resumeGame() {
    if (!this.paused) return;
    this.pauseUi?.root.remove();
    this.pauseUi = null;
    this.paused = false;
    this.tweens.resumeAll();
    Audio.resumeMusic();
  }

  restartRun() {
    this.pauseUi = null;
    this.ended = true;
    this.scene.start('Menu', { startDifficulty: this.run.difficulty, startCity: this.run.city });
  }

  goHome() {
    this.pauseUi = null;
    this.ended = true;
    App.run = null;
    this.scene.start('Menu');
  }

  // ---------- loop ----------
  update(time, deltaMs) {
    if (this.paused || this.ended) return;
    const dt = Math.min(0.1, deltaMs / 1000) * App.timeScale;
    this.elapsed += dt;
    this.remaining = Math.max(0, this.remaining - dt);
    this.run.runClock += dt;
    this.skills.tick(dt);
    // act 1: light events only in the last third
    if (this.act === 1 && !this.evsys.enabled && this.elapsed > this.actSeconds * 0.66) this.evsys.enabled = true;
    this.evsys.tick(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval() * (0.8 + this.rng() * 0.4);
      this.spawn();
    }
    const allyBefore = this.run.cities[this.run.allyCity].arrived;
    advanceAlly(this.run, dt, this.skills.resonanceActive());
    const allyTarget = this.run.settings.targets[this.run.allyCity];
    if (allyBefore < allyTarget && this.run.cities[this.run.allyCity].arrived >= allyTarget) {
      toast(`${CITY_LABELS[this.run.allyCity]}也收到了！夥伴廠達標`, 'good');
    }
    this.field.update(dt, { skillBonus: this.skills.speedBonus(), buffColor: this.buffColor() });
    tickCombo(this.run);
    this.checkEnd();
    this.updateHud();
  }

  /** Colour of the strongest active buff (resonance > sprint), or null. */
  buffColor() {
    if (this.skills.isActive('city_resonance')) return BUFF_COLORS.city_resonance;
    if (this.skills.isActive('lunch_sprint')) return BUFF_COLORS.lunch_sprint;
    return null;
  }

  /** Buff (gold) and interference (red) chips shown above the field. */
  statusChips() {
    const chips = [];
    const S = this.skills;
    const D = BALANCE.skills;
    if (S.isActive('lunch_sprint')) chips.push({ kind: 'buff', text: '👟 衝刺 速度+40%', left: S.active.lunch_sprint, total: D.lunch_sprint.duration_seconds });
    if (S.isActive('city_resonance')) chips.push({ kind: 'buff res', text: '🔗 共鳴 得分×1.5', left: S.active.city_resonance, total: D.city_resonance.duration_seconds });
    const f = this.field;
    if (f.cloud) chips.push({ kind: 'debuff', text: '☁️ 烏雲：陽光 -50%', left: f.cloud.time, total: TUNING.cloudSeconds });
    for (const q of f.queues.values()) chips.push({ kind: 'debuff', text: '🍱 排隊：道路變慢', left: q.time, total: TUNING.queueSeconds });
    const meet = f.meetings.reduce((n, m) => n + m.group.length, 0);
    if (meet) chips.push({ kind: 'debuff', text: `📢 開會：${meet} 人停住`, left: Math.max(...f.meetings.map((m) => m.time)), total: TUNING.meetingSeconds });
    const lost = f.chars.filter((c) => c.state === 'lost').length;
    if (lost) chips.push({ kind: 'debuff', text: `❓ 迷路 ${lost} 人：點他重新指引` });
    if (this.evsys.signal) chips.push({ kind: 'debuff', text: '📡 斷訊：共鳴封鎖', left: this.evsys.signal.time, total: 15 });
    return chips;
  }

  updateHud() {
    const run = this.run;
    const reasons = {};
    for (const id of Object.keys(this.skills.cooldowns)) reasons[id] = this.skills.reason(id);
    this.hud.update({
      clock: this.clockText(),
      remaining: this.remaining,
      score: this.run.score,
      sun: this.run.sun,
      sunCap: this.run.sunCapacity,
      combo: this.run.combo,
      multiplier: comboMultiplier(this.run.combo),
      mine: { arrived: run.cities[this.city].arrived, target: run.settings.targets[this.city] },
      ally: { arrived: run.cities[run.allyCity].arrived, target: run.settings.targets[run.allyCity] },
      chips: this.statusChips(),
      sunDebuff: !!this.field.cloud,
      scoreBoost: this.skills.resonanceActive(),
      skillReasons: reasons,
      skillCd: this.skills.cooldowns,
      skillActive: this.skills.active,
    });
  }

  finishAct(nextScene, data = {}) {
    if (this.ended) return;
    this.ended = true;
    this.input.off('pointerdown', this.onDown, this);
    this.scene.start(nextScene, data);
  }

  myCityReached() {
    return this.run.cities[this.city].arrived >= this.run.settings.targets[this.city];
  }

  banner(title, sub, color = '#FFD447') {
    const f = this.field;
    if (this.bannerObjs) this.bannerObjs.forEach((o) => o.destroy());
    const t = this.add.text(f.map.w / 2, f.map.h * 0.42, title, { fontFamily: 'system-ui, "Noto Sans TC", sans-serif', fontSize: '24px', fontStyle: 'bold', color, stroke: '#101216', strokeThickness: 6, resolution: 3 }).setOrigin(0.5);
    const s2 = this.add.text(f.map.w / 2, f.map.h * 0.42 + 26, sub, { fontFamily: 'system-ui, "Noto Sans TC", sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#F5F5F5', stroke: '#101216', strokeThickness: 4, resolution: 3 }).setOrigin(0.5);
    f.overLayer.add([t, s2]);
    this.bannerObjs = [t, s2];
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [t, s2], alpha: 0, delay: 900, duration: 400, onComplete: () => { t.destroy(); s2.destroy(); } });
  }

  grantRemainingBonus(label) {
    return addBonus(this.run, label, remainingSecondsBonus(this.remaining));
  }
}
