// Shared base for Act 1 (GatheringScene) and Act 2 (SyncScene).
// Both cities update every frame regardless of where the player is looking.
import Phaser from 'phaser';
import { App, computeLayout, reducedMotion } from '../app.js';
import { BALANCE, CITIES, CITY_LABELS, TUNING } from '../config.js';
import { Character, TYPE_NAMES } from '../entities/Character.js';
import { CityField } from '../entities/CityField.js';
import { addBonus, citiesReached, registerArrival, sprinterTimeBonus, tickCombo } from '../systems/GameState.js';
import { comboMultiplier, remainingSecondsBonus } from '../systems/scoring.js';
import { EVENT_DEFS, EventsSystem } from '../systems/EventsSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { Audio } from '../systems/AudioSystem.js';
import { createHud } from '../ui/hud.js';
import { toast } from '../ui/dom.js';
import { pauseMenu } from '../ui/modal.js';

const TYPE_WEIGHTS_EARLY = { lunch: 4, black: 3, volunteer: 1, lost: 1, sprinter: 1, tired: 1 };
const TYPE_WEIGHTS_LATE = { lunch: 3, black: 3, volunteer: 1.5, lost: 2, sprinter: 1.5, tired: 1.5 };

export class CityFieldScene extends Phaser.Scene {
  // subclasses set: this.act (1|2)
  init() {
    this.paused = false;
    this.ended = false;
    this.elapsed = 0;
    this.boxMode = false;
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
    this.fields = Object.fromEntries(CITIES.map((c) => [c, new CityField(this, c)]));
    this.spawnTimers = { taoyuan: 0.3, taichung: 0.9 };
    this.evsys = new EventsSystem(this, {
      interval: this.act === 1 ? TUNING.eventBaseIntervalGatheringLate : TUNING.eventBaseIntervalSync,
      frequency: run.settings.eventFrequency,
    });
    this.evsys.enabled = this.act === 2;
    this.boxGfx = this.add.graphics().setDepth(1000);

    this.hud = createHud({
      onPause: () => this.pauseGame(true),
      onSkill: (id) => this.castSkill(id),
      onBoxToggle: () => this.toggleBox(),
    });
    this.hud.setAct(this.act === 1 ? '第一幕 午休集結' : '第二幕 雙城同步');
    this.hud.setClockLabel(this.act === 1 ? '遊戲內虛擬時間' : '雙城同步');

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
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
      Object.values(this.fields).forEach((f) => f.destroy());
    };
    this.sys.events.once('shutdown', () => this.cleanupFn());

