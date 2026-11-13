// Boss logic — pure, deterministic given an rng. The scene feeds it the aim point
// (in boss-field coordinates, 400×400) each tick and renders what it reports.
import { BALANCE, TUNING } from '../config.js';

const B = BALANCE.boss;
export const BOSS_FIELD = { w: 400, h: 400 };
export const BOSS_BODY = { x: 200, y: 170, w: 170, h: 150 }; // centre + size

// Three fixed weakpoint anchors on the box (rotate between them in phase 1).
const ANCHORS = [
  { x: 150, y: 130 },
  { x: 250, y: 150 },
  { x: 190, y: 215 },
];

export function phaseFor(hp, maxHp) {
  const pct = (hp / maxHp) * 100;
  if (pct > 60) return 1;
  if (pct > 20) return 2;
  return 3;
}

export class BossSystem {
  constructor({ maxHp, seconds, initialDamage = 0, rng = Math.random }) {
    this.maxHp = maxHp;
    this.hp = Math.max(1, maxHp - initialDamage);
    this.time = seconds;
    this.initialTime = seconds;
    this.rng = rng;
    this.phase = phaseFor(this.hp, maxHp);
    this.anchorIndex = 0;
    this.rotateTimer = TUNING.bossWeakpointRotateSeconds;
    this.orbit = 0;
    this.weak = { ...ANCHORS[0], r: 26 };
    this.charge = 0; // seconds of continuous weakpoint hit
    this.offWeakFor = 0;
    this.clouds = []; // {x,y,r,vx,life}
    this.shield = 0; // seconds remaining of 黑箱遮蔽
    this.frozen = 0; // seconds remaining of 冰封陽光
    this.thawTaps = 0;
    this.attackTimer = 6;
    this.result = null; // 'win' | 'lose'
    this.lastHit = 'none'; // 'none' | 'body' | 'weak' | 'blocked' | 'shield'
    this.crits = 0;
    this.events = []; // emitted this tick: {type,...}
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  insideBody(p) {
    return Math.abs(p.x - BOSS_BODY.x) <= BOSS_BODY.w / 2 && Math.abs(p.y - BOSS_BODY.y) <= BOSS_BODY.h / 2;
  }

  insideWeak(p) {
    return Math.hypot(p.x - this.weak.x, p.y - this.weak.y) <= this.weak.r;
  }

  blockedByCloud(p) {
    return this.clouds.some((c) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r);
  }

  tapThaw() {
    if (this.frozen <= 0) return false;
    this.thawTaps += 1;
    if (this.thawTaps >= TUNING.bossFreezeTapsToThaw) {
      this.frozen = 0;
      this.thawTaps = 0;
      this.emit('thawed');
    }
    return true;
  }

  updateWeakpoint(dt) {
    if (this.phase === 1) {
      this.rotateTimer -= dt;
      if (this.rotateTimer <= 0) {
        this.rotateTimer = TUNING.bossWeakpointRotateSeconds;
        this.anchorIndex = (this.anchorIndex + 1) % B.number_of_weakpoints;
        this.charge = 0;
        this.emit('weakMoved');
      }
      const a = ANCHORS[this.anchorIndex];
      this.weak.x = a.x;
      this.weak.y = a.y;
      this.weak.r = 26;
    } else if (this.phase === 2) {
      this.orbit += dt * 0.9;
      this.weak.x = BOSS_BODY.x + Math.cos(this.orbit) * 52;
      this.weak.y = BOSS_BODY.y + Math.sin(this.orbit * 1.3) * 42;
      this.weak.r = 24;
    } else {
      // final lock: slow drift, slightly bigger
      this.orbit += dt * 0.5;
      this.weak.x = BOSS_BODY.x + Math.sin(this.orbit) * 40;
      this.weak.y = BOSS_BODY.y + 20 + Math.cos(this.orbit * 0.7) * 18;
      this.weak.r = 28;
    }
  }

  updateAttacks(dt) {
    this.attackTimer -= dt;
    if (this.attackTimer > 0) return;
    const roll = this.rng();
    if (this.phase === 1) {
      if (roll < 0.5) this.startShield();
      else this.startFreeze();
      this.attackTimer = 7 + this.rng() * 2;
    } else if (this.phase === 2) {
      if (roll < 0.45) this.spawnClouds(2);
      else if (roll < 0.75) this.startFreeze();
      else this.startShield();
      this.attackTimer = 5.5 + this.rng() * 2;
    } else {
      if (roll < 0.6) this.spawnClouds(1);
      else this.startShield();
      this.attackTimer = 6 + this.rng() * 2;
    }
  }

  startShield() {
    this.shield = TUNING.bossShieldSeconds;
    this.emit('attack', { name: '黑箱遮蔽' });
  }

  startFreeze() {
    this.frozen = TUNING.bossFreezeSeconds;
    this.thawTaps = 0;
    this.emit('attack', { name: '冰封陽光' });
  }

  spawnClouds(n) {
    for (let i = 0; i < n && this.clouds.length < 3; i++) {
      const fromLeft = this.rng() < 0.5;
      this.clouds.push({
        x: fromLeft ? 30 : 370,
        y: 110 + this.rng() * 120,
        r: 36,
        vx: (fromLeft ? 1 : -1) * (26 + this.rng() * 16),
        life: 9,
      });
    }
    this.emit('attack', { name: '禁言烏雲' });
  }

  /**
   * Advance by dt with the beam aimed at `aim` (or null when not firing).
   * Damage is applied BEFORE the time-out check so a same-frame kill counts as a win.
   */
  tick(dt, aim) {
    this.events = [];
    if (this.result) return this.events;
    this.updateWeakpoint(dt);
    this.updateAttacks(dt);
    this.shield = Math.max(0, this.shield - dt);
    this.frozen = Math.max(0, this.frozen - dt);
    for (const c of this.clouds) {
      c.x += c.vx * dt;
      c.life -= dt;
    }
    this.clouds = this.clouds.filter((c) => c.life > 0 && c.x > -40 && c.x < 440);

    // --- damage ---
    let dmg = 0;
    this.lastHit = 'none';
    const onWeak = !!aim && this.insideWeak(aim) && !this.blockedByCloud(aim);
    if (aim) {
      if (this.blockedByCloud(aim)) this.lastHit = 'blocked';
      else if (this.shield > 0 && this.insideBody(aim)) this.lastHit = 'shield';
      else if (onWeak) {
        this.lastHit = 'weak';
        dmg += B.weakpoint_dps * dt;
      } else if (this.insideBody(aim)) {
        this.lastHit = 'body';
        dmg += (this.phase === 3 ? TUNING.bossPhase3BodyDps : B.normal_dps) * dt;
      }
    }
    // continuous-hit critical charge (grace period before reset)
    if (this.lastHit === 'weak') {
      this.offWeakFor = 0;
      this.charge += dt;
      if (this.charge >= B.critical_charge_seconds) {
        dmg += B.critical_damage;
        this.charge = 0; // restart accumulation after a crit
        this.crits += 1;
        this.emit('crit', { x: this.weak.x, y: this.weak.y });
      }
    } else {
      this.offWeakFor += dt;
      if (this.offWeakFor > B.weakpoint_break_grace_seconds) this.charge = 0;
    }
    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg);
      this.emit('hit', { amount: dmg, kind: this.lastHit });
    }
    const newPhase = phaseFor(this.hp, this.maxHp);
    if (newPhase !== this.phase && this.hp > 0) {
      this.phase = newPhase;
      this.charge = 0;
      if (newPhase === 3) this.emit('attack', { name: '最後一道鎖' });
      this.emit('phase', { phase: newPhase });
    }
    // --- resolution: kill first, then timer ---
    if (this.hp <= 0) {
      this.result = 'win';
      this.emit('win');
      return this.events;
    }
    this.time = Math.max(0, this.time - dt);
    if (this.time <= 0) {
      this.result = 'lose';
      this.emit('lose');
    }
    return this.events;
  }
}
