// One city panel: backdrop, roads graph, characters, event visuals.
import { drawCity } from '../art/scenery.js';
import { FIELD_H, FIELD_W, MAPS } from '../maps.js';
import { buildGraph, edgeKey } from '../systems/pathing.js';
import { TUNING } from '../config.js';

const FONT = 'system-ui, "Noto Sans TC", "PingFang TC", sans-serif';

export class CityField {
  constructor(scene, cityId) {
    this.scene = scene;
    this.id = cityId;
    this.map = MAPS[cityId];
    this.graph = buildGraph(this.map);
    this.container = scene.add.container(0, 0);
    this.bg = drawCity(scene, this.container, this.map);
    this.crowdLayer = scene.add.container(0, 0);
    this.fxLayer = scene.add.container(0, 0);
    this.charLayer = scene.add.container(0, 0);
    this.overLayer = scene.add.container(0, 0);
    this.container.add([this.crowdLayer, this.fxLayer, this.charLayer, this.overLayer]);
    this.chars = [];
    this.queues = new Map(); // edgeKey -> {time,taps,a,b,icon,g}
    this.cloud = null; // {time, sprite}
    this.meetings = []; // {time,taps,group,icon}
    this.lostEvent = 0;
    this.bubbles = 0;
    this.crowdCount = 0;
    this.rect = { x: 0, y: 0, w: 1, h: 1 };
    this.scale = 1;
    this.selection = scene.add.graphics();
    this.overLayer.add(this.selection);
  }

