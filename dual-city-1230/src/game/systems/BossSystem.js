// Boss「黑箱」logic — pure & deterministic given an rng. The scene feeds the beam aim
// point each tick (400×400 boss field; the sun/beam source is fixed at the bottom).
//
// Gameplay loop:
//  • Aim the sunbeam at the orange weakpoint (body hits also hurt, less). Staying on
//    the weakpoint for 3s triggers a critical hit.
//  • The box drops 黑幕 (black veils) toward the crowd. Sweep the beam across them to
//    burn them — every burn charges the「雙城合擊」super. Veils that land weaken the beam.
//  • Phase 2: the weakpoint moves and shield plates orbit the box, blocking the beam.
//  • Phase 3「最後一道鎖」: only the numbered locks take damage, in order 1→2→3.
import { BALANCE } from '../config.js';

const B = BALANCE.boss;
export const BOSS_FIELD = { w: 400, h: 400 };
export const BOSS_BODY = { x: 200, y: 150, w: 170, h: 140 };
export const BEAM_SRC = { x: 200, y: 392 };

export const BOSS_TUNING = {
  rotateSeconds: 5,
  veilInterval: [2.3, 1.7, 1.35], // per phase
  veilSpeed: [48, 62, 74],
  veilRadius: 13,
  veilBurnSeconds: 0.18,
  veilLandY: 372,
  landedDebuffSeconds: 4,
  landedDebuffPower: 0.25, // −25% beam power per landed veil (max 2 stacks)
  superPerBurn: 1 / 7,
  superSeconds: 2.6,
  superDps: 110,
  superWidth: 26,
  lockHoldSeconds: 1.0,
  lockDamageFrac: 0.075,
  plateOrbit: 104,
  plateRadius: 22,
};

const ANCHORS = [
  { x: 150, y: 115 },
  { x: 250, y: 135 },
  { x: 195, y: 190 },
];
const LOCK_SPOTS = [
  { x: 145, y: 120 },
  { x: 255, y: 120 },
  { x: 200, y: 190 },
];

export function phaseFor(hp, maxHp) {
  const pct = (hp / maxHp) * 100;
  if (pct > 60) return 1;
  if (pct > 20) return 2;
  return 3;
}

