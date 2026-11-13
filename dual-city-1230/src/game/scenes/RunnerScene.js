// Acts 1–2: auto-scrolling crowd runner. The protagonist moves freely (drag / arrows /
// WASD); everyone inside the yellow 號召力 circle joins and follows. Gates, items and
// obstacles change the crowd and the circle. Bring at least `target` people to the end.
import Phaser from 'phaser';
import { App, reducedMotion } from '../app.js';
import { BALANCE, CITY_LABELS } from '../config.js';
import { charKey, VARIANTS } from '../art/textures.js';
import { R, ITEM_DEFS, applyCount, clampBaseRadius, effectiveRadius, formationSlot, generateStage, hazardLoss } from '../runner/runnerLogic.js';
import { addBonus, addSun, registerRecruit, tickCombo } from '../systems/GameState.js';
import { comboMultiplier } from '../systems/scoring.js';
import { SKILL_DEFS, SkillSystem } from '../systems/SkillSystem.js';
import { Audio } from '../systems/AudioSystem.js';
import { createHud } from '../ui/hud.js';
import { toast } from '../ui/dom.js';
import { pauseMenu } from '../ui/modal.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';
const VW = R.view_width;
const MAX_FOLLOWER_SPRITES = 70;
const SIDE = 760; // scenery drawn beyond the road edges for wide screens

/** Partner city advances on its own (fictional); faster while 雙城共鳴 is active. */
export function advanceAlly(run, dt, resonance) {
  const target = run.settings.targets[run.allyCity];
  const total = (run.stageSeconds?.[0] || 60) + (run.stageSeconds?.[1] || 60);
  run.allyProgress = Math.min(target + 6, (run.allyProgress || 0) + (target / (total * 0.85)) * dt * (resonance ? 1.5 : 1));
  run.cities[run.allyCity].arrived = Math.floor(run.allyProgress);
}

export class RunnerScene extends Phaser.Scene {
  // subclasses set this.stage (0|1)
  init() {
    this.paused = false;
    this.ended = false;
    this.elapsed = 0;
    this.lowFx = reducedMotion();
  }

  create() {
    const run = App.run;
    this.run = run;
    this.skills = run.skillSystem || (run.skillSystem = new SkillSystem(run));
    this.city = run.city;
    const st = this.stage;
    const mult = BALANCE.runner.stage_target_multiplier[st];
    this.target = Math.round(run.settings.targets[this.city] * mult);
    // easy = slower scroll (more time), hell = faster
    this.scrollSpeed = R.scroll_speed[st] / run.settings.timeMultiplier;
    this.level = generateStage({ stage: st, difficulty: run.difficulty, target: this.target, seed: run.seed + st });
    run.stageSeconds = run.stageSeconds || [];
    run.stageSeconds[st] = this.level.length / this.scrollSpeed;
    this.scroll = 0;
    this.crowd = 0;
    this.baseRadius = R.radius_base;
    this.player = { x: VW / 2, d: 150, vx: 0, vd: 0, hitCd: 0, drainT: 0, flash: 0 };
    this.cameras.main.setBackgroundColor('#15171d');

    this.world = this.add.container(0, 0);
    this.bgG = this.add.graphics();
    this.hazardG = this.add.graphics();
    this.gateLayer = this.add.container(0, 0);
    this.itemLayer = this.add.container(0, 0);
    this.circleG = this.add.graphics();
    this.charLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);
    this.world.add([this.bgG, this.hazardG, this.gateLayer, this.itemLayer, this.circleG, this.charLayer, this.fxLayer]);
    this.drawStage();
    this.buildEntities();

