import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCount, hazardLoss, starsFor, effectiveRadius, clampBaseRadius, formationSlot, generateStage, rngFrom, R, GATE_OPTIONS } from '../../src/game/runner/runnerLogic.js';
import { SkillSystem } from '../../src/game/systems/SkillSystem.js';
import { createRunState } from '../../src/game/systems/GameState.js';

test('gate maths: +, -, ×, never negative, integers', () => {
  assert.equal(applyCount(10, '+', 10), 20);
  assert.equal(applyCount(4, '-', 10), 0);
  assert.equal(applyCount(10, '*', 1.2), 12);
  assert.equal(applyCount(3, '*', 1.2), 4);
  assert.equal(applyCount(10, '*', 0.8), 8);
  assert.equal(applyCount(7, 'r', 20), 7);
});

test('obstacle losses scale with crowd size', () => {
  assert.equal(hazardLoss(3, 5, 0.15), 3);
  assert.equal(hazardLoss(20, 5, 0.15), 5);
  assert.equal(hazardLoss(100, 5, 0.15), 15);
  assert.equal(hazardLoss(0, 1, 0.04), 0);
});

test('stage stars', () => {
  assert.deepEqual([10, 45, 70, 90].map((a) => starsFor(a, 45)), [0, 1, 2, 3]);
});

test('radius clamps', () => {
  assert.equal(clampBaseRadius(5), R.radius_min);
  assert.equal(clampBaseRadius(999), R.radius_max);
  assert.ok(effectiveRadius(52, 1.6) > 80);
  assert.equal(effectiveRadius(30, 0.6), R.radius_min);
});

test('formation slots stay inside the circle', () => {
  for (const radius of [30, 60, 120]) {
    for (let i = 0; i < 80; i++) {
      const s = formationSlot(i, radius);
      assert.ok(Math.hypot(s.dx, s.dy - 10) <= radius + 1, `${radius}/${i}`);
    }
  }
});

test('rng is deterministic', () => {
  const a = rngFrom(5);
  const b = rngFrom(5);
  assert.equal(a(), b());
});

test('stage layout: enough recruits, gates offer a choice, car jams leave a gap', () => {
  for (const difficulty of ['easy', 'normal', 'hell']) {
    for (const stage of [0, 1]) {
      for (let seed = 1; seed < 15; seed++) {
        const target = stage ? 45 : 30;
        const s = generateStage({ stage, difficulty, target, seed });
        assert.ok(s.npcs.filter((n) => !n.need).length >= target * 2);
        assert.ok(s.gates.length >= 2, 'has gates');
        assert.ok(s.hazards.filter((h) => h.kind === 'manager').length >= 2, 'managers');
        assert.ok(s.hazards.some((h) => h.kind === 'meeting') && s.hazards.some((h) => h.kind === 'fog'), 'meeting + fog');
        for (const g of s.gates) assert.ok(GATE_OPTIONS.good.includes(g.left) || GATE_OPTIONS.good.includes(g.right), 'at least one good side');
        // group cars by row and check there's a ≥ 60-wide gap somewhere
        const rows = {};
        for (const h of s.hazards.filter((h) => h.kind === 'car')) (rows[Math.round(h.d / 60)] ||= []).push(h);
        for (const cars of Object.values(rows)) {
          const xs = cars.flatMap((c) => [c.x - c.w / 2, c.x + c.w / 2]).sort((a, b) => a - b);
          const edges = [0, ...xs, R.view_width];
          let gap = 0;
          for (let i = 0; i < edges.length - 1; i += 2) gap = Math.max(gap, edges[i + 1] - edges[i]);
          assert.ok(gap >= 60, `gap ${gap}`);
        }
        for (const o of [...s.npcs, ...s.items]) assert.ok(o.d > 0 && o.d < s.length);
      }
    }
  }
});

test('runner skills: rally multiplier, shield, cost & cooldown', () => {
  const st = createRunState('normal');
  const k = new SkillSystem(st);
  st.sun = 100;
  assert.equal(k.radiusMultiplier(), 1);
  assert.ok(k.cast('rally').ok);
  assert.equal(k.radiusMultiplier(), 1.6);
  assert.match(k.reason('rally'), /冷卻/);
  assert.ok(k.cast('shield').ok);
  assert.ok(k.shielded());
  assert.match(k.cast('city_resonance').reason, /陽光不足/);
  k.tick(6.1);
  assert.equal(k.shielded(), false);
  assert.equal(k.radiusMultiplier(), 1);
});
