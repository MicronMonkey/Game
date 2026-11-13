import test from 'node:test';
import assert from 'node:assert/strict';
import { PERKS, unlockedPerks, equippedPerks, togglePerk, newlyUnlocked, MAX_EQUIPPED } from '../../src/game/perks/perks.js';
import { defaultSave, migrate } from '../../src/game/systems/Storage.js';
import { BossSystem, HELPER } from '../../src/game/systems/BossSystem.js';

test('five perks, all locked on a fresh save', () => {
  assert.equal(PERKS.length, 5);
  assert.deepEqual(unlockedPerks(defaultSave()), []);
});

test('unlock conditions: scores, boss win, 零主管, ★★★', () => {
  const s = defaultSave();
  s.scores.normal.highest = 30000;
  assert.deepEqual(unlockedPerks(s), ['bento_station']);
  s.scores.hell.highest = 80000;
  s.stats.bossWins = 1;
  s.stats.noManagerRun = true;
  s.stats.threeStars = true;
  assert.deepEqual(unlockedPerks(s).sort(), PERKS.map((p) => p.id).sort());
  assert.equal(newlyUnlocked(['bento_station'], unlockedPerks(s)).length, 4);
});

test('equip: locked refused, one slot, new pick replaces, toggle off', () => {
  const s = defaultSave();
  assert.equal(togglePerk(s, 'sweeper').ok, false);
  s.stats.bossWins = 1;
  s.scores.normal.highest = 90000;
  assert.ok(togglePerk(s, 'sweeper').ok);
  const sw = togglePerk(s, 'radio_truck');
  assert.ok(sw.ok && sw.replaced === 'sweeper');
  assert.deepEqual(equippedPerks(s), ['radio_truck']);
  assert.equal(MAX_EQUIPPED, 1);
  assert.equal(togglePerk(s, 'radio_truck').equipped, false);
  assert.deepEqual(equippedPerks(s), []);
});

test('save migration keeps perksEquipped', () => {
  assert.deepEqual(migrate({ perksEquipped: ['sweeper'] }).perksEquipped, ['sweeper']);
  assert.deepEqual(migrate({}).perksEquipped, []);
});

test('boss helper slows low veils and burns one periodically; faster crit', () => {
  const b = new BossSystem({ maxHp: 1000, seconds: 60, helper: true, critSeconds: 2.4, rng: () => 0.5 });
  b.cloudTimer = 1e9;
  b.veilTimer = 1e9;
  b.veils.push({ id: 1, x: 100, y: HELPER.zoneY + 10, vx: 0, vy: 60, burn: 0 });
  b.tick(0.5, null);
  assert.ok(Math.abs(b.veils[0].y - (HELPER.zoneY + 10 + 15)) < 1e-6, 'half speed');
  b.helper.timer = 0.01;
  b.tick(0.05, null);
  assert.equal(b.veils.length, 0);
  assert.equal(b.burned, 1);
  const c = new BossSystem({ maxHp: 1000, seconds: 60, critSeconds: 2.4, rng: () => 0.99 });
  c.veilTimer = 1e9;
  c.cloudTimer = 1e9;
  for (let i = 0; i < 25; i++) c.tick(0.1, { x: c.weak.x, y: c.weak.y });
  assert.equal(c.crits, 1);
});

test('boss veil rate multiplies how often veils drop', () => {
  const count = (rate) => {
    const b = new BossSystem({ maxHp: 1e6, seconds: 1e6, veilRate: rate, rng: () => 0.5 });
    b.cloudTimer = 1e9;
    let n = 0;
    for (let i = 0; i < 600; i++) n += b.tick(0.1, null).filter((e) => e.type === 'veil').length;
    return n;
  };
  assert.ok(count(3) >= count(1) * 2.6, `${count(3)} vs ${count(1)}`);
});
