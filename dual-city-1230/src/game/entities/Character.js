// A gatherer on one city field. Logic lives here; rendering is a Phaser sprite in the
// city container. Arrival is irreversible and scored at most once (GameState guards ids).
import { BALANCE, TUNING } from '../config.js';
import { charKey, VARIANTS } from '../art/textures.js';
import { dist, edgeKey, nearestNode, shortestPath } from '../systems/pathing.js';

export const BASE_SPEED = 40; // field px per second at 1.0x

export const LINES = {
  lunch: ['吃完再出發！', '便當帶著走！'],
  black: ['黑衣就位！', '今天一起曬太陽！'],
  volunteer: ['跟我來！', '集合點在這邊！'],
  lost: ['我是不是走錯廠了？', '導航又帶我繞路！'],
  sprinter: ['午休時間很寶貴！', '借過借過！'],
  tired: ['我需要咖啡……', '曬一下太陽好了！'],
};

export const TYPE_NAMES = {
  lunch: '午餐戰士',
  black: '黑衣夥伴',
  volunteer: '陽光志工',
  lost: '迷路工程師',
  sprinter: '超速衝刺哥',
  tired: '加班疲勞人',
};

let nextId = 1;

export class Character {
  constructor(field, type, spawnNode, rng) {
    this.field = field; // CityField (owns map, graph, container)
    this.scene = field.scene;
    this.rng = rng;
    this.id = `${field.map.id}-${nextId++}`;
    this.type = type;
    this.variant = Math.floor(rng() * VARIANTS);
    const n = field.map.nodes[spawnNode];
    this.x = n.x;
    this.y = n.y;
    this.state = 'walkIn'; // walkIn | idle | moving | lost | arrived | gone
    this.path = [];
    this.pathNodes = [];
    this.curEdge = null;
    this.willGetLost = false;
    this.orders = 0;
    this.recovered = false;
    this.auraTimer = 0;
    this.pausedFor = 0; // meeting
    this.idleTimer = 0;
    this.animTime = rng() * 10;
    this.dir = 'down';
    this.flip = false;
    this.selected = false;
    this.lingering = 0;

    this.sprite = this.scene.add.image(this.x, this.y, charKey(type, this.variant, 'down', 0)).setOrigin(0.5, 0.92).setScale(0.62);
    this.ring = this.scene.add.image(this.x, this.y, 'ring').setScale(0.7).setVisible(false);
    this.mark = this.scene.add.text(this.x, this.y - 40, '?', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#FFD447', stroke: '#101216', strokeThickness: 3, resolution: 2,
    }).setOrigin(0.5, 1).setVisible(false);
    field.charLayer.add([this.ring, this.sprite, this.mark]);