    this.hero = this.add.image(0, 0, charKey('hero', 0, 'up', 0)).setOrigin(0.5, 0.92).setScale(0.78);
    this.heroTag = this.add.text(0, 0, '你', { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#101216', backgroundColor: '#FFD447', padding: { x: 3, y: 1 }, resolution: 3 }).setOrigin(0.5, 1);
    this.crowdTag = this.add.text(0, 0, '0', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#FFD447', stroke: '#101216', strokeThickness: 4, resolution: 3 }).setOrigin(0.5, 1);
    this.charLayer.add([this.hero]);
    this.fxLayer.add([this.heroTag, this.crowdTag]);
    this.followers = []; // sprites

    this.hud = createHud({ onPause: () => this.pauseGame(), onSkill: (id) => this.castSkill(id) });
    this.hud.setTitle(`${CITY_LABELS[this.city]}廠`, st === 0 ? '第一幕 午休集結' : '第二幕 雙城同步');
    this.layout();
    this.scale.on('resize', this.layout, this);

    this.keys = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D');
    // Relative steering, locked to ONE finger: the first touch that starts on the game
    // area steers; any other finger (e.g. tapping a skill button) is ignored here.
    const onCanvas = (p) => !p.event || p.event.target === this.game.canvas;
    this.input.on('pointerdown', (p) => {
      Audio.unlock();
      if (this.paused || this.ended || this.drag || !onCanvas(p)) return;
      this.drag = { id: p.id, px: p.x, py: p.y, x: this.player.x, rel: this.player.d - this.scroll };
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag || p.id !== this.drag.id || !p.isDown || this.paused || this.ended) return;
      const k = 1.3 / this.viewScale;
      this.dragTarget = { x: this.drag.x + (p.x - this.drag.px) * k, rel: this.drag.rel - (p.y - this.drag.py) * k };
    });
    const release = (p) => {
      if (this.drag && p.id !== this.drag.id) return;
      this.drag = null;
      this.dragTarget = null;
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.keyHandler = (e) => {
      if (this.ended) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.paused) this.resumeGame();
        else this.pauseGame();
        e.preventDefault();
      }
      if (this.paused) return;
      if (e.key === '1') this.castSkill('rally');
      if (e.key === '2') this.castSkill('shield');
      if (e.key === '3') this.castSkill('city_resonance');
      if (e.key.startsWith('Arrow')) e.preventDefault();
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
      this.hud.destroy();
      this.pauseUi?.root.remove();
    });
    Audio.music(st === 0 ? 'gather' : 'sync');
    App.hooks.scene = this;
    this.banner(st === 0 ? '午休集結！' : '雙城同步！', `帶 ${this.target} 人抵達集結區`);
    this.hud.hint('拖曳畫面（或方向鍵）移動，黃圈碰到的人會跟你走！');
  }

  // ---------- layout ----------
  layout() {
    const dpr = App.dpr;
    const ins = this.hud.insets();
    const w = window.innerWidth;
    const h = Math.max(240, window.innerHeight - ins.top - ins.bottom);
    let s = w / VW;
    if (h / s < 520) s = h / 520; // keep at least 520 units visible
    this.viewScale = s * dpr;
    this.viewH = h / s;
    this.areaTop = ins.top * dpr;
    this.ox = (w * dpr - VW * this.viewScale) / 2;
    this.world.setScale(this.viewScale);
    this.positionWorld();
  }

  positionWorld() {
    this.world.setPosition(this.ox, this.areaTop + (this.viewH + this.scroll) * this.viewScale);
  }

  // ---------- stage drawing ----------
  drawStage() {
    const g = this.bgG;
    const L = this.level.length;
    const top = -(L + 900);
    // city sides
    g.fillStyle(0x1a1d24, 1);
    g.fillRect(-SIDE, top, VW + SIDE * 2, L + 1300);
    // road + sidewalks
    g.fillStyle(0x2d323d, 1);
    g.fillRect(0, top, VW, L + 1300);
    g.fillStyle(0x3a404d, 1);
    g.fillRect(-14, top, 14, L + 1300);
    g.fillRect(VW, top, 14, L + 1300);
    g.lineStyle(2, 0x6b7385, 0.7);
    for (let d = -200; d < L + 900; d += 40) {
      g.lineBetween(VW / 3, -d, VW / 3, -d - 18);
      g.lineBetween((VW * 2) / 3, -d, (VW * 2) / 3, -d - 18);
    }
    // side factories / buildings
    const isTao = this.city === 'taoyuan';
    for (let d = -200, i = 0; d < L + 900; d += 120, i++) {
      for (const side of [-1, 1, -2, 2]) {
        const bw = 90 + ((i * 37) % 60);
        const far = Math.abs(side) === 2 ? 220 : 0;
        const x = side < 0 ? -20 - far - bw - ((i * 13) % 40) : VW + 20 + far + ((i * 17) % 40);
        const kind = (i + (side > 0 ? 1 : 0)) % 4;
        if (!isTao && kind === 2) {
          g.fillStyle(0x1f3a2c, 1);
          g.fillRoundedRect(x, -d - 90, bw, 80, 12);
          g.fillStyle(0x2f6b45, 1);
          g.fillCircle(x + 20, -d - 60, 10);
          g.fillCircle(x + bw - 24, -d - 40, 12);
        } else {
          g.fillStyle(0x2a2f3b, 1);
          g.fillRect(x, -d - 96, bw, 86);
          g.fillStyle(0x3a4254, 1);
          g.fillRect(x, -d - 96, bw, 8);
          g.fillStyle(0xffd447, 0.45);
          for (let wx = x + 8; wx < x + bw - 8; wx += 14) for (let wy = -d - 80; wy < -d - 18; wy += 14) if ((wx + wy) % 3) g.fillRect(wx, wy, 6, 5);
        }
      }
    }
    // crosswalks every so often
    g.fillStyle(0xd8dde6, 0.18);
    for (let d = 600; d < L - 300; d += 900) for (let x = 8; x < VW; x += 26) g.fillRect(x, -d, 14, 30);
    // start line
    g.fillStyle(0xf5f5f5, 0.5);
    g.fillRect(0, -100, VW, 4);
    // finish: gathering plaza
    this.finishD = L - 120;
    g.fillStyle(0x3a2f12, 1);
    g.fillRect(0, -(L + 900), VW, L + 900 - this.finishD);
    for (let x = 0; x < VW; x += 20) {
      g.fillStyle(((x / 20) | 0) % 2 ? 0xf5f5f5 : 0x101216, 1);
      g.fillRect(x, -this.finishD - 6, 20, 6);
      g.fillStyle(((x / 20) | 0) % 2 ? 0x101216 : 0xf5f5f5, 1);
      g.fillRect(x, -this.finishD - 12, 20, 6);
    }
    const glow = this.add.image(VW / 2, -this.finishD - 140, 'glow').setDisplaySize(380, 300).setAlpha(0.8);
    this.world.addAt(glow, 1);
    const label = isTao ? '集結廣場' : '裝置藝術前・集結區';
    const t = this.add.text(VW / 2, -this.finishD - 40, `🏁 ${label}`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#FFD447', stroke: '#101216', strokeThickness: 5, resolution: 3 }).setOrigin(0.5);
    const t2 = this.add.text(VW / 2, -this.finishD - 14, `目標 ${this.target} 人`, { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#F5F5F5', stroke: '#101216', strokeThickness: 3, resolution: 3 }).setOrigin(0.5);
    this.gateLayer.add([t, t2]);
  }

  buildEntities() {
    const lv = this.level;
    this.npcs = lv.npcs.map((n, i) => {
      const s = this.add.image(n.x, -n.d, charKey(n.type, i % VARIANTS, 'down', 0)).setOrigin(0.5, 0.92).setScale(0.6);
      this.charLayer.add(s);
      const o = { ...n, sprite: s, state: 'idle', t: Math.random() * 5 };
      if (n.need) s.setTint(0xb8c0cc);
      return o;
    });
    // need-group signs
    const groups = {};
    for (const n of this.npcs) if (n.need) (groups[n.group] ||= []).push(n);
    this.groupSigns = Object.values(groups).map((list) => {
      const cx = list.reduce((a, n) => a + n.x, 0) / list.length;
      const cd = Math.max(...list.map((n) => n.d));
      const sign = this.add.text(cx, -cd - 34, `觀望中 ${list.length} 人\n號召力 ≥ ${list[0].need} 才會加入`, { fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', align: 'center', color: '#101216', backgroundColor: '#B8C0CC', padding: { x: 4, y: 2 }, resolution: 3 }).setOrigin(0.5, 1);
      this.fxLayer.add(sign);
      return { list, sign, need: list[0].need };
    });
    // gates
    this.gates = lv.gates.map((g) => {
      const mk = (opt, x) => {
        const good = opt.op === '+' || (opt.op === '*' && opt.value > 1) || (opt.op === 'r' && opt.value > 0);
        const panel = this.add.rectangle(x, -g.d, VW / 2 - 8, 34, good ? 0x2e7d4f : 0x8a1f2a, 0.78).setStrokeStyle(3, good ? 0x7cf7c4 : 0xff8080);
        const label = this.add.text(x, -g.d, opt.label, { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#FFFFFF', stroke: '#101216', strokeThickness: 4, resolution: 3 }).setOrigin(0.5);
        this.gateLayer.add([panel, label]);
        return { panel, label };
      };
      return { ...g, L: mk(g.left, VW / 4), Rr: mk(g.right, (VW * 3) / 4) };
    });
    // items
    this.items = lv.items.map((it) => {
      const def = ITEM_DEFS[it.kind];
      const ring = this.add.circle(it.x, -it.d, 15, def.good ? 0xffd447 : 0xe83b3b, 0.25).setStrokeStyle(2, def.good ? 0xffd447 : 0xe83b3b);
      const icon = this.add.text(it.x, -it.d, def.icon, { fontFamily: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif', fontSize: '18px', resolution: 3 }).setOrigin(0.5);
      const cap = this.add.text(it.x, -it.d + 18, def.desc, { fontFamily: FONT, fontSize: '9px', fontStyle: 'bold', color: def.good ? '#FFD447' : '#FF8080', stroke: '#101216', strokeThickness: 3, resolution: 3 }).setOrigin(0.5, 0);
      this.itemLayer.add([ring, icon, cap]);
      return { ...it, ring, icon, cap };
    });
    // hazards
    this.hazards = lv.hazards.map((h) => {
      const o = { ...h };
      if (h.kind === 'manager') {
        o.sprite = this.add.image(h.x, -h.d, charKey('manager', 0, 'down', 0)).setOrigin(0.5, 0.92).setScale(0.72);
        o.tag = this.add.text(h.x, -h.d - 44, '主管', { fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: '#fff', backgroundColor: '#E83B3B', padding: { x: 3, y: 1 }, resolution: 3 }).setOrigin(0.5, 1);
        o.baseX = h.x;
        this.charLayer.add(o.sprite);
        this.fxLayer.add(o.tag);
      }
      if (h.kind === 'meeting' || h.kind === 'fog') {
        const label = h.kind === 'meeting' ? '📢 會議室\n進去會被拉走' : '☁️ 信心不足\n號召力變小';
        o.label = this.add.text(h.x, -h.d, label, { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', align: 'center', color: h.kind === 'meeting' ? '#FFD0D0' : '#E8EEF6', stroke: '#101216', strokeThickness: 3, resolution: 3 }).setOrigin(0.5);
        this.fxLayer.add(o.label);
      }
      return o;
    });
  }

  drawHazards(time) {
    const g = this.hazardG;
    g.clear();
    const lo = this.scroll - 80;
    const hi = this.scroll + this.viewH + 120;
    for (const h of this.hazards) {
      if (h.d < lo || h.d > hi) continue;
      if (h.kind === 'car') {
        g.fillStyle(0x000000, 0.35);
        g.fillRoundedRect(h.x - h.w / 2 + 2, -h.d - h.h / 2 + 3, h.w, h.h, 6);
        g.fillStyle(h.color, 1);
        g.fillRoundedRect(h.x - h.w / 2, -h.d - h.h / 2, h.w, h.h, 6);
        g.fillStyle(0x9bd1ff, 0.8);
        g.fillRect(h.x - h.w / 2 + 8, -h.d - h.h / 2 + 4, h.w - 16, 6);
        g.fillStyle(0xffd447, 1);
        g.fillCircle(h.x - h.w / 2 + 5, -h.d + h.h / 2 - 4, 2.5);
        g.fillCircle(h.x + h.w / 2 - 5, -h.d + h.h / 2 - 4, 2.5);
      } else if (h.kind === 'meeting') {
        g.fillStyle(0xe83b3b, 0.18 + 0.08 * Math.sin(time / 200));
        g.fillRoundedRect(h.x - h.w / 2, -h.d - h.h / 2, h.w, h.h, 10);
        g.lineStyle(2, 0xe83b3b, 0.9);
        g.strokeRoundedRect(h.x - h.w / 2, -h.d - h.h / 2, h.w, h.h, 10);
      } else if (h.kind === 'fog') {
        g.fillStyle(0x8a93a3, 0.28);
        g.fillEllipse(h.x, -h.d, h.w, h.h);
        g.fillStyle(0xb8c0cc, 0.18);
        g.fillEllipse(h.x - 30 + Math.sin(time / 700) * 10, -h.d - 10, h.w * 0.6, h.h * 0.6);
      } else if (h.kind === 'manager' && !h.used) {
        g.fillStyle(0xe83b3b, 0.15);
        g.fillCircle(h.sprite.x, -h.d - 14, 26);
        g.lineStyle(2, 0xe83b3b, 0.6);
        g.strokeCircle(h.sprite.x, -h.d - 14, 26);
      }
    }
  }

  // ---------- mechanics ----------
  radius() {
    let m = this.skills.radiusMultiplier();
    if (this.inFog && !this.skills.shielded()) m *= R.fog_radius_multiplier;
    return effectiveRadius(this.baseRadius, m);
  }

  changeCrowd(newCount, reason, color) {
    const before = this.crowd;
    this.crowd = Math.max(0, newCount);
    const diff = this.crowd - before;
    if (diff !== 0) this.floatAt(this.player.x, this.player.d + 40, `${diff > 0 ? '+' : ''}${diff} 人${reason ? ` ${reason}` : ''}`, color || (diff > 0 ? '#7CF7C4' : '#FF8080'), 15);
    if (diff < 0) {
      this.player.flash = 0.5;
      this.loseSprites(-diff);
    }
    this.syncFollowerSprites();
  }

  /** Remove follower sprites, running back down the road in red. */
  loseSprites(n, toward = null) {
    for (let i = 0; i < n && this.followers.length > this.crowd; i++) {
      const s = this.followers.pop();
      s.setTint(0xff6b6b);
      const tx = toward ? toward.x : s.x + (Math.random() - 0.5) * 60;
      const ty = toward ? toward.y : s.y + 120;
      this.tweens.add({ targets: s, x: tx, y: ty, alpha: 0, duration: 700, onComplete: () => s.destroy() });
    }
  }

  syncFollowerSprites() {
    const want = Math.min(this.crowd, MAX_FOLLOWER_SPRITES);
    while (this.followers.length > want) this.followers.pop().destroy();
    while (this.followers.length < want) {
      const types = ['lunch', 'black', 'volunteer', 'lost', 'sprinter', 'tired'];
      const s = this.add.image(this.player.x + (Math.random() - 0.5) * 20, -this.player.d + 10, charKey(types[this.followers.length % 6], this.followers.length % 3, 'up', 0)).setOrigin(0.5, 0.92).setScale(0.52);
      this.charLayer.add(s);
      this.followers.push(s);
    }
  }

  recruit(npc) {
    npc.state = 'following';
    const res = registerRecruit(this.run, { resonance: this.skills.resonanceActive() });
    addSun(this.run, R.sun_per_recruit);
    this.crowd += 1;
    // the NPC's own sprite becomes a follower (if there is room) for a nice "join" moment
    if (this.followers.length < MAX_FOLLOWER_SPRITES) {
      npc.sprite.clearTint();
      npc.sprite.setScale(0.52);
      this.followers.push(npc.sprite);
    } else npc.sprite.destroy();
    this.recruitBatch = (this.recruitBatch || 0) + 1; // merged into one "+N 人" popup
    if (!this.lowFx) this.burst(npc.x, npc.d + 14, 4);
    Audio.sfx('arrive', res.combo);
  }

  applyGate(opt) {
    if (opt.op === 'r') {
      this.baseRadius = clampBaseRadius(this.baseRadius + opt.value);
      this.floatAt(this.player.x, this.player.d + 46, opt.label, opt.value > 0 ? '#FFD447' : '#FF8080', 16);
      Audio.sfx(opt.value > 0 ? 'skill' : 'deny');
      return;
    }
    if (opt.op === '-' && this.skills.shielded()) {
      this.floatAt(this.player.x, this.player.d + 46, '🛡️ 護盾擋下！', '#7FE7FF', 15);
      return;
    }
    const n = applyCount(this.crowd, opt.op, opt.value);
    this.changeCrowd(n, '', n >= this.crowd ? '#7CF7C4' : '#FF8080');
    Audio.sfx(n >= this.crowd ? 'goal' : 'deny');
  }

  applyItem(it) {
    it.used = true;
    const def = ITEM_DEFS[it.kind];
    this.tweens.add({ targets: [it.ring, it.icon, it.cap], alpha: 0, scale: 1.8, duration: 300 });
    if (it.kind === 'rumor' && this.skills.shielded()) {
      this.floatAt(it.x, it.d + 30, '🛡️ 謠言無效', '#7FE7FF', 13);
      return;
    }
    if (it.kind === 'megaphone') this.baseRadius = clampBaseRadius(this.baseRadius + 15);
    if (it.kind === 'coffee') {
      this.baseRadius = clampBaseRadius(this.baseRadius + 8);
      addSun(this.run, 10);
    }
    if (it.kind === 'sun') addSun(this.run, 25);
    if (it.kind === 'rumor') this.baseRadius = clampBaseRadius(this.baseRadius - 15);
    if (it.kind === 'bento') this.changeCrowd(applyCount(this.crowd, '+', 5), '便當');
    else this.floatAt(it.x, it.d + 30, `${def.icon} ${def.desc}`, def.good ? '#FFD447' : '#FF8080', 13);
    Audio.sfx(def.good ? 'select' : 'deny');
    if (def.good && !this.lowFx) this.burst(it.x, it.d, 8);
  }

  updateHazards(dt, rad) {
    const p = this.player;
    const shield = this.skills.shielded();
    this.inFog = false;
    let inMeeting = false;
    for (const h of this.hazards) {
      if (Math.abs(h.d - p.d) > 400) continue;
      if (h.kind === 'car') {
        // push the protagonist out of the car rectangle
        const hx = h.w / 2 + 9;
        const hy = h.h / 2 + 9;
        const dx = p.x - h.x;
        const dd = p.d - h.d;
        if (Math.abs(dx) < hx && Math.abs(dd) < hy) {
          if (hx - Math.abs(dx) < hy - Math.abs(dd)) p.x = h.x + Math.sign(dx || 1) * hx;
          else p.d = h.d + Math.sign(dd || -1) * hy;
          if (p.hitCd <= 0) {
            p.hitCd = 1.0;
            if (shield) this.floatAt(p.x, p.d + 40, '🛡️', '#7FE7FF', 14);
            else if (this.crowd > 0) {
              this.changeCrowd(this.crowd - hazardLoss(this.crowd, R.car_hit_loss, R.car_hit_fraction), '卡在車陣');
              Audio.sfx('deny');
            }
          }
        }
      } else if (h.kind === 'manager') {
        if (!h.used) {
          h.t = (h.t || h.phase) + dt;
          h.sprite.x = h.baseX + Math.sin((h.t * h.speed) / h.range) * h.range;
          h.sprite.x = Math.max(16, Math.min(VW - 16, h.sprite.x));
          h.sprite.setTexture(charKey('manager', 0, 'side', Math.floor(h.t * 6) % 2)).setFlipX(Math.cos((h.t * h.speed) / h.range) < 0);
          h.tag.setPosition(h.sprite.x, -h.d - 44);
          const dist = Math.hypot(h.sprite.x - p.x, h.d - p.d);
          if (dist < rad * 0.7 + 14) {
            h.used = true;
            if (shield) {
              this.floatAt(h.sprite.x, h.d + 50, '🛡️ 護盾擋下主管！', '#7FE7FF', 14);
            } else {
              const n = hazardLoss(this.crowd, R.manager_pull, R.manager_pull_fraction);
              this.speech(h.sprite.x, h.d + 60, '主管：回去開會！');
              if (n > 0) {
                this.crowd -= n;
                this.player.flash = 0.6;
                this.floatAt(p.x, p.d + 78, `-${n} 人 被主管拉回去開會`, '#FF8080', 14);
                this.loseSprites(n, { x: h.sprite.x, y: -h.d });
                Audio.sfx('deny');
              }
            }
            h.tag.setText('收工');
            this.tweens.add({ targets: [h.sprite, h.tag], x: h.sprite.x < VW / 2 ? -40 : VW + 40, alpha: 0, delay: 600, duration: 900 });
          }
        }
      } else if (h.kind === 'meeting') {
        if (Math.abs(p.x - h.x) < h.w / 2 && Math.abs(p.d - h.d) < h.h / 2) inMeeting = true;
      } else if (h.kind === 'fog') {
        if (((p.x - h.x) / (h.w / 2)) ** 2 + ((p.d - h.d) / (h.h / 2)) ** 2 <= 1) this.inFog = true;
      }
    }
    this.inMeeting = inMeeting && !shield;
    if (this.inMeeting && this.crowd > 0) {
      p.drainT -= dt;
      if (p.drainT <= 0) {
        p.drainT = R.meeting_drain_interval;
        this.changeCrowd(this.crowd - hazardLoss(this.crowd, 1, R.meeting_drain_fraction), '被拉去開會');
      }
    } else p.drainT = 0.15;
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
    const def = SKILL_DEFS[id];
    this.banner(def.name, def.effect, id === 'shield' ? '#7FE7FF' : id === 'city_resonance' ? '#FF9F1C' : '#FFD447');
    this.ring(id === 'shield' ? 0x7fe7ff : id === 'city_resonance' ? 0xff9f1c : 0xffd447);
  }

  // ---------- fx helpers ----------
  floatAt(x, d, text, color = '#FFD447', size = 13) {
    const t = this.add.text(x, -d, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#101216', strokeThickness: 4, resolution: 3 }).setOrigin(0.5);
    this.fxLayer.add(t);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: { from: 1, to: 0 }, duration: 1000, onComplete: () => t.destroy() });
  }

  speech(x, d, text) {
    const t = this.add.text(x, -d, text, { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#101216', backgroundColor: '#F5F5F5', padding: { x: 4, y: 2 }, resolution: 3 }).setOrigin(0.5, 1);
    this.fxLayer.add(t);
    this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 400, onComplete: () => t.destroy() });
  }

  burst(x, d, n = 8, tint = null) {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, -d, 'spark').setScale(0.8);
      if (tint) s.setTint(tint);
      this.fxLayer.add(s);
      const a = (i / n) * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 24, y: -d + Math.sin(a) * 18, alpha: 0, scale: 0.2, duration: 450, onComplete: () => s.destroy() });
    }
  }

  ring(color) {
    const g = this.add.graphics();
    this.fxLayer.add(g);
    const o = { r: 10, a: 1 };
    this.tweens.add({
      targets: o, r: 220, a: 0, duration: 650,
      onUpdate: () => {
        g.clear();
        g.lineStyle(5, color, o.a);
        g.strokeCircle(this.player.x, -this.player.d - 10, o.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  banner(title, sub, color = '#FFD447') {
    if (this.bannerObjs) this.bannerObjs.forEach((o) => o.destroy());
    const y = -(this.scroll + this.viewH * 0.86);
    const t = this.add.text(VW / 2, y, title, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color, stroke: '#101216', strokeThickness: 6, resolution: 3 }).setOrigin(0.5);
    const s2 = this.add.text(VW / 2, y + 24, sub, { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#F5F5F5', stroke: '#101216', strokeThickness: 4, resolution: 3 }).setOrigin(0.5);
    this.fxLayer.add([t, s2]);
    this.bannerObjs = [t, s2];
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    // banners ride with the camera
    this.bannerD = this.scroll;
    this.tweens.add({ targets: [t, s2], alpha: 0, delay: 1000, duration: 400, onComplete: () => { t.destroy(); s2.destroy(); } });
  }

  drawCircle(time, rad) {
    const g = this.circleG;
    g.clear();
    const p = this.player;
    const cx = p.x;
    const cy = -p.d - 10;
    const S = this.skills;
    let color = 0xffd447;
    if (S.isActive('rally')) color = 0xffb627;
    if (this.inFog && !S.shielded()) color = 0x8a93a3;
    const pulse = 0.5 + 0.5 * Math.sin(time / 220);
    g.fillStyle(color, this.inFog ? 0.08 : 0.12 + (S.isActive('rally') ? 0.06 * pulse : 0));
    g.fillCircle(cx, cy, rad);
    g.lineStyle(S.isActive('rally') ? 4 : 2.5, color, 0.85);
    g.strokeCircle(cx, cy, rad);
    if (p.flash > 0 || this.inMeeting) {
      g.lineStyle(5, 0xe83b3b, Math.max(p.flash * 1.6, this.inMeeting ? 0.5 + 0.4 * pulse : 0));
      g.strokeCircle(cx, cy, rad + 3);
    }
    if (S.shielded()) {
      g.lineStyle(3, 0x7fe7ff, 0.6 + 0.3 * pulse);
      g.strokeCircle(cx, cy, rad + 8);
      g.fillStyle(0x7fe7ff, 0.07);
      g.fillCircle(cx, cy, rad + 8);
    }
    if (S.resonanceActive()) {
      const mr = rad * BALANCE.skills.city_resonance.magnet_multiplier;
      g.lineStyle(2, 0xff9f1c, 0.35 + 0.25 * pulse);
      g.strokeCircle(cx, cy, mr - ((time / 8) % 30));
    }
  }

  // ---------- pause ----------
  pauseGame() {
    if (this.paused || this.ended) return;
    this.paused = true;
    this.tweens.pauseAll();
    Audio.pauseMusic();
    this.drag = null;
    this.dragTarget = null;
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
    const p = this.player;
    this.elapsed += dt;
    this.run.runClock += dt;
    this.skills.tick(dt);
    p.hitCd = Math.max(0, p.hitCd - dt);
    p.flash = Math.max(0, p.flash - dt);
    // camera scroll never stops: the bottom edge eventually pushes everyone over the finish line
    const maxScroll = this.level.length;
    this.scroll = Math.min(maxScroll, this.scroll + this.scrollSpeed * dt);
    // movement
    const sp = R.player_speed;
    let vx = 0;
    let vd = 0;
    const K = this.keys;
    if (K) {
      if (K.LEFT.isDown || K.A.isDown) vx -= 1;
      if (K.RIGHT.isDown || K.D.isDown) vx += 1;
      if (K.UP.isDown || K.W.isDown) vd += 1;
      if (K.DOWN.isDown || K.S.isDown) vd -= 1;
    }
    if (vx || vd) {
      const n = Math.hypot(vx, vd);
      p.x += (vx / n) * sp * dt;
      p.d += (vd / n) * sp * dt;
    } else if (this.dragTarget) {
      const tx = this.dragTarget.x;
      const td = this.scroll + this.dragTarget.rel;
      const dx = tx - p.x;
      const dd = td - p.d;
      const dist = Math.hypot(dx, dd);
      const step = Math.min(dist, sp * 1.15 * dt);
      if (dist > 0.5) {
        p.x += (dx / dist) * step;
        p.d += (dd / dist) * step;
      }
      vx = dx;
      vd = dd;
    }
    p.x = Math.max(14, Math.min(VW - 14, p.x));
    p.d = Math.max(this.scroll + 50, Math.min(this.scroll + this.viewH - 70, p.d));
    const rad = this.radius();
    this.updateHazards(dt, rad);
    p.x = Math.max(14, Math.min(VW - 14, p.x));
    p.d = Math.max(this.scroll + 40, p.d);
    // recruiting
    const resonance = this.skills.resonanceActive();
    const magnet = resonance ? rad * BALANCE.skills.city_resonance.magnet_multiplier : 0;
    for (const n of this.npcs) {
      if (n.state !== 'idle') continue;
      if (n.d < this.scroll - 60 || n.d > this.scroll + this.viewH + 60) continue;
      const dist = Math.hypot(n.x - p.x, n.d - (p.d + 10));
      if (n.need && rad < n.need) {
        if (dist < rad + 30 && (!this.needHintAt || time - this.needHintAt > 2500)) {
          this.needHintAt = time;
          this.hud.hint(`這群人在觀望：號召力要 ≥ ${n.need}！吃📣或用「大聲號召」`);
        }
        continue;
      }
      if (dist <= rad) this.recruit(n);
      else if (magnet && dist <= magnet) {
        n.x += ((p.x - n.x) / dist) * 140 * dt;
        n.d += ((p.d - n.d) / dist) * 140 * dt;
      }
      if (n.state === 'idle') {
        n.t += dt;
        n.sprite.setPosition(n.x, -n.d - Math.abs(Math.sin(n.t * 2)) * 1.5);
        n.sprite.setDepth(-n.d);
      }
    }
    this.batchT = (this.batchT || 0) - dt;
    if (this.recruitBatch && this.batchT <= 0) {
      this.floatAt(p.x + 30, p.d + 54, `+${this.recruitBatch} 人`, this.skills.resonanceActive() ? '#FF9F1C' : '#7CF7C4', 12 + Math.min(6, this.recruitBatch));
      this.recruitBatch = 0;
      this.batchT = 0.35;
    }
    for (const gs of this.groupSigns) if (gs.list.every((n) => n.state !== 'idle')) gs.sign.setVisible(false);
    // gates
    const prevD = this.prevD ?? p.d;
    for (const g of this.gates) {
      if (g.used) continue;
      if (prevD < g.d && p.d >= g.d) {
        g.used = true;
        const left = p.x < VW / 2;
        this.applyGate(left ? g.left : g.right);
        const chosen = left ? g.L : g.Rr;
        const other = left ? g.Rr : g.L;
        this.tweens.add({ targets: [other.panel, other.label], alpha: 0.2, duration: 200 });
        this.tweens.add({ targets: [chosen.panel, chosen.label], scale: 1.15, alpha: 0, duration: 450 });
      }
    }
    this.prevD = p.d;
    // items
    for (const it of this.items) {
      if (it.used) continue;
      if (it.kind === 'rumor') {
        it.x += it.vx * dt;
        if (it.x < 20 || it.x > VW - 20) it.vx *= -1;
        it.ring.x = it.icon.x = it.cap.x = it.x;
      }
      if (Math.abs(it.d - p.d) < 26 && Math.hypot(it.x - p.x, it.d - (p.d + 10)) < 24) this.applyItem(it);
    }
    // followers formation
    const fr = Math.min(rad, 30 + Math.sqrt(this.followers.length) * 9);
    this.followers.forEach((s, i) => {
      const slot = formationSlot(i, fr);
      const tx = p.x + slot.dx;
      const ty = -p.d + slot.dy - 4;
      const k = Math.min(1, dt * 7);
      const mx = (tx - s.x) * k;
      const my = (ty - s.y) * k;
      s.x += mx;
      s.y += my;
      const moving = Math.abs(mx) + Math.abs(my) > 0.3 || this.scrollSpeed > 0;
      const tex = s.texture.key.split('_');
      s.setTexture(`${tex[0]}_${tex[1]}_${tex[2]}_up_${moving ? Math.floor((time / 120 + i) % 2) : 0}`);
      s.setDepth(s.y);
    });
    tickCombo(this.run);
    // hero
    const dir = Math.abs(vx) > Math.abs(vd) * 1.2 && Math.abs(vx) > 1 ? 'side' : 'up';
    this.hero.setTexture(charKey('hero', 0, dir, Math.floor(time / 110) % 2)).setFlipX(dir === 'side' && vx < 0);
    this.hero.setPosition(p.x, -p.d).setDepth(-p.d + 0.5);
    this.heroTag.setPosition(p.x, -p.d - 46);
    this.crowdTag.setPosition(p.x, -p.d - 60).setText(`${this.crowd} 人`);
    this.charLayer.sort('depth');
    this.drawHazards(time);
    this.drawCircle(time, rad);
    if (this.bannerObjs && this.bannerD != null) {
      const shift = this.scroll - this.bannerD;
      this.bannerObjs.forEach((o, i) => (o.y = -(this.bannerD + this.viewH * 0.86) - shift + (i ? 24 : 0)));
    }
    advanceAlly(this.run, dt, resonance);
    this.positionWorld();
    this.updateHud(rad);
    if (p.d >= this.finishD) this.finish();
  }

  statusChips() {
    const S = this.skills;
    const chips = [];
    if (S.isActive('rally')) chips.push({ kind: 'buff', text: '📣 號召力 ×1.6', left: S.active.rally, total: SKILL_DEFS.rally.duration_seconds });
    if (S.isActive('shield')) chips.push({ kind: 'buff shield', text: '🛡️ 護盾', left: S.active.shield, total: SKILL_DEFS.shield.duration_seconds });
    if (S.isActive('city_resonance')) chips.push({ kind: 'buff res', text: '🔗 吸人・得分×1.5', left: S.active.city_resonance, total: SKILL_DEFS.city_resonance.duration_seconds });
    if (this.inFog && !S.shielded()) chips.push({ kind: 'debuff', text: '☁️ 信心不足：號召力 -40%' });
    if (this.inMeeting) chips.push({ kind: 'debuff', text: '📢 會議室：夥伴被拉走中！' });
    return chips;
  }

  updateHud(rad) {
    const reasons = {};
    for (const id of Object.keys(SKILL_DEFS)) reasons[id] = this.skills.reason(id);
    const prog = Math.min(1, this.player.d / this.finishD);
    this.hud.update({
      clock: this.clockText(prog),
      progress: prog,
      crowd: this.crowd,
      target: this.target,
      score: this.run.score,
      sun: this.run.sun,
      sunCap: this.run.sunCapacity,
      radius: Math.round(rad),
      radiusState: this.inFog && !this.skills.shielded() ? 'down' : this.skills.isActive('rally') ? 'up' : '',
      combo: this.run.combo,
      multiplier: comboMultiplier(this.run.combo),
      chips: this.statusChips(),
      skillReasons: reasons,
      skillCd: this.skills.cooldowns,
      skillActive: this.skills.active,
      scoreBoost: this.skills.resonanceActive(),
    });
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    const run = this.run;
    const before = run.bonuses.length;
    const arrived = this.crowd;
    run.stageArrived = run.stageArrived || [];
    run.stageArrived[this.stage] = arrived;
    run.stageTargets = run.stageTargets || [];
    run.stageTargets[this.stage] = this.target;
    run.cities[this.city].arrived = (run.stageArrived[0] || 0) + (run.stageArrived[1] || 0);
    addBonus(run, `抵達終點 ${arrived} 人 × ${R.finish_points_per_person}`, arrived * R.finish_points_per_person);
    const met = arrived >= this.target;
    if (met) addBonus(run, '集結達標', R.target_bonus);
    Audio.sfx(met ? 'goal' : 'event');
    this.onStageEnd(arrived, met, run.bonuses.slice(before));
  }
}

