import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// gallery.js uses import.meta.env (Vite). Test its pure helpers via a tiny shim.
globalThis.window = globalThis;
const src = fs.readFileSync(new URL('../../src/game/ui/gallery.js', import.meta.url), 'utf8');
const normalize = new Function(`${src.match(/const CITY_INFO = [\s\S]*?\n};/)[0]}\n${src.match(/export function normalizePhotos[\s\S]*?\n}\n/)[0].replace('export ', '')}\nreturn normalizePhotos;`)();

test('photo JSON normalisation never throws and drops bad entries', () => {
  assert.deepEqual(normalize(null), { taoyuan: [], taichung: [] });
  assert.deepEqual(normalize({ taoyuan: 'x' }), { taoyuan: [], taichung: [] });
  const r = normalize({ taoyuan: [{ src: 'a.webp', caption: 'c' }, { src: '' }, null], taichung: [{ src: ' b.webp ' }] });
  assert.equal(r.taoyuan.length, 1);
  assert.equal(r.taoyuan[0].alt, 'c');
  assert.equal(r.taichung[0].src, 'b.webp');
});

test('shipped photo config has no fake photos and valid shape', () => {
  const j = JSON.parse(fs.readFileSync(new URL('../../public/data/event-photos.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(j.taoyuan) && Array.isArray(j.taichung));
  for (const p of [...j.taoyuan, ...j.taichung]) {
    assert.ok(fs.existsSync(new URL(`../../public/${p.src}`, import.meta.url)), `missing ${p.src}`);
  }
});

test('ending text: win and lose share the same gallery entry point', () => {
  const end = fs.readFileSync(new URL('../../src/game/scenes/EndingScene.js', import.meta.url), 'utf8');
  assert.equal((end.match(/openGallery\(/g) || []).length, 1);
});
