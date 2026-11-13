import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, difficultySettings, virtualClock } from '../../src/game/config.js';
import { comboMultiplier, arrivalScore, remainingSecondsBonus, bossRemainingBonus, bossInitialDamage } from '../../src/game/systems/scoring.js';
import { createRunState, registerArrival, tickCombo, sprinterTimeBonus, citiesReached, spendSun, addSun } from '../../src/game/systems/GameState.js';
import { BossSystem, phaseFor } from '../../src/game/systems/BossSystem.js';
import { defaultSave, migrate, recordRun, SAVE_KEY } from '../../src/game/systems/Storage.js';
import { evaluateAchievements } from '../../src/game/systems/achievements.js';

test('combo multiplier formula min(5, 1+floor((n-1)/3))', () => {
  assert.deepEqual([1, 2, 3, 4, 6, 7, 13, 30].map(comboMultiplier), [1, 1, 1, 2, 2, 3, 5, 5]);
});

test('arrival score with resonance is rounded integer', () => {
  assert.equal(arrivalScore(1, false), 100);
  assert.equal(arrivalScore(4, true), 300);
  assert.equal(remainingSecondsBonus(12.9), 240);
  assert.equal(bossRemainingBonus(10.5), 500);
  assert.deepEqual([0, 1, 2].map(bossInitialDamage), [0, 75, 150]);
});

test('difficulty settings scale time and boss HP', () => {
  assert.equal(difficultySettings('easy').bossHp, 800);
  assert.equal(difficultySettings('hell').bossHp, 1250);
  assert.equal(difficultySettings('normal').gatheringSeconds, 90);
  assert.equal(difficultySettings('easy').gatheringSeconds, 113);
});

test('virtual clock maps 12:00 → 12:30 from game seconds', () => {
  assert.equal(virtualClock(0, 90), '12:00');
  assert.equal(virtualClock(45, 90), '12:15');
  assert.equal(virtualClock(90, 90), '12:30');
  assert.equal(virtualClock(200, 90), '12:30');
  assert.equal(virtualClock(56.5, 113), '12:15');
});

test('arrival scored at most once per id; combo window', () => {
  const s = createRunState('normal');
  assert.ok(registerArrival(s, 'taoyuan', 'a', 'lunch'));
  assert.equal(registerArrival(s, 'taoyuan', 'a', 'lunch'), null);
  assert.equal(s.cities.taoyuan.arrived, 1);
  s.runClock = 2;
  registerArrival(s, 'taoyuan', 'b', 'black');
  assert.equal(s.combo, 2);
  assert.equal(s.sun, 20 + 3 + 3); // black extra sun is passed via opts by the scene
  s.runClock = 6;
  tickCombo(s);
  assert.equal(s.combo, 0);
});

test('sun never negative nor above capacity', () => {
  const s = createRunState('normal');
  assert.equal(spendSun(s, 999), false);
  addSun(s, 500);
  assert.equal(s.sun, 100);
});

test('sprinter bonus capped at 10s per run and initial+10', () => {
  const s = createRunState('normal');
  let total = 0;
  for (let i = 0; i < 8; i++) total += sprinterTimeBonus(s, 30, 90);
  assert.equal(total, 10);
  const s2 = createRunState('normal');
  assert.equal(sprinterTimeBonus(s2, 99, 90), 1);
});

test('citiesReached counts targets', () => {
  const s = createRunState('normal');
  s.cities.taoyuan.arrived = 30;
  assert.equal(citiesReached(s), 1);
});

const quiet = (b) => {
  b.veilTimer = 1e9;
  b.cloudTimer = 1e9;
  return b;
};

test('boss: DPS, crit after 3s, grace reset, phases, initial damage', () => {
  const b = quiet(new BossSystem({ maxHp: 1000, seconds: 60, rng: () => 0.99 }));
  b.tick(1, { x: 120, y: 200 }); // body, off the weakpoint
  assert.ok(Math.abs(b.hp - 980) < 1e-6, String(b.hp));
  const w = () => ({ x: b.weak.x, y: b.weak.y });
  for (let i = 0; i < 30; i++) b.tick(0.1, w());
  assert.equal(b.crits, 1);
  assert.ok(Math.abs(b.hp - (980 - 105 - 80)) < 1e-6, String(b.hp));
  b.tick(0.1, w());
  b.tick(0.3, { x: 5, y: 5 });
  assert.equal(b.charge, 0);
  assert.deepEqual([phaseFor(700, 1000), phaseFor(500, 1000), phaseFor(150, 1000)], [1, 2, 3]);
  assert.equal(new BossSystem({ maxHp: 1000, seconds: 60, initialDamage: 150 }).hp, 850);
});

test('boss: beam bonus capped at +45% and landed veils weaken the beam', () => {
  const b = quiet(new BossSystem({ maxHp: 1000, seconds: 60, powerBonus: 0.9 }));
  assert.equal(b.power(), 1.45); // crowd (≤0.3) + 手電筒夥伴 (0.15)
  b.landed = [3, 3, 3];
  assert.ok(Math.abs(b.power() - 1.45 * 0.5) < 1e-9);
});

