import test from 'node:test';
import assert from 'node:assert/strict';
import { PERKS, unlockedPerks, equippedPerks, togglePerk, newlyUnlocked, MAX_EQUIPPED } from '../../src/game/perks/perks.js';
import { defaultSave, migrate } from '../../src/game/systems/Storage.js';
import { BossSystem, HELPER } from '../../src/game/systems/BossSystem.js';

test('five perks, all locked on a fresh save', () => {
  assert.equal(PERKS.length, 5);
  assert.deepEqual(unlockedPerks(defaultSave()), []);
});

test('unlock conditions follow achievements / stats / best score', () => {
  const s = defaultSave();
  s.stats.lunchArrivals = 100;
  s.scores.hell.highest = 60000;
  s.stats.bossWins = 1;
  s.achievements = ['dual_hero', 'sun_envoy'];
  assert.deepEqual(unlockedPerks(s).sort(), PERKS.map((p) => p.id).sort());
  const before = unlockedPerks(defaultSave());
  assert.equal(newlyUnlocked(before, unlockedPerks(s)).length, 5);
});

test('equip: locked refused, max 2, toggle off', () => {
  const s = defaultSave();
  assert.equal(togglePerk(s, 'sweeper').ok, false);
  s.stats.bossWins = 1;
  s.stats.lunchArrivals = 100;
  s.scores.normal.highest = 70000;
  assert.ok(togglePerk(s, 'sweeper').ok);
  assert.ok(togglePerk(s, 'bento_station').ok);
  const third = togglePerk(s, 'radio_truck');
  assert.equal(third.ok, false);
  assert.match(third.reason, /最多/);
  assert.equal(equippedPerks(s).length, MAX_EQUIPPED);
  assert.equal(togglePerk(s, 'sweeper').equipped, false);
  assert.deepEqual(equippedPerks(s), ['bento_station']);
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
