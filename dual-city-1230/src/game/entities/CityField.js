// The single playable city: backdrop, road graph, characters, route arrows,
// interference highlights and buff effects.
import { drawCity } from '../art/scenery.js';
import { orientedMap } from '../maps.js';
import { buildGraph } from '../systems/pathing.js';
import { TUNING } from '../config.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';

export class CityField {
  constructor(scene, cityId, portrait) {
    this.scene = scene;
    this.id = cityId;
    this.map = orientedMap(cityId, portrait);
    this.graph = buildGraph(this.map);
    this.container = scene.add.container(0, 0);
    this.bg = drawCity(scene, this.container, this.map);
    this.dim = scene.add.rectangle(this.map.w / 2, this.map.h / 2, this.map.w, this.map.h, 0x0a0c14, 0).setOrigin(0.5);
    this.crowdLayer = scene.add.container(0, 0);
    this.routeG = scene.add.graphics(); // projection arrows ">>>>"
    this.fxLayer = scene.add.container(0, 0);
    this.charLayer = scene.add.container(0, 0);
    this.overLayer = scene.add.container(0, 0);
    this.borderG = scene.add.graphics();
    this.container.add([this.crowdLayer, this.dim, this.routeG, this.fxLayer, this.charLayer, this.overLayer, this.borderG]);
    this.chars = [];
    this.queues = new Map(); // edgeKey -> {time,taps,a,b,icon,g}
    this.cloud = null; // {time, sprite}
    this.meetings = []; // {time,taps,group,icon}
    this.lostEvent = 0;
    this.bubbles = 0;
    this.crowdCount = 0;
    this.trailTimer = 0;
    this.rect = { x: 0, y: 0, w: 1, h: 1 };
    this.scale = 1;
  }

  /** rect in device px (game coords). */
  place(rect) {
    this.rect = rect;
    const s = Math.min(rect.w / this.map.w, rect.h / this.map.h);
    this.scale = s;
    const ox = rect.x + (rect.w - this.map.w * s) / 2;
    const oy = rect.y + (rect.h - this.map.h * s) / 2;
    this.container.setPosition(ox, oy).setScale(s);
  }

  toField(px, py) {
    return { x: (px - this.container.x) / this.scale, y: (py - this.container.y) / this.scale };
  }