test('boss: beam burns falling veils and charges the super; landed veil debuffs', () => {
  const b = new BossSystem({ maxHp: 1000, seconds: 60, rng: () => 0.5 });
  b.cloudTimer = 1e9;
  b.veilTimer = 0;
  b.tick(0.01, null); // spawns one veil
  assert.equal(b.veils.length, 1);
  const v = b.veils[0];
  b.veilTimer = 1e9;
  for (let i = 0; i < 10 && b.veils.length; i++) b.tick(0.05, { x: v.x, y: v.y });
  assert.equal(b.veils.length, 0);
  assert.equal(b.burned, 1);
  assert.ok(b.superMeter > 0);
  b.veils.push({ id: 99, x: 30, y: 360, vx: 0, vy: 100, burn: 0 });
  b.tick(0.2, null);
  assert.equal(b.landedCount, 1);
  assert.equal(b.landed.length, 1);
  b.superMeter = 1;
  assert.ok(b.activateSuper());
  assert.ok(b.superTime > 0 && b.superMeter === 0);
  assert.equal(b.activateSuper(), false);
});

test('boss: phase 2 plates block the beam; phase 3 only locks in order take damage', () => {
  const b = quiet(new BossSystem({ maxHp: 1000, seconds: 60, initialDamage: 500 }));
  assert.equal(b.phase, 2);
  const pl = b.plates()[0];
  const behind = { x: pl.x + (pl.x - 200) * 0.01, y: pl.y - 30 };
  assert.ok(b.blocker({ x: 200 + (pl.x - 200) * ((392 - (pl.y - 30)) / (392 - pl.y)), y: pl.y - 30 }) || b.blocker(behind));
  const c = quiet(new BossSystem({ maxHp: 1000, seconds: 60, initialDamage: 850, rng: () => 0.3 }));
  assert.equal(c.phase, 3);
  c.plateAngle = Math.PI / 2; // move plates out of the beam's way as much as possible
  const hp0 = c.hp;
  c.tick(0.5, { x: 120, y: 200 }); // body: no damage in phase 3
  assert.equal(c.hp, hp0);
  const wrong = c.locks[1];
  const before = c.hp;
  c.plates = () => [];
  for (let i = 0; i < 15; i++) c.tick(0.1, { x: wrong.x, y: wrong.y });
  assert.equal(c.hp, before, 'hitting a later lock does nothing');
  const first = c.currentLock();
  for (let i = 0; i < 11; i++) c.tick(0.1, { x: first.x, y: first.y });
  assert.equal(c.lockIndex, 1);
  assert.equal(before - c.hp, 75);
});

test('boss: same-frame kill beats timeout; timeout with HP>0 loses', () => {
  const b = quiet(new BossSystem({ maxHp: 1000, seconds: 0.5, rng: () => 0.99 }));
  b.hp = 5;
  b.tick(1, { x: b.weak.x, y: b.weak.y });
  assert.equal(b.result, 'win');
  const c = quiet(new BossSystem({ maxHp: 1000, seconds: 0.5, rng: () => 0.99 }));
  c.tick(1, null);
  assert.equal(c.result, 'lose');
});

test('single-city run: player city + automatic partner city', async () => {
  const s = createRunState('normal', 'taichung');
  assert.equal(s.city, 'taichung');
  assert.equal(s.allyCity, 'taoyuan');
  assert.equal(createRunState('normal', 'bogus').city, 'taoyuan');
});

test('storage: namespace, migration, per-difficulty record', () => {
  assert.equal(SAVE_KEY, 'dualCity1230.save.v1');
  const m = migrate({ scores: { hell: { highest: 9 } }, settings: { soundEnabled: false } });
  assert.equal(m.scores.hell.highest, 9);
  assert.equal(m.scores.easy.highest, 0);
  assert.equal(m.settings.soundEnabled, false);
  assert.equal(migrate('garbage').schemaVersion, 1);
  const s = defaultSave();
  assert.ok(recordRun(s, { difficulty: 'normal', score: 500, longestCombo: 4, bossWin: true, clearSeconds: 200 }).newHigh);
  assert.ok(!recordRun(s, { difficulty: 'normal', score: 400, longestCombo: 1, bossWin: false }).newHigh);
  assert.equal(s.scores.normal.highest, 500);
  assert.equal(s.scores.easy.highest, 0);
  assert.equal(s.stats.played, 2);
});

test('achievements', () => {
  const s = defaultSave();
  s.galleryViewed = { taoyuan: true, taichung: true };
  const u = evaluateAchievements(s, { citiesReached: 2, bossWin: true, difficulty: 'hell', bossFailedBefore: true });
  assert.deepEqual(u.map((a) => a.id).sort(), ['dual_hero', 'lunch_legend', 'never_give_up', 'witness']);
  assert.equal(evaluateAchievements(s).length, 0);
});

test('balance config sanity', () => {
  assert.equal(BALANCE.boss.critical_damage, 80);
  assert.equal(BALANCE.stages.targets.taoyuan, 30);
});