/** Distance from point p to segment a→b. */
export function segDist(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

export class BossSystem {
  constructor({ maxHp, seconds, initialDamage = 0, powerBonus = 0, rng = Math.random }) {
    this.maxHp = maxHp;
    this.hp = Math.max(1, maxHp - initialDamage);
    this.time = seconds;
    this.initialTime = seconds;
    this.rng = rng;
    this.powerBonus = Math.max(0, Math.min(0.3, powerBonus));
    this.phase = phaseFor(this.hp, maxHp);
    this.anchorIndex = 0;
    this.rotateTimer = BOSS_TUNING.rotateSeconds;
    this.orbit = 0;
    this.plateAngle = 0;
    this.weak = { ...ANCHORS[0], r: 26 };
    this.charge = 0;
    this.offWeakFor = 0;
    this.veils = []; // {id,x,y,vx,vy,burn}
    this.veilTimer = 2;
    this.veilId = 0;
    this.clouds = []; // {x,y,r,vx,life}
    this.cloudTimer = 6;
    this.landed = []; // remaining seconds per landed-veil debuff
    this.superMeter = 0; // 0..1
    this.superTime = 0;
    this.locks = null; // phase 3: [{x,y,hold,broken,n}]
    this.lockIndex = 0;
    this.result = null;
    this.lastHit = 'none'; // none | body | weak | lock | blocked
    this.crits = 0;
    this.burned = 0;
    this.landedCount = 0;
    this.events = [];
    if (this.phase === 3) this.setupLocks();
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  /** Beam power multiplier (crowd bonus, minus landed-veil debuffs). */
  power() {
    const stacks = Math.min(2, this.landed.length);
    return (1 + this.powerBonus) * (1 - BOSS_TUNING.landedDebuffPower * stacks);
  }

  plates() {
    const n = this.phase === 3 ? 3 : this.phase === 2 ? 2 : 0;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = this.plateAngle + (i * Math.PI * 2) / n;
      out.push({ x: BOSS_BODY.x + Math.cos(a) * BOSS_TUNING.plateOrbit, y: BOSS_BODY.y + Math.sin(a) * BOSS_TUNING.plateOrbit * 0.7, r: BOSS_TUNING.plateRadius, a });
    }
    return out;
  }

  insideBody(p) {
    return Math.abs(p.x - BOSS_BODY.x) <= BOSS_BODY.w / 2 && Math.abs(p.y - BOSS_BODY.y) <= BOSS_BODY.h / 2;
  }

  insideWeak(p) {
    return Math.hypot(p.x - this.weak.x, p.y - this.weak.y) <= this.weak.r;
  }

  /** Is the beam (source → aim) blocked by a plate or cloud before reaching aim? */
  blocker(aim) {
    for (const pl of this.plates()) if (segDist(pl, BEAM_SRC, aim) <= pl.r && pl.y > aim.y - pl.r) return { kind: 'plate', x: pl.x, y: pl.y };
    for (const c of this.clouds) if (segDist(c, BEAM_SRC, aim) <= c.r * 0.8) return { kind: 'cloud', x: c.x, y: c.y };
    return null;
  }

  canSuper() {
    return this.superMeter >= 1 && this.superTime <= 0 && !this.result;
  }

  activateSuper() {
    if (!this.canSuper()) return false;
    this.superMeter = 0;
    this.superTime = BOSS_TUNING.superSeconds;
    this.emit('super');
    return true;
  }

  setupLocks() {
    const order = [0, 1, 2].sort(() => this.rng() - 0.5);
    this.locks = order.map((spot, i) => ({ ...LOCK_SPOTS[spot], r: 22, hold: 0, broken: false, n: i + 1 }));
    this.lockIndex = 0;
  }

  currentLock() {
    return this.locks?.[this.lockIndex] || null;
  }

  updateWeakpoint(dt) {
    if (this.phase === 1) {
      this.rotateTimer -= dt;
      if (this.rotateTimer <= 0) {
        this.rotateTimer = BOSS_TUNING.rotateSeconds;
        this.anchorIndex = (this.anchorIndex + 1) % ANCHORS.length;
        this.charge = 0;
        this.emit('weakMoved');
      }
      const a = ANCHORS[this.anchorIndex];
      Object.assign(this.weak, { x: a.x, y: a.y, r: 26 });
    } else if (this.phase === 2) {
      this.orbit += dt * 0.85;
      Object.assign(this.weak, { x: BOSS_BODY.x + Math.cos(this.orbit) * 55, y: BOSS_BODY.y + Math.sin(this.orbit * 1.3) * 38, r: 24 });
    }
    this.plateAngle += dt * (this.phase === 3 ? 1.25 : 0.8);
  }

  updateVeils(dt, aim, beamWidth) {
    const ph = this.phase - 1;
    this.veilTimer -= dt;
    if (this.veilTimer <= 0) {
      this.veilTimer = BOSS_TUNING.veilInterval[ph] * (0.8 + this.rng() * 0.4);
      const x = BOSS_BODY.x + (this.rng() - 0.5) * BOSS_BODY.w * 0.9;
      this.veils.push({ id: ++this.veilId, x, y: BOSS_BODY.y + BOSS_BODY.h / 2, vx: (this.rng() - 0.5) * 40, vy: BOSS_TUNING.veilSpeed[ph] * (0.85 + this.rng() * 0.3), burn: 0 });
      this.emit('veil');
    }
    for (const v of this.veils) {
      v.x = Math.max(14, Math.min(386, v.x + v.vx * dt));
      v.y += v.vy * dt;
      if (aim && segDist(v, BEAM_SRC, aim) <= BOSS_TUNING.veilRadius + beamWidth / 2) {
        v.burn += dt;
        if (v.burn >= (this.superTime > 0 ? 0.01 : BOSS_TUNING.veilBurnSeconds)) {
          v.dead = true;
          this.burned += 1;
          this.superMeter = Math.min(1, this.superMeter + BOSS_TUNING.superPerBurn);
          this.emit('burn', { x: v.x, y: v.y, superReady: this.superMeter >= 1 });
        }
      } else v.burn = Math.max(0, v.burn - dt * 0.5);
      if (!v.dead && v.y >= BOSS_TUNING.veilLandY) {
        v.dead = true;
        this.landed.push(BOSS_TUNING.landedDebuffSeconds);
        this.landedCount += 1;
        this.emit('landed', { x: v.x });
      }
    }
    this.veils = this.veils.filter((v) => !v.dead);
  }

  updateClouds(dt) {
    if (this.phase >= 2) {
      this.cloudTimer -= dt;
      if (this.cloudTimer <= 0 && this.clouds.length < 2) {
        this.cloudTimer = 7 + this.rng() * 3;
        const fromLeft = this.rng() < 0.5;
        this.clouds.push({ x: fromLeft ? -30 : 430, y: 210 + this.rng() * 70, r: 34, vx: (fromLeft ? 1 : -1) * (28 + this.rng() * 14), life: 14 });
        this.emit('attack', { name: '禁言烏雲' });
      }
    }
    for (const c of this.clouds) {
      c.x += c.vx * dt;
      c.life -= dt;
    }
    this.clouds = this.clouds.filter((c) => c.life > 0 && c.x > -60 && c.x < 460);
  }

  /**
   * Advance by dt with the beam aimed at `aim` (or null when not firing).
   * Damage is applied BEFORE the timeout check so a same-frame kill counts as a win.
   */
  tick(dt, aim) {
    this.events = [];
    if (this.result) return this.events;
    this.superTime = Math.max(0, this.superTime - dt);
    this.landed = this.landed.map((t) => t - dt).filter((t) => t > 0);
    const superOn = this.superTime > 0;
    const beamWidth = superOn ? BOSS_TUNING.superWidth : 6;
    this.updateWeakpoint(dt);
    this.updateClouds(dt);
    this.updateVeils(dt, aim, beamWidth);

    let dmg = 0;
    this.lastHit = 'none';
    const power = this.power();
    if (aim) {
      const block = superOn ? null : this.blocker(aim);
      if (block) {
        this.lastHit = 'blocked';
        this.blockedAt = block;
      } else if (this.phase === 3) {
        const lock = this.currentLock();
        if (lock && Math.hypot(aim.x - lock.x, aim.y - lock.y) <= lock.r + (superOn ? 14 : 0)) {
          this.lastHit = 'lock';
          lock.hold += dt * (superOn ? 4 : 1);
          if (lock.hold >= BOSS_TUNING.lockHoldSeconds) {
            lock.broken = true;
            dmg += Math.ceil(this.maxHp * BOSS_TUNING.lockDamageFrac);
            this.emit('lockBroken', { n: lock.n, x: lock.x, y: lock.y });
            this.lockIndex += 1;
            if (this.lockIndex >= this.locks.length) this.setupLocks();
          }
        } else if (this.insideBody(aim)) this.lastHit = 'body';
      } else if (this.insideWeak(aim)) {
        this.lastHit = 'weak';
        dmg += B.weakpoint_dps * power * dt;
      } else if (this.insideBody(aim)) {
        this.lastHit = 'body';
        dmg += B.normal_dps * power * dt;
      }
      if (superOn && this.insideBody(aim) && this.phase !== 3) dmg += BOSS_TUNING.superDps * dt;
    }
    // weakpoint critical charge with a short grace period
    if (this.lastHit === 'weak') {
      this.offWeakFor = 0;
      this.charge += dt;
      if (this.charge >= B.critical_charge_seconds) {
        dmg += B.critical_damage;
        this.charge = 0;
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
      if (newPhase === 3) {
        this.setupLocks();
        this.emit('attack', { name: '最後一道鎖' });
      }
      this.emit('phase', { phase: newPhase });
    }
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
