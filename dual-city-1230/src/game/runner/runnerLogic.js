// Pure crowd-runner rules (no Phaser): gates, radius, formation, stage layout.
import { BALANCE } from '../config.js';

export const R = BALANCE.runner;

/** Apply a gate / item operation to the crowd count. Never negative; integers only. */
export function applyCount(count, op, value) {
  switch (op) {
    case '+': return Math.max(0, Math.floor(count + value));
    case '-': return Math.max(0, Math.floor(count - value));
    case '*': return Math.max(0, Math.round(count * value));
    default: return count;
  }
}

/** Stage rating: ★ target met, ★★ ≥ 1.5×, ★★★ ≥ 2× the target. */
export function starsFor(arrived, target) {
  if (arrived >= target * 2) return 3;
  if (arrived >= target * 1.5) return 2;
  if (arrived >= target) return 1;
  return 0;
}

/** Loss from an obstacle: a fixed minimum, or a fraction of a big crowd. */
export function hazardLoss(crowd, min, fraction) {
  return Math.min(crowd, Math.max(min, Math.ceil(crowd * fraction)));
}

/** Effective rallying radius. base = permanent value; mult = skill × fog multipliers. */
export function effectiveRadius(base, mult = 1) {
  return Math.max(R.radius_min, Math.min(R.radius_max * 1.6, base * mult));
}

export function clampBaseRadius(r) {
  return Math.max(R.radius_min, Math.min(R.radius_max, r));
}

/** Follower slot i around the leader (sunflower spiral), scaled to fit inside radius. */
export function formationSlot(i, radius) {
  const golden = 2.399963;
  const spread = Math.min(9, (radius * 0.85) / Math.sqrt(Math.max(1, i + 1)) + 4);
  const r = spread * Math.sqrt(i + 1);
  const a = i * golden;
  const k = Math.min(1, (radius * 0.9) / Math.max(1, r));
  return { dx: Math.cos(a) * r * k, dy: Math.sin(a) * r * k * 0.75 + 10 };
}

/** Deterministic PRNG (mulberry32) so stages are reproducible in tests. */
export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GATE_OPTIONS = {
  good: [
    { op: '+', value: 10, label: '+10 人' },
    { op: '*', value: 1.2, label: '人數 ×1.2' },
    { op: '+', value: 6, label: '+6 人' },
    { op: 'r', value: 20, label: '號召力 +20' },
  ],
  bad: [
    { op: '-', value: 10, label: '-10 人' },
    { op: '*', value: 0.8, label: '人數 ×0.8' },
    { op: 'r', value: -20, label: '號召力 -20' },
    { op: '-', value: 5, label: '-5 人' },
  ],
};

export const ITEM_DEFS = {
  megaphone: { icon: '📣', label: '大聲公', desc: '號召力 +15', good: true },
  bento: { icon: '🍱', label: '便當', desc: '+5 人', good: true },
  sun: { icon: '☀️', label: '陽光', desc: '技能能量 +25', good: true },
  coffee: { icon: '☕', label: '咖啡', desc: '號召力 +8・能量 +10', good: true },
  rumor: { icon: '💬', label: '謠言', desc: '號召力 -15', good: false },
};

const NPC_TYPES = ['lunch', 'black', 'volunteer', 'lost', 'sprinter', 'tired'];

/**
 * Build a stage layout. stage: 0 or 1. Returns world objects with `d` = distance from start.
 * Everything is spaced so that there is always a free lane (never a forced loss).
 */