  containsScreen(px, py) {
    const r = this.rect;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  activeChars() {
    return this.chars.filter((c) => c.active);
  }

  selected() {
    return this.chars.filter((c) => c.selected && c.active);
  }

  edgeCosts() {
    const m = new Map();
    for (const k of this.queues.keys()) m.set(k, 4);
    return m;
  }

  isQueued(k) {
    return this.queues.has(k);
  }

  onArrive(ch) {
    this.scene.onArrive(ch);
  }

  speech(ch, text) {
    if (this.bubbles >= 3 || !text) return;
    this.bubbles += 1;
    const t = this.scene.add.text(ch.x, ch.y - 44, text, {
      fontFamily: FONT, fontSize: '10px', color: '#101216', backgroundColor: '#F5F5F5', padding: { x: 4, y: 2 }, resolution: 3,
    }).setOrigin(0.5, 1);
    this.overLayer.add(t);
    this.scene.tweens.add({
      targets: t, y: t.y - 10, alpha: { from: 1, to: 0 }, delay: 900, duration: 600,
      onComplete: () => {
        t.destroy();
        this.bubbles -= 1;
      },
    });
  }

  floatText(x, y, text, color = '#FFD447', size = 13) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#101216', strokeThickness: 3, resolution: 3,
    }).setOrigin(0.5);
    this.overLayer.add(t);
    this.scene.tweens.add({ targets: t, y: y - 22, alpha: { from: 1, to: 0 }, duration: 900, onComplete: () => t.destroy() });
  }

  burst(x, y, n = 8, tint = null) {
    if (this.scene.lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const s = this.scene.add.image(x, y, 'spark').setScale(0.8);
      if (tint) s.setTint(tint);
      this.fxLayer.add(s);
      const a = (i / n) * Math.PI * 2;
      this.scene.tweens.add({
        targets: s, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 18, alpha: 0, scale: 0.2, duration: 500, onComplete: () => s.destroy(),
      });
    }
  }

  ripple(color = 0xffd447, from = this.map.zone) {
    const g = this.scene.add.graphics();
    this.fxLayer.add(g);
    const o = { r: 10, a: 1 };
    this.scene.tweens.add({
      targets: o, r: Math.max(this.map.w, this.map.h), a: 0, duration: 700,
      onUpdate: () => {
        g.clear();
        g.lineStyle(5, color, o.a);
        g.strokeCircle(from.x, from.y, o.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  /** Sunlight skill: a bright band sweeps across the whole field. */
  sweep() {
    const band = this.scene.add.rectangle(-60, this.map.h / 2, 60, this.map.h, 0xfff3b0, 0.55);
    this.fxLayer.add(band);
    this.scene.tweens.add({ targets: band, x: this.map.w + 60, duration: this.scene.lowFx ? 200 : 650, ease: 'Sine.easeInOut', onComplete: () => band.destroy() });
  }

  /** Grow the crowd silhouette in the zone (visual only, capped). */
  addCrowdDot(type) {
    if (this.crowdCount >= 40) return;
    const z = this.map.zone;
    const i = this.crowdCount++;
    const ring = Math.floor(i / 10);
    const a = ((i % 10) / 10) * Math.PI * 2 + ring * 0.3;
    const r = 10 + ring * 9;
    const color = type === 'black' ? 0x0b0b0e : type === 'volunteer' ? 0xffd447 : 0x2a2f3b;
    const g = this.scene.add.graphics();
    g.fillStyle(color, 1);
    g.lineStyle(1, 0xffd447, 0.6);
    g.fillCircle(0, -4, 3.5);
    g.strokeCircle(0, -4, 3.5);
    g.fillRoundedRect(-3.5, -1, 7, 7, 2);
    g.setPosition(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r * 0.8);
    this.crowdLayer.add(g);
  }

  addQueue(k, q) {
    const a = this.map.nodes[q.a];
    const b = this.map.nodes[q.b];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const g = this.scene.add.graphics();
    q.g = g;
    q.draw = (t) => {
      g.clear();
      g.lineStyle(14, 0xe83b3b, 0.35 + 0.2 * Math.sin(t / 180));
      g.lineBetween(a.x, a.y, b.x, b.y);
      for (let i = -2; i <= 2; i++) {
        g.fillStyle(0xf5f5f5, 0.9);
        const tt = 0.5 + i * 0.08;
        g.fillCircle(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt - 3, 2.5);
      }
    };
    q.draw(0);
    const icon = this.scene.add.text(mx, my - 14, '🍱 排隊 點×2', {
      fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', backgroundColor: '#E83B3B', color: '#fff', padding: { x: 4, y: 3 }, resolution: 3,
    }).setOrigin(0.5);
    this.fxLayer.add(g);
    this.overLayer.add(icon);
    q.icon = icon;
    q.pos = { x: mx, y: my - 14 };
    this.queues.set(k, q);
  }

  removeQueue(k) {
    const q = this.queues.get(k);
    if (!q) return;
    this.burst(q.pos.x, q.pos.y + 14, 8, 0xffffff);
    q.g.destroy();
    q.icon.destroy();
    this.queues.delete(k);
  }

  addMeeting(m) {
    const cx = m.group.reduce((s, c) => s + c.x, 0) / Math.max(1, m.group.length);
    const cy = m.group.reduce((s, c) => s + c.y, 0) / Math.max(1, m.group.length);
    m.pos = { x: Math.max(40, Math.min(this.map.w - 40, cx)), y: Math.max(16, cy - 52) };
    m.icon = this.scene.add.text(m.pos.x, m.pos.y, '📢 開會 點×3', {
      fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', backgroundColor: '#E83B3B', color: '#fff', padding: { x: 4, y: 3 }, resolution: 3,
    }).setOrigin(0.5);
    this.overLayer.add(m.icon);
    this.meetings.push(m);
  }

  removeMeeting(m) {
    if (m.icon) this.burst(m.pos.x, m.pos.y, 6, 0xffffff);
    m.icon?.destroy();
    this.meetings = this.meetings.filter((x) => x !== m);
  }

  setCloud(c) {
    if (this.cloud?.sprite) {
      const s = this.cloud.sprite;
      this.scene.tweens.add({ targets: s, alpha: 0, x: s.x + 160, duration: 500, onComplete: () => s.destroy() });
    }
    this.cloud = c;
    this.scene.tweens.add({ targets: this.dim, fillAlpha: c ? 0.32 : 0, duration: 400 });
    if (c) {
      c.sprite = this.scene.add.image(this.map.w / 2, 40, 'cloud').setScale(1.9).setAlpha(0.6);
      this.overLayer.add(c.sprite);
    }
  }

  sunFactor() {
    return this.cloud ? TUNING.cloudSunFactor : 1;
  }

  /** Hit-test tappable event widgets at a field point. */
  eventAt(p) {
    for (const [k, q] of this.queues) if (Math.abs(p.x - q.pos.x) < 36 && Math.abs(p.y - q.pos.y) < 16) return { kind: 'queue', key: k };
    for (const m of this.meetings) if (Math.abs(p.x - m.pos.x) < 38 && Math.abs(p.y - m.pos.y) < 16) return { kind: 'meeting', m };
    return null;
  }

  charAt(p, radius) {
    let best = null;
    let bd = radius;
    for (const c of this.chars) {
      if (!c.active) continue;
      const d = Math.hypot(p.x - c.x, p.y - (c.y - 16));
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  inZone(p, pad = 14) {
    const z = this.map.zone;
    return Math.hypot(p.x - z.x, p.y - z.y) <= z.r + pad;
  }

  /** Animated ">>>>" chevrons along each moving character's remaining route. */
  drawRoutes(time) {
    const g = this.routeG;
    g.clear();
    const spacing = 13;
    const phase = ((time / 1000) * 34) % spacing;
    for (const c of this.chars) {
      if (c.state !== 'moving' || !c.path.length) continue;
      const pts = [{ x: c.x, y: c.y }, ...c.path];
      const wrong = c.willGetLost;
      const color = wrong ? 0xff7a7a : c.selected ? 0xffffff : 0xffd447;
      let dist = spacing - phase;
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      let walked = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len < 0.01) continue;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        while (dist < len) {
          const x = a.x + ux * dist;
          const y = a.y + uy * dist;
          const prog = (walked + dist) / Math.max(1, total);
          const alpha = 0.35 + 0.6 * Math.min(1, prog * 1.5);
          g.lineStyle(2.4, color, alpha);
          // chevron ">" pointing along the direction of travel
          g.beginPath();
          g.moveTo(x - ux * 4 - uy * 4, y - uy * 4 + ux * 4);
          g.lineTo(x, y);
          g.lineTo(x - ux * 4 + uy * 4, y - uy * 4 - ux * 4);
          g.strokePath();
          dist += spacing;
        }
        dist -= len;
        walked += len;
      }
      const end = pts[pts.length - 1];
      g.lineStyle(2, color, 0.9);
      g.strokeCircle(end.x, end.y, 5 + Math.sin(time / 150) * 1.5);
    }
  }

  /** Field border glow while a buff is active (colour = buff). */
  drawBorder(time, buffColor) {
    const g = this.borderG;
    g.clear();
    if (buffColor == null) return;
    const a = 0.55 + 0.35 * Math.sin(time / 160);
    g.lineStyle(6, buffColor, a);
    g.strokeRoundedRect(3, 3, this.map.w - 6, this.map.h - 6, 10);
  }

  update(dt, ctx) {
    // volunteer aura: nearby moving characters get +10% (timer refresh, never stacks)
    const vols = this.chars.filter((c) => c.type === 'volunteer' && c.state === 'moving');
    if (vols.length) {
      for (const c of this.chars) {
        if (c.state !== 'moving' || c.type === 'volunteer') continue;
        if (vols.some((v) => Math.hypot(v.x - c.x, v.y - c.y) <= TUNING.volunteerAuraRadius)) c.auraTimer = TUNING.volunteerAuraSeconds;
      }
    }
    for (const c of this.chars) c.update(dt, ctx);
    // speed-trail sparks behind moving characters while a speed buff is active
    if (ctx.buffColor != null && !this.scene.lowFx) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.09;
        for (const c of this.chars) {
          if (c.state !== 'moving') continue;
          const s = this.scene.add.image(c.x + (Math.random() - 0.5) * 6, c.y - 6, 'spark').setScale(0.55).setTint(ctx.buffColor);
          this.fxLayer.add(s);
          this.scene.tweens.add({ targets: s, alpha: 0, scale: 0.1, duration: 420, onComplete: () => s.destroy() });
        }
      }
    }
    this.chars = this.chars.filter((c) => c.state !== 'gone');
    this.charLayer.sort('depth');
    const t = this.scene.time.now;
    for (const q of this.queues.values()) {
      q.draw(t);
      q.icon.setText(`🍱 排隊 點×${Math.max(1, TUNING.queueTapsToClear - q.taps)}`);
    }
    for (const m of this.meetings) m.icon.setText(`📢 開會 點×${Math.max(1, TUNING.meetingTapsToClear - m.taps)}`);
    if (this.cloud?.sprite) this.cloud.sprite.x = this.map.w / 2 + Math.sin(t / 900) * 30;
    this.drawRoutes(t);
    this.drawBorder(t, ctx.buffColor);
  }

  destroy() {
    this.chars.forEach((c) => c.destroy());
    this.container.destroy(true);
  }
}