  /** rect in device px (game coords). Header strip is reserved at the top. */
  place(rect, headerPx) {
    this.rect = rect;
    const availH = rect.h - headerPx;
    const s = Math.min(rect.w / FIELD_W, availH / FIELD_H);
    this.scale = s;
    const ox = rect.x + (rect.w - FIELD_W * s) / 2;
    const oy = rect.y + headerPx + (availH - FIELD_H * s) / 2;
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

  speech(ch, text) {
    if (this.bubbles >= 3 || !text) return;
    this.bubbles += 1;
    const t = this.scene.add.text(ch.x, ch.y - 40, text, {
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

  burst(x, y, n = 8) {
    if (this.scene.lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const s = this.scene.add.image(x, y, 'spark').setScale(0.8);
      this.fxLayer.add(s);
      const a = (i / n) * Math.PI * 2;
      this.scene.tweens.add({
        targets: s, x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 18, alpha: 0, scale: 0.2, duration: 500, onComplete: () => s.destroy(),
      });
    }
  }

  ripple(color = 0xffd447) {
    const z = this.map.zone;
    const g = this.scene.add.graphics();
    this.fxLayer.add(g);
    const o = { r: 10, a: 1 };
    this.scene.tweens.add({
      targets: o, r: 220, a: 0, duration: 700,
      onUpdate: () => {
        g.clear();
        g.lineStyle(4, color, o.a);
        g.strokeCircle(z.x, z.y, o.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  /** Grow the crowd silhouette in the zone (visual only, capped). */
  addCrowdDot(type) {
    if (this.crowdCount >= 40) return;
    const z = this.map.zone;
    const i = this.crowdCount++;
    const ring = Math.floor(i / 10);
    const a = (i % 10) / 10 * Math.PI * 2 + ring * 0.3;
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
    g.lineStyle(12, 0xe83b3b, 0.45);
    g.lineBetween(a.x, a.y, b.x, b.y);
    // little queue people
    for (let i = -2; i <= 2; i++) {
      g.fillStyle(0xf5f5f5, 0.9);
      const t = 0.5 + i * 0.08;
      g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 3, 2.5);
    }
    const icon = this.scene.add.text(mx, my - 12, '🍱×2', {
      fontFamily: FONT, fontSize: '12px', backgroundColor: '#E83B3B', color: '#fff', padding: { x: 3, y: 2 }, resolution: 3,
    }).setOrigin(0.5);
    this.fxLayer.add(g);
    this.overLayer.add(icon);
    q.g = g;
    q.icon = icon;
    q.pos = { x: mx, y: my - 12 };
    this.queues.set(k, q);
  }

  removeQueue(k) {
    const q = this.queues.get(k);
    if (!q) return;
    q.g.destroy();
    q.icon.destroy();
    this.queues.delete(k);
  }

  addMeeting(m) {
    const cx = m.group.reduce((s, c) => s + c.x, 0) / Math.max(1, m.group.length);
    const cy = m.group.reduce((s, c) => s + c.y, 0) / Math.max(1, m.group.length);
    m.pos = { x: cx, y: cy - 46 };
    m.icon = this.scene.add.text(m.pos.x, m.pos.y, '📢 開會中 ×3', {
      fontFamily: FONT, fontSize: '11px', backgroundColor: '#64748B', color: '#fff', padding: { x: 4, y: 3 }, resolution: 3,
    }).setOrigin(0.5);
    this.overLayer.add(m.icon);
    this.meetings.push(m);
  }

  removeMeeting(m) {
    m.icon?.destroy();
    this.meetings = this.meetings.filter((x) => x !== m);
  }

  setCloud(c) {
    if (this.cloud?.sprite) {
      const s = this.cloud.sprite;
      this.scene.tweens.add({ targets: s, alpha: 0, x: s.x + 120, duration: 500, onComplete: () => s.destroy() });
    }
    this.cloud = c;
    if (c) {
      c.sprite = this.scene.add.image(FIELD_W / 2, 70, 'cloud').setScale(2.6).setAlpha(0.85);
      this.overLayer.add(c.sprite);
    }
  }

  onArrive(ch) {
    this.scene.onArrive(ch);
  }

  sunFactor() {
    return this.cloud ? TUNING.cloudSunFactor : 1;
  }

  /** Hit-test tappable event widgets at a field point. */
  eventAt(p) {
    for (const [k, q] of this.queues) if (Math.hypot(p.x - q.pos.x, p.y - q.pos.y) < 22) return { kind: 'queue', key: k };
    for (const m of this.meetings) if (Math.hypot(p.x - m.pos.x, p.y - m.pos.y) < 26) return { kind: 'meeting', m };
    return null;
  }

  charAt(p, radius) {
    let best = null;
    let bd = radius;
    for (const c of this.chars) {
      if (!c.active) continue;
      // body is drawn above the feet point
      const d = Math.hypot(p.x - c.x, p.y - (c.y - 14));
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  inZone(p, pad = 12) {
    const z = this.map.zone;
    return Math.hypot(p.x - z.x, p.y - z.y) <= z.r + pad;
  }

  update(dt, skillBonus) {
    // volunteer aura: nearby moving characters get +10% (timer refresh, never stacks)
    const vols = this.chars.filter((c) => c.type === 'volunteer' && c.state === 'moving');
    if (vols.length) {
      for (const c of this.chars) {
        if (c.state !== 'moving' || c.type === 'volunteer') continue;
        if (vols.some((v) => Math.hypot(v.x - c.x, v.y - c.y) <= TUNING.volunteerAuraRadius)) c.auraTimer = TUNING.volunteerAuraSeconds;
      }
    }
    for (const c of this.chars) c.update(dt, skillBonus);
    this.chars = this.chars.filter((c) => c.state !== 'gone');
    this.charLayer.sort('depth');
    for (const q of this.queues.values()) q.icon.setText(`🍱×${Math.max(1, 2 - q.taps)}`);
    for (const m of this.meetings) m.icon.setText(`📢 開會中 ×${Math.max(1, 3 - m.taps)}`);
    if (this.cloud?.sprite) this.cloud.sprite.x = FIELD_W / 2 + Math.sin(this.scene.time.now / 900) * 30;
  }

  destroy() {
    this.chars.forEach((c) => c.destroy());
    this.container.destroy(true);
  }
}

export { edgeKey };