    // pre-populate a few gatherers so the field never starts empty
    const initial = this.act === 1 ? 3 : 5;
    for (const c of CITIES) for (let i = 0; i < initial; i++) this.spawn(c);
    Audio.music(this.act === 1 ? 'gather' : 'sync');
    App.hooks.scene = this;
    this.onCreateAct?.();
  }

  // ---------- layout ----------
  layout() {
    const dpr = App.dpr;
    const ins = this.hud.insets();
    const L = computeLayout(window.innerWidth, window.innerHeight, ins);
    this.layoutMode = L.mode;
    for (const c of CITIES) {
      const r = L[c];
      this.hud.placeCity(c, r);
      this.fields[c].place({ x: r.x * dpr, y: r.y * dpr, w: r.w * dpr, h: r.h * dpr }, 30 * dpr);
    }
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

  spawn(cityId) {
    const f = this.fields[cityId];
    if (f.activeChars().length >= TUNING.maxPopulationPerCity) return null;
    const node = f.map.spawns[Math.floor(this.rng() * f.map.spawns.length)];
    const ch = new Character(f, this.pickType(), node, this.rng);
    f.chars.push(ch);
    return ch;
  }

  // ---------- input ----------
  fieldAt(x, y) {
    return CITIES.map((c) => this.fields[c]).find((f) => f.containsScreen(x, y)) || null;
  }

  onDown(p) {
    if (this.paused || this.ended) return;
    Audio.unlock();
    const f = this.fieldAt(p.x, p.y);
    this.drag = f ? { field: f, x0: p.x, y0: p.y, x1: p.x, y1: p.y, box: this.boxMode, mouse: !p.wasTouch } : null;
  }

  onMove(p) {
    const d = this.drag;
    if (!d || !p.isDown) return;
    d.x1 = p.x;
    d.y1 = p.y;
    const far = Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 10 * App.dpr;
    if (!d.box && d.mouse && far) {
      // desktop: dragging with the mouse from anywhere draws a selection box
      const startField = d.field.toField(d.x0, d.y0);
      if (!d.field.charAt(startField, TUNING.selectRadius)) d.box = true;
    }
    if (d.box) {
      const r = d.field.rect;
      const x1 = Phaser.Math.Clamp(d.x1, r.x, r.x + r.w);
      const y1 = Phaser.Math.Clamp(d.y1, r.y, r.y + r.h);
      this.boxGfx.clear();
      this.boxGfx.fillStyle(0xffd447, 0.12);
      this.boxGfx.lineStyle(2 * App.dpr, 0xffd447, 1);
      this.boxGfx.fillRect(Math.min(d.x0, x1), Math.min(d.y0, y1), Math.abs(x1 - d.x0), Math.abs(y1 - d.y0));
      this.boxGfx.strokeRect(Math.min(d.x0, x1), Math.min(d.y0, y1), Math.abs(x1 - d.x0), Math.abs(y1 - d.y0));
    }
  }

  onUp(p) {
    const d = this.drag;
    this.drag = null;
    this.boxGfx.clear();
    if (!d || this.paused || this.ended) return;
    const f = d.field;
    const far = Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 10 * App.dpr;
    if (d.box && far) {
      const a = f.toField(d.x0, d.y0);
      const b = f.toField(d.x1, d.y1);
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      let n = 0;
      for (const ch of f.chars) {
        if (!ch.active) continue;
        const inside = ch.x >= minX && ch.x <= maxX && ch.y - 14 >= minY - 14 && ch.y <= maxY + 14;
        if (inside) {
          ch.setSelected(true);
          n++;
        }
      }
      if (n) {
        Audio.sfx('select');
        this.hud.hint(`${CITY_LABELS[f.id]}已選 ${f.selected().length} 人 → 點集結區`);
      }
      return;
    }
    this.tap(f, f.toField(p.x, p.y));
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
      this.hud.hint(n ? `${CITY_LABELS[f.id]}已選 ${n} 人（${TYPE_NAMES[ch.type]}）→ 點集結區` : '點人物 → 點集結區');
      return;
    }
    if (f.inZone(pt)) {
      this.orderSelected(f);
      return;
    }
    // tapping empty ground clears that city's selection
    if (f.selected().length) {
      f.selected().forEach((c) => c.setSelected(false));
      this.hud.hint('已取消選取');
    }
  }

  orderSelected(f) {
    const sel = f.selected();
    if (!sel.length) {
      this.hud.hint('先點人物（或開「框選」），再點集結區');
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
    this.hud.hint(`${CITY_LABELS[f.id]}：${n} 人出發！`);
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
    if (e.key === 'b' || e.key === 'B') this.toggleBox();
    // keyboard ordering: Q = Taoyuan zone, W = Taichung zone; A/S select all idle in a city
    if (e.key === 'q' || e.key === 'Q') this.orderSelected(this.fields.taoyuan);
    if (e.key === 'w' || e.key === 'W') this.orderSelected(this.fields.taichung);
    if (e.key === 'a' || e.key === 'A') this.selectAllIdle('taoyuan');
    if (e.key === 's' || e.key === 'S') this.selectAllIdle('taichung');
  }

  selectAllIdle(city) {
    const f = this.fields[city];
    f.chars.filter((c) => c.active && (c.state === 'idle' || c.state === 'lost' || c.state === 'walkIn')).forEach((c) => c.setSelected(true));
    this.hud.hint(`${CITY_LABELS[city]}已選 ${f.selected().length} 人`);
  }

  toggleBox() {
    this.boxMode = !this.boxMode;
    this.hud.setBox(this.boxMode);
    this.hud.hint(this.boxMode ? '框選模式：在城市畫面拖曳框住多人' : '點選模式：點人物 → 點集結區');
    Audio.sfx('click');
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
    for (const c of CITIES) this.fields[c].ripple(id === 'city_resonance' ? 0xff9f1c : 0xffd447);
    if (id === 'lunch_sprint') this.hud.hint('午休衝刺！兩城移動速度 +40%（10 秒）');
    if (id === 'city_resonance') this.hud.hint('雙城共鳴！速度 +30%、得分 +50%（10 秒）');
    if (id === 'sunlight') {
      const city = this.evsys.removeOneCloud();
      let rec = 0;
      for (const c of CITIES) {
        for (const ch of this.fields[c].chars) {
          if (ch.type === 'tired' && !ch.recovered && ch.active) {
            ch.recover();
            rec++;
          }
        }
      }
      this.hud.hint(city ? `陽光照耀！掃開${CITY_LABELS[city]}的烏雲${rec ? `，${rec} 位疲勞人恢復` : ''}` : `陽光照耀！${rec} 位疲勞人恢復速度`);
    }
    this.onSkillCast?.(id);
  }

  // ---------- events host callbacks ----------
  onEventStart(type, city) {
    Audio.sfx('event');
    const def = EVENT_DEFS[type];
    toast(`${CITY_LABELS[city]}｜${def.name}`, 'warn');
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
      if (msg) this.hud.hint(`${CITY_LABELS[city]}：${msg}`);
      this.fields[city].ripple(0xf5f5f5);
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
    f.floatText(ch.x, ch.y - 40, `+${res.points}`);
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
    this.drag = null;
    this.boxGfx.clear();
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
    this.scene.start('Menu', { startDifficulty: this.run.difficulty });
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
    for (const c of CITIES) {
      this.spawnTimers[c] -= dt;
      if (this.spawnTimers[c] <= 0) {
        this.spawnTimers[c] = this.spawnInterval() * (0.8 + this.rng() * 0.4);
        this.spawn(c);
      }
    }
    const bonus = this.skills.speedBonus();
    for (const c of CITIES) this.fields[c].update(dt, bonus);
    tickCombo(this.run);
    this.checkEnd();
    this.updateHud();
  }

  updateHud() {
    const cities = {};
    for (const c of CITIES) {
      cities[c] = { arrived: this.run.cities[c].arrived, target: this.run.settings.targets[c], events: this.evsys.summary(c) };
    }
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
      cities,
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

  bothReached() {
    return citiesReached(this.run) === 2;
  }

  grantRemainingBonus(label) {
    return addBonus(this.run, label, remainingSecondsBonus(this.remaining));
  }
}