export function generateStage({ stage = 0, difficulty = 'normal', target = 30, seed = 1 }) {
  const rng = rngFrom(seed * 97 + stage * 13 + 7);
  const freq = BALANCE.difficulty[difficulty]?.event_frequency_multiplier ?? 1;
  const length = R.stage_length[stage];
  const W = R.view_width;
  const npcs = [];
  const gates = [];
  const items = [];
  const hazards = [];
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const startD = 260;
  const endD = length - 260;
  // slots every ~150 units, each gets one "feature"
  let d = startD;
  let slot = 0;
  const gateEvery = stage === 0 ? 6 : 5;
  while (d < endD) {
    slot += 1;
    // always some bystanders: a cluster (3–6) at a random x
    const n = 2 + Math.floor(rng() * 3);
    const cx = 50 + rng() * (W - 100);
    for (let i = 0; i < n; i++) {
      npcs.push({ d: d + (rng() - 0.5) * 50, x: Math.max(24, Math.min(W - 24, cx + (rng() - 0.5) * 70)), type: pick(NPC_TYPES), need: 0 });
    }
    if (slot % gateEvery === 3) {
      const good = pick(GATE_OPTIONS.good);
      const second = rng() < (stage === 0 ? 0.65 : 0.8) ? pick(GATE_OPTIONS.bad) : pick(GATE_OPTIONS.good.filter((g) => g !== good));
      const leftGood = rng() < 0.5;
      gates.push({ d: d + 75, left: leftGood ? good : second, right: leftGood ? second : good, used: false });
    } else if (slot % 4 === 1) {
      // a big hesitant group that only joins a large enough circle
      const need = stage === 0 ? 70 : 80;
      const gx = 70 + rng() * (W - 140);
      const gN = 6 + Math.floor(rng() * 4);
      for (let i = 0; i < gN; i++) npcs.push({ d: d + 80 + (rng() - 0.5) * 30, x: gx + (rng() - 0.5) * 50, type: pick(NPC_TYPES), need, group: slot });
    } else {
      const r = rng();
      const hz = stage === 0 ? 0.55 * freq : 0.8 * freq;
      if (r < hz) {
        const kinds = stage === 0 ? ['cars', 'cars', 'manager', 'fog', 'meeting'] : ['cars', 'manager', 'manager', 'fog', 'meeting', 'rumor'];
        const kind = pick(kinds);
        const hd = d + 80;
        if (kind === 'cars') {
          // a jam across part of the road: 2–3 cars, always leaving a gap ≥ 90
          const gapX = 60 + rng() * (W - 120);
          const cars = [];
          for (let x = 20; x < W - 20; x += 62) if (Math.abs(x + 22 - gapX) > 60) cars.push(x);
          for (const x of cars.slice(0, 3 + Math.floor(rng() * 2))) hazards.push({ kind: 'car', d: hd + (rng() - 0.5) * 20, x: x + 22, w: 44, h: 26, color: pick([0xe83b3b, 0x5b8def, 0xf5f5f5, 0x64748b, 0xffb627]) });
        } else if (kind === 'manager') {
          hazards.push({ kind: 'manager', d: hd, x: 60 + rng() * (W - 120), range: 70 + rng() * 60, speed: 50 + rng() * 40 * (stage + 1), phase: rng() * 6, used: false });
        } else if (kind === 'fog') {
          hazards.push({ kind: 'fog', d: hd, x: W / 2 + (rng() - 0.5) * 120, w: 170 + rng() * 60, h: 110 });
        } else if (kind === 'meeting') {
          const leftSide = rng() < 0.5;
          hazards.push({ kind: 'meeting', d: hd, x: leftSide ? 70 : W - 70, w: 120, h: 90 });
        } else if (kind === 'rumor') {
          items.push({ kind: 'rumor', d: hd, x: 50 + rng() * (W - 100), vx: (rng() < 0.5 ? -1 : 1) * 40, used: false });
        }
      } else {
        const kind = pick(['megaphone', 'bento', 'sun', 'coffee', 'megaphone', 'bento']);
        items.push({ kind, d: d + 70, x: 40 + rng() * (W - 80), used: false });
      }
    }
    d += 150 + rng() * 40;
  }
  // guarantee every stage has the signature troubles (2 managers, a meeting room, fog)
  const need = { manager: stage === 0 ? 2 : 3, meeting: 1, fog: 1 };
  const spots = [0.28, 0.42, 0.56, 0.7, 0.82];
  let si = 0;
  for (const [kind, n] of Object.entries(need)) {
    let have = hazards.filter((h) => h.kind === kind).length;
    while (have < n && si < spots.length) {
      const hd = length * spots[si++] + 40;
      if (kind === 'manager') hazards.push({ kind, d: hd, x: 60 + rng() * (W - 120), range: 80 + rng() * 50, speed: 60 + rng() * 40, phase: rng() * 6, used: false });
      if (kind === 'meeting') hazards.push({ kind, d: hd, x: rng() < 0.5 ? 70 : W - 70, w: 120, h: 90 });
      if (kind === 'fog') hazards.push({ kind, d: hd, x: W / 2 + (rng() - 0.5) * 120, w: 180, h: 110 });
      have += 1;
    }
  }
  // ensure enough potential recruits: at least 2× the target outside need-groups
  let free = npcs.filter((n) => !n.need).length;
  while (free < target * 2) {
    npcs.push({ d: startD + rng() * (endD - startD), x: 30 + rng() * (W - 60), type: pick(NPC_TYPES), need: 0 });
    free += 1;
  }
  npcs.sort((a, b) => a.d - b.d);
  return { stage, length, target, npcs, gates, items, hazards };
}