    const spot = field.map.idleSpots[Math.floor(rng() * field.map.idleSpots.length)];
    this.home = { x: spot.x + (rng() - 0.5) * 18, y: spot.y + (rng() - 0.5) * 8 };
    this.setPath([this.home]);
  }

  get typeSpeed() {
    const c = BALANCE.characters[this.type];
    if (this.type === 'tired' && this.recovered) return c.recovered_speed;
    return c.speed;
  }

  get active() {
    return this.state !== 'arrived' && this.state !== 'gone';
  }

  setPath(points, nodes = []) {
    this.path = points.map((p) => ({ x: p.x, y: p.y }));
    this.pathNodes = nodes;
  }

  setSelected(on) {
    this.selected = on && this.active;
    this.ring.setVisible(this.selected);
  }

  say(text) {
    this.field.speech(this, text);
  }

  randomLine() {
    const l = LINES[this.type];
    return l[Math.floor(this.rng() * l.length)];
  }

  /** Guide this character to the gathering zone. */
  orderToZone() {
    if (!this.active) return false;
    const map = this.field.map;
    const start = nearestNode(map, this);
    const nodes = shortestPath(map, this.field.graph, start, map.zone.node, this.field.edgeCosts());
    if (!nodes) return false;
    this.orders += 1;
    const lostChance = this.type === 'lost' ? (this.orders === 1 ? TUNING.lostChanceFirstOrder : TUNING.lostChanceReorder) : 0;
    this.willGetLost = false;
    let route = nodes;
    if (lostChance > 0 && this.rng() < lostChance && nodes.length >= 3) {
      // take a wrong turn after 1–2 nodes and end up somewhere that is not the zone
      const cut = 1 + Math.floor(this.rng() * Math.min(2, nodes.length - 2));
      const at = nodes[cut - 1];
      const options = this.field.graph.get(at).filter((v) => v !== nodes[cut] && v !== map.zone.node);
      if (options.length) {
        route = [...nodes.slice(0, cut), options[Math.floor(this.rng() * options.length)]];
        this.willGetLost = true;
      }
    }
    const pts = route.map((id) => map.nodes[id]);
    if (!this.willGetLost) {
      const a = this.rng() * Math.PI * 2;
      const r = this.rng() * map.zone.r * 0.55;
      pts[pts.length - 1] = { x: map.zone.x + Math.cos(a) * r, y: map.zone.y + Math.sin(a) * r };
    }
    // walk to the first node only if we are not already basically on it
    if (pts.length > 1 && dist(this, pts[0]) < 4) pts.shift();
    this.setPath(pts, route);
    this.curNodeIndex = 0;
    this.state = 'moving';
    this.mark.setVisible(false);
    return true;
  }

  getLost(reason = '') {
    if (!this.active || this.state === 'arrived') return;
    this.state = 'lost';
    this.path = [];
    this.curEdge = null;
    this.mark.setVisible(true);
    if (reason) this.say(reason);
  }

  recover() {
    if (this.type === 'tired' && !this.recovered) {
      this.recovered = true;
      this.say('曬一下太陽好了！');
    }
  }

  speed(skillBonus) {
    let s = BASE_SPEED * this.typeSpeed * (1 + skillBonus);
    if (this.auraTimer > 0) s *= 1 + BALANCE.characters.volunteer.aura_speed_bonus;
    if (this.curEdge && this.field.isQueued(this.curEdge)) s *= TUNING.queueSpeedFactor;
    return s;
  }

  update(dt, skillBonus) {
    this.animTime += dt;
    this.auraTimer = Math.max(0, this.auraTimer - dt);
    if (this.state === 'arrived') {
      this.lingering -= dt;
      const bounce = Math.abs(Math.sin(this.animTime * 8)) * 3;
      this.sprite.setPosition(this.x, this.y - bounce);
      if (this.lingering <= 0) this.leave();
      return;
    }
    if (this.state === 'gone') return;
    if (this.pausedFor > 0) {
      this.pausedFor = Math.max(0, this.pausedFor - dt);
      this.render(false);
      return;
    }
    let moving = false;
    if (this.path.length && this.state !== 'lost') {
      const target = this.path[0];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy);
      // which road edge are we on (for queue slowdown)?
      if (this.state === 'moving' && this.pathNodes.length) {
        const doneNodes = this.pathNodes.length - this.path.length;
        const from = this.pathNodes[Math.max(0, doneNodes - 1)];
        const to = this.pathNodes[Math.min(this.pathNodes.length - 1, doneNodes)];
        this.curEdge = from && to && from !== to ? edgeKey(from, to) : null;
      } else this.curEdge = null;
      const step = this.speed(skillBonus) * dt;
      if (d <= step) {
        this.x = target.x;
        this.y = target.y;
        this.path.shift();
        if (!this.path.length) this.onPathEnd();
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        moving = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.dir = 'side';
          this.flip = dx < 0;
        } else this.dir = dy < 0 ? 'up' : 'down';
      }
    } else if (this.state === 'idle') {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.idleTimer = 1.5 + this.rng() * 2.5;
        this.path = [{ x: this.home.x + (this.rng() - 0.5) * 14, y: this.home.y + (this.rng() - 0.5) * 6 }];
      }
    }
    this.render(moving);
  }

  onPathEnd() {
    this.curEdge = null;
    if (this.state === 'walkIn') {
      this.state = 'idle';
      this.idleTimer = 1 + this.rng() * 2;
    } else if (this.state === 'moving') {
      if (this.willGetLost) {
        this.getLost(this.type === 'lost' ? '我是不是走錯廠了？' : '等等，這裡是停車場？');
      } else {
        this.field.onArrive(this);
      }
    } else if (this.state === 'idle') {
      // finished an idle shuffle
    }
  }

  markArrived() {
    this.state = 'arrived';
    this.lingering = TUNING.arrivedLingerSeconds;
    this.setSelected(false);
    this.mark.setVisible(false);
    this.sprite.setTexture(charKey(this.type, this.variant, 'down', 2)).setFlipX(false);
  }

  leave() {
    this.state = 'gone';
    this.scene.tweens.add({ targets: [this.sprite], alpha: 0, duration: 250, onComplete: () => this.destroy() });
  }

  render(moving) {
    const frame = moving ? (Math.floor(this.animTime * 8) % 2) : 0;
    const bob = moving ? Math.abs(Math.sin(this.animTime * 16)) * 1.5 : Math.sin(this.animTime * 3) * 0.5;
    this.sprite.setTexture(charKey(this.type, this.variant, this.dir, frame)).setFlipX(this.dir === 'side' && this.flip);
    this.sprite.setPosition(this.x, this.y - bob);
    this.sprite.setDepth(this.y);
    this.ring.setPosition(this.x, this.y + 1).setDepth(this.y - 1);
    this.mark.setDepth(this.y + 1000);
    this.mark.setPosition(this.x, this.y - 36 - Math.abs(Math.sin(this.animTime * 4)) * 3);
    this.sprite.setAlpha(this.pausedFor > 0 ? 0.6 : 1);
  }

  destroy() {
    this.sprite.destroy();
    this.ring.destroy();
    this.mark.destroy();
  }
}
