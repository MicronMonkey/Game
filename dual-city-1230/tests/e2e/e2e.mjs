// End-to-end acceptance run (docs/07) with Playwright + Chromium against `vite preview`.
// Usage: npm run build && npx vite preview --port 4173 &  then  npm run test:e2e
// Env: BASE_URL (default http://localhost:4173/), SHOTS=dir to save screenshots.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = await import('playwright'));
}

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const SHOTS = process.env.SHOTS || '';
const FIXTURE = fs.readFileSync(new URL('./fixtures/test-grey.png', import.meta.url));
const results = [];
const pass = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const shot = async (page, name) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
};

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()));
  return page;
}

const sceneKey = (page) => page.evaluate(() => window.__dc.App.hooks.scene?.sys.settings.key);
async function waitScene(page, key, timeout = 30000) {
  await page.waitForFunction((k) => window.__dc?.App.hooks.scene?.sys.settings.key === k && window.__dc.App.hooks.scene.sys.isActive(), key, { timeout });
}

/** Screen (CSS px) position of a field point. */
async function fieldToScreen(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const f = window.__dc.App.hooks.scene.field;
    const dpr = window.__dc.App.dpr;
    return { x: (f.container.x + x * f.scale) / dpr, y: (f.container.y + y * f.scale) / dpr };
  }, { x, y });
}

async function startGame(page, difficulty = 'normal', city = 'taoyuan') {
  await page.click('text=開始遊戲');
  await page.click(`.diff-${difficulty}`);
  await page.click(`.city-${city}`);
  if (await page.locator('.tutorial').count()) await page.click('text=跳過教學');
  await waitScene(page, 'Gathering');
}

/** Runner bot: steer toward the nearest joinable bystander ahead (or stand still). */
async function autoplay(page, on = true) {
  await page.evaluate((on) => {
    const A = window.__dc.App;
    clearInterval(A._auto);
    if (!on) return;
    A._auto = setInterval(() => {
      const sc = A.hooks.scene;
      if (!sc?.npcs || sc.paused || sc.ended) return;
      const pl = sc.player;
      const cands = sc.npcs.filter((n) => n.state === 'idle' && n.d > pl.d - 20 && n.d < pl.d + 300 && !(n.need && sc.radius() < n.need));
      cands.sort((a, b) => a.d - b.d);
      const t = cands[0];
      sc.dragTarget = t ? { x: t.x, rel: Math.min(t.d - sc.scroll - 10, sc.viewH - 80) } : { x: 180, rel: sc.viewH * 0.4 };
    }, 100);
  }, on);
}

/** Boss aimbot: keep the reticle on the weakpoint (win) or on an empty corner (lose). */
async function bossAim(page, mode) {
  await page.evaluate((mode) => {
    const A = window.__dc.App;
    clearInterval(A._aim);
    A._aim = setInterval(() => {
      const sc = A.hooks.scene;
      if (!sc?.boss) return;
      if (mode === 'win') {
        const t = sc.boss.phase === 3 ? sc.boss.currentLock() : sc.boss.weak;
        sc.aim.x = t.x;
        sc.aim.y = t.y;
        if (sc.boss.canSuper()) sc.trySuper();
      } else {
        sc.aim.x = 10;
        sc.aim.y = 360;
      }
    }, 16);
  }, mode);
}

async function albumSignature(page) {
  return page.evaluate(() => [...document.querySelectorAll('.gallery .album')].map((a) => a.outerHTML.replace(/aria-current="(true|false)"/g, '')).join('\n'));
}

const browser = await chromium.launch();
try {
  // ---------- 1. boot, intro skip, menu ----------
  let page = await newPage(browser);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('fack.expansion.v1', '{"legacy":true}');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto(`${BASE}?test=1`);
  await page.waitForSelector('text=略過', { timeout: 15000 });
  pass('首次開場有略過選項', true);
  await page.click('text=略過');
  await page.waitForSelector('.menu-card');
  await shot(page, '01-menu');
  pass('首頁載入', (await sceneKey(page)) === 'Menu');
  await page.reload();
  await page.waitForSelector('.menu-card', { timeout: 15000 });
  pass('再次載入不強制重播開場', (await page.locator('.intro').count()) === 0);

  // ---------- 2. menu buttons ----------
  await page.click('text=最高紀錄');
  pass('最高紀錄按鈕可用', await page.locator('.records').isVisible());
  await page.click('text=關閉');
  await page.click('text=事件與遊戲免責說明');
  pass('免責說明按鈕可用', await page.locator('text=人物、對話、障礙').isVisible());
  await page.click('text=我知道了');
  await page.click('text=遊戲教學');
  pass('教學按鈕可用', await page.locator('.tut-card').isVisible());
  await page.click('text=跳過教學');
  const soundBefore = await page.evaluate(() => window.__dc.App.save.settings.soundEnabled);
  await page.click('.toggles .btn >> nth=0');
  const soundAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('dualCity1230.save.v1')).settings.soundEnabled);
  pass('音效開關保存', soundBefore !== soundAfter);
  await page.click('.toggles .btn >> nth=0');

  // ---------- 3. gallery direct, no photos ----------
  await page.click('text=11/13 真實紀錄');
  await page.waitForSelector('.gallery .album-taichung');
  const missing = await page.locator('.photo-missing').count();
  await shot(page, '02-gallery-empty');
  pass('首頁「11/13 真實紀錄」無條件直達相簿', true);
  pass('沒有真實照片時兩城皆顯示「照片整理中」', missing === 2 && (await page.locator('text=桃園真實活動照片整理中').count()) === 1);
  pass('相簿無偽造照片（無 <img>）', (await page.locator('.gallery img').count()) === 0);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.menu-card');
  pass('鍵盤返回首頁', !(await page.locator('.gallery').count()));

  // ---------- 4. runner core ----------
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dualCity1230.save.v1'));
    s.tutorialCompleted = false;
    localStorage.setItem('dualCity1230.save.v1', JSON.stringify(s));
    window.__dc.App.save.tutorialCompleted = false;
  });
  await page.click('text=開始遊戲');
  await page.click('.diff-normal');
  pass('選難度後可選擇桃園廠／台中廠', (await page.locator('.city-taoyuan').isVisible()) && (await page.locator('.city-taichung').isVisible()));
  await page.click('.city-taoyuan');
  pass('首次開始顯示教學', await page.locator('.tut-card').isVisible());
  await page.click('text=跳過教學');
  await waitScene(page, 'Gathering');
  pass('教學狀態持久化', await page.evaluate(() => JSON.parse(localStorage.getItem('dualCity1230.save.v1')).tutorialCompleted === true));
  await page.waitForTimeout(1200);
  await shot(page, '03-runner');
  const sc1 = await page.evaluate(() => window.__dc.App.hooks.scene.scroll);
  await page.waitForTimeout(700);
  const sc2 = await page.evaluate(() => window.__dc.App.hooks.scene.scroll);
  pass('畫面自動往前捲動', sc2 > sc1, `${sc1.toFixed(0)} → ${sc2.toFixed(0)}`);
  // keyboard: move left/right/up
  const k0 = await page.evaluate(() => ({ ...window.__dc.App.hooks.scene.player }));
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('ArrowUp');
  const k1 = await page.evaluate(() => ({ ...window.__dc.App.hooks.scene.player, scroll: window.__dc.App.hooks.scene.scroll }));
  pass('方向鍵上下左右操控主角', k1.x < k0.x - 20 && k1.d - k0.d > 60, `x ${k0.x.toFixed(0)}→${k1.x.toFixed(0)} d ${k0.d.toFixed(0)}→${k1.d.toFixed(0)}`);
  // touch/mouse drag steering
  const box = await page.evaluate(() => { const d = window.__dc.App.dpr; const sc = window.__dc.App.hooks.scene; return { x: sc.ox / d + 180 * sc.viewScale / d, y: sc.areaTop / d + 200 }; });
  const x0 = await page.evaluate(() => window.__dc.App.hooks.scene.player.x);
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y, { steps: 5 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  const x1 = await page.evaluate(() => window.__dc.App.hooks.scene.player.x);
  pass('拖曳畫面操控主角', x1 > x0 + 40, `${x0.toFixed(0)} → ${x1.toFixed(0)}`);
  // recruiting: bystander inside the circle joins
  const rec = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const n = sc.npcs.find((x) => x.state === 'idle' && !x.need && x.d > sc.player.d + 40);
    const before = sc.crowd;
    const score = window.__dc.App.run.score;
    n.x = sc.player.x + 10;
    n.d = sc.player.d + 20;
    return { id: sc.npcs.indexOf(n), before, score };
  });
  await page.waitForTimeout(150);
  const recAfter = await page.evaluate((id) => ({ state: window.__dc.App.hooks.scene.npcs[id].state, crowd: window.__dc.App.hooks.scene.crowd, score: window.__dc.App.run.score }), rec.id);
  pass('黃圈內的路人加入並跟著走（計分）', recAfter.state === 'following' && recAfter.crowd === rec.before + 1 && recAfter.score > rec.score, JSON.stringify(recAfter));
  // outside circle → not recruited
  const far = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const n = sc.npcs.find((x) => x.state === 'idle' && !x.need && x.d > sc.player.d + 40);
    n.x = sc.player.x + sc.radius() + 60 > 340 ? sc.player.x - sc.radius() - 60 : sc.player.x + sc.radius() + 60;
    n.d = sc.player.d + 10;
    return sc.npcs.indexOf(n);
  });
  await page.waitForTimeout(150);
  pass('黃圈外的路人不會加入', (await page.evaluate((id) => window.__dc.App.hooks.scene.npcs[id].state, far)) === 'idle');
  // big hesitant group requires 號召力
  const need = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const n = sc.npcs.find((x) => x.state === 'idle' && x.need);
    sc.baseRadius = 40;
    n.x = sc.player.x + 5;
    n.d = sc.player.d + 15;
    return { id: sc.npcs.indexOf(n), need: n.need };
  });
  await page.waitForTimeout(150);
  const needLow = await page.evaluate((id) => window.__dc.App.hooks.scene.npcs[id].state, need.id);
  await page.evaluate(() => { window.__dc.App.hooks.scene.baseRadius = 100; });
  await page.waitForTimeout(150);
  const needHigh = await page.evaluate((id) => window.__dc.App.hooks.scene.npcs[id].state, need.id);
  pass('觀望人群需要足夠號召力才加入', needLow === 'idle' && needHigh === 'following', `${needLow} → ${needHigh}`);
  await page.evaluate(() => { window.__dc.App.hooks.scene.baseRadius = 52; });
  // gates & items
  const gi = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    sc.changeCrowd(10);
    const out = { start: sc.crowd };
    sc.applyGate({ op: '*', value: 1.2, label: '人數 ×1.2' });
    out.mul = sc.crowd;
    sc.applyGate({ op: '-', value: 10, label: '-10 人' });
    out.minus = sc.crowd;
    const r0 = sc.baseRadius;
    sc.applyGate({ op: 'r', value: 20, label: '號召力 +20' });
    out.r = sc.baseRadius - r0;
    sc.applyItem({ kind: 'bento', x: 0, d: 0, ring: {}, icon: {}, cap: {} });
    out.bento = sc.crowd;
    const r1 = sc.baseRadius;
    sc.applyItem({ kind: 'rumor', x: 0, d: 0, ring: {}, icon: {}, cap: {} });
    out.rumor = sc.baseRadius - r1;
    return out;
  });
  pass('門與道具：×1.2 / -10 / 號召力+20 / 便當+5 / 謠言', gi.mul === Math.round(gi.start * 1.2) && gi.minus === Math.max(0, gi.mul - 10) && gi.r === 20 && gi.bento === gi.minus + 5 && gi.rumor === -15, JSON.stringify(gi));
  // walking through a real gate applies the side you are on
  const gate = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const g = sc.gates.find((x) => !x.used);
    sc.player.d = g.d - 5;
    sc.prevD = g.d - 5;
    sc.player.x = 60; // left side
    sc.scroll = g.d - 200;
    return { d: g.d, left: g.left.label, before: sc.crowd, r: sc.baseRadius };
  });
  await page.evaluate((d) => { const sc = window.__dc.App.hooks.scene; sc.player.d = d + 5; }, gate.d);
  await page.waitForTimeout(150);
  const gateUsed = await page.evaluate((d) => window.__dc.App.hooks.scene.gates.find((g) => g.d === d).used, gate.d);
  pass('走過左右門會套用所選那一邊', gateUsed, gate.left);
  // manager pulls followers; shield blocks it
  const mg = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    sc.changeCrowd(20);
    const m = sc.hazards.find((h) => h.kind === 'manager' && !h.used);
    m.d = sc.player.d;
    m.baseX = sc.player.x;
    m.range = 1;
    const before = sc.crowd;
    return { before };
  });
  await page.waitForTimeout(200);
  const mgAfter = await page.evaluate(() => window.__dc.App.hooks.scene.crowd);
  await shot(page, '03b-manager');
  pass('主管把夥伴拉回去開會（人數減少）', mgAfter < mg.before, `${mg.before} → ${mgAfter}`);
  const sh = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    window.__dc.App.run.sun = 100;
    sc.skills.cooldowns.shield = 0;
    sc.castSkill('shield');
    const m = sc.hazards.find((h) => h.kind === 'manager' && !h.used);
    m.d = sc.player.d;
    m.baseX = sc.player.x;
    m.range = 1;
    return sc.crowd;
  });
  await page.waitForTimeout(200);
  pass('團結護盾擋下主管', (await page.evaluate(() => window.__dc.App.hooks.scene.crowd)) === sh);
  // fog shrinks the circle; rally enlarges it
  const fog = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    sc.skills.active.shield = 0;
    const r0 = sc.radius();
    const f = sc.hazards.find((h) => h.kind === 'fog') || (sc.hazards.push({ kind: 'fog', d: 0, x: 0, w: 200, h: 120 }), sc.hazards[sc.hazards.length - 1]);
    f.d = sc.player.d;
    f.x = sc.player.x;
    return { r0, fd: f.d };
  });
  await page.waitForTimeout(150);
  const fogR = await page.evaluate(() => ({ r: window.__dc.App.hooks.scene.radius(), chip: !!document.querySelector('.chip.debuff') }));
  await shot(page, '03c-fog');
  pass('信心不足霧氣讓號召力變小＋紅色提示', fogR.r < fog.r0 && fogR.chip, `${fog.r0} → ${fogR.r}`);
  await page.evaluate(() => { const sc = window.__dc.App.hooks.scene; sc.hazards.filter((h) => h.kind === 'fog').forEach((h) => (h.d = -9999)); });
  await page.waitForTimeout(100);
  const ral = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const r0 = sc.radius();
    window.__dc.App.run.sun = 100;
    sc.skills.cooldowns.rally = 0;
    sc.castSkill('rally');
    return { r0, r1: sc.radius() };
  });
  await page.waitForTimeout(200);
  const ralUi = await page.evaluate(() => ({ chip: !!document.querySelector('.chip.buff'), active: !!document.querySelector('.skill2.active') }));
  await shot(page, '03d-rally');
  pass('大聲號召：號召力 ×1.6 + Buff 標示', Math.abs(ral.r1 - ral.r0 * 1.6) < 1 && ralUi.chip && ralUi.active, JSON.stringify({ ...ral, ...ralUi }));
  await page.evaluate(() => { window.__dc.App.hooks.scene.skills.active.rally = 0.05; });
  await page.waitForTimeout(300);
  pass('Buff 結束後特效消失', !(await page.evaluate(() => !!document.querySelector('.chip.buff') || !!document.querySelector('.skill2.active'))));
  // ready glow
  const glow = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    Object.keys(sc.skills.cooldowns).forEach((k) => (sc.skills.cooldowns[k] = 0));
    window.__dc.App.run.sun = 100;
    return true;
  });
  await page.waitForTimeout(150);
  const readyN = await page.locator('.skill2.ready').count();
  await page.evaluate(() => { window.__dc.App.run.sun = 0; });
  await page.waitForTimeout(150);
  const readyZ = await page.locator('.skill2.ready').count();
  pass('技能準備好時發光、未準備時不發光', glow && readyN === 3 && readyZ === 0, `${readyN} → ${readyZ}`);
  pass('能量條沒有圖示刻度', (await page.locator('.energy-bar .tick, .sun-ticks').count()) === 0);
  // pause
  await page.click('.hud-top .btn-icon');
  const p1 = await page.evaluate(() => ({ s: window.__dc.App.hooks.scene.scroll, cd: window.__dc.App.hooks.scene.skills.cooldowns.rally }));
  await page.waitForTimeout(800);
  const p2 = await page.evaluate(() => ({ s: window.__dc.App.hooks.scene.scroll, cd: window.__dc.App.hooks.scene.skills.cooldowns.rally }));
  pass('暫停時捲動與冷卻停止', p1.s === p2.s && p1.cd === p2.cd);
  await page.click('text=繼續遊戲');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  pass('分頁失焦自動暫停', await page.evaluate(() => window.__dc.App.hooks.scene.paused));
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
  await page.click('text=繼續遊戲');

  // ---------- 5. full run → boss WIN ----------
  await autoplay(page, true);
  await page.evaluate(() => (window.__dc.App.timeScale = 4));
  await waitScene(page, 'Sync', 120000);
  const s1 = await page.evaluate(() => ({ a: window.__dc.App.run.stageArrived[0], t: window.__dc.App.run.stageTargets[0] }));
  pass('第一幕抵達終點 → 第二幕（不會卡關）', true, JSON.stringify(s1));
  await page.waitForTimeout(1500);
  await shot(page, '05-sync');
  await waitScene(page, 'Boss', 120000);
  await autoplay(page, false);
  const syncSummary = await page.evaluate(() => ({ s2: window.__dc.App.run.stageArrived[1], t2: window.__dc.App.run.stageTargets[1], initDmg: window.__dc.App.run.bossInitialDamage, score: window.__dc.App.run.score }));
  pass('第二幕結束進入 Boss', true, JSON.stringify(syncSummary));
  await page.evaluate(() => (window.__dc.App.timeScale = 1));
  await page.waitForTimeout(1900);
  await page.evaluate(() => { window.__dc.App.hooks.scene.boss.superMeter = 1; });
  await page.waitForTimeout(100);
  pass('雙城合擊充滿後按鈕可用', (await page.locator('.super-btn.ready').count()) === 1);
  await page.click('.super-btn');
  pass('按下雙城合擊啟動大招', await page.evaluate(() => window.__dc.App.hooks.scene.boss.superTime > 0));
  await page.evaluate(() => { const b = window.__dc.App.hooks.scene.boss; b.superTime = 0; });
  const wk = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const d = window.__dc.App.dpr;
    return { x: (sc.root.x + sc.boss.weak.x * sc.fieldScale) / d, y: (sc.root.y + sc.boss.weak.y * sc.fieldScale) / d, hp: sc.boss.hp };
  });
  await page.mouse.move(wk.x, wk.y);
  await page.waitForTimeout(700);
  const hpAfter = await page.evaluate(() => window.__dc.App.hooks.scene.boss.hp);
  await shot(page, '06-boss');
  pass('滑鼠瞄準弱點造成 Boss 扣血', hpAfter < wk.hp, `${wk.hp.toFixed(0)} → ${hpAfter.toFixed(0)}`);
  await bossAim(page, 'win');
  await page.evaluate(() => (window.__dc.App.timeScale = 4));
  await waitScene(page, 'Ending', 60000);
  const winRun = await page.evaluate(() => ({ result: window.__dc.App.run.bossResult, score: window.__dc.App.run.score }));
  pass('Boss HP 0 → 成功', winRun.result === 'win', `score=${winRun.score}`);
  await page.evaluate(() => (window.__dc.App.timeScale = 1));
  await page.waitForSelector('.end-card.win');
  await shot(page, '07-win');
  await page.click('text=略過');
  await page.waitForSelector('.gallery .album-taichung');
  const sigWin = await albumSignature(page);
  pass('成功過場可略過並進入相簿', sigWin.length > 0);
  const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await page.click('text=分享遊戲成績');
  const download = await dl;
  pass('分享：不支援 Web Share 時下載 PNG', !!download && /\.png$/.test(download.suggestedFilename()), download?.suggestedFilename());
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dualCity1230.save.v1')));
  pass('分難度保存最高分', saved.scores.normal.highest === winRun.score && saved.stats.bossWins === 1);
  pass('不污染其他遊戲 localStorage', (await page.evaluate(() => localStorage.getItem('fack.expansion.v1'))) === '{"legacy":true}');

  // ---------- 6. replay → boss LOSE ----------
  await page.click('text=再玩一次');
  await waitScene(page, 'Gathering');
  const fresh = await page.evaluate(() => ({ score: window.__dc.App.run.score, crowd: window.__dc.App.hooks.scene.crowd, recorded: !!window.__dc.App.run.recorded, city: window.__dc.App.run.city }));
  pass('重新遊玩無殘留舊局分數（沿用同一廠區）', fresh.score === 0 && fresh.crowd === 0 && !fresh.recorded && fresh.city === 'taoyuan', JSON.stringify(fresh));
  // idle player: the camera still pushes them over the finish line
  await page.evaluate(() => (window.__dc.App.timeScale = 6));
  await waitScene(page, 'Boss', 120000);
  const zero = await page.evaluate(() => ({ a: window.__dc.App.run.stageArrived, init: window.__dc.App.run.bossInitialDamage }));
  pass('什麼都不做也會被推過終點、未達標也能進 Boss', zero.a.length === 2, JSON.stringify(zero));
  await bossAim(page, 'lose');
  await waitScene(page, 'Ending', 90000);
  const loseRun = await page.evaluate(() => ({ result: window.__dc.App.run.bossResult, hp: window.__dc.App.run.bossStats.hp }));
  pass('時間 0 且 HP>0 → 失敗', loseRun.result === 'lose' && loseRun.hp > 0, JSON.stringify(loseRun));
  await page.evaluate(() => (window.__dc.App.timeScale = 1));
  await page.waitForSelector('.end-card.lose');
  await shot(page, '09-lose');
  pass('失敗過場文案', (await page.locator('text=黑箱尚未融化，陽光不會停止。').count()) > 0);
  await page.waitForSelector('.gallery .album-taichung', { timeout: 10000 });
  const sigLose = await albumSignature(page);
  pass('成功與失敗進入「完全相同」的相簿', sigWin === sigLose);
  pass('全程無 JS 錯誤', page.errors.length === 0, page.errors.slice(0, 3).join(' | '));
  await page.context().close();

  // ---------- 7. gallery with photos / broken image / one city / JSON 404 ----------
  page = await newPage(browser);
  await page.route('**/data/event-photos.json', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ taoyuan: [{ src: 'assets/photos/test-a.png', caption: '測試 A', credit: 'QA', alt: '測試圖 A' }, { src: 'assets/photos/missing.webp', caption: '缺圖', alt: '缺圖' }], taichung: [] }) }),
  );
  await page.route('**/assets/photos/test-a.png', (r) => r.fulfill({ contentType: 'image/png', body: FIXTURE }));
  await page.goto(`${BASE}?test=1`);
  await page.click('text=略過').catch(() => {});
  await page.click('text=11/13 真實紀錄');
  await page.waitForSelector('.album-taoyuan .slide');
  await page.waitForTimeout(500);
  pass('僅一城有照片：另一城仍顯示整理中', (await page.locator('text=台中真實活動照片整理中').count()) === 1 && (await page.locator('.album-taoyuan .slide').count()) === 2);
  await page.click('.album-taoyuan .nav.next');
  await page.waitForTimeout(400);
  pass('缺一張照片顯示載入失敗而不白屏', (await page.locator('.photo-broken').count()) === 1);
  pass('左右切換與計數', (await page.locator('.album-taoyuan .counter').textContent()) === '2 / 2');
  await page.click('.album-taoyuan .nav.prev');
  await page.click('.album-taoyuan .slide >> nth=0');
  pass('點擊放大燈箱', await page.locator('.lightbox').isVisible());
  await shot(page, '10-lightbox');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  pass('燈箱鍵盤關閉', (await page.locator('.lightbox').count()) === 0);
  const fit = await page.evaluate(() => getComputedStyle(document.querySelector('.album-taoyuan img')).objectFit);
  pass('照片 object-fit: contain 不裁切', fit === 'contain');
  // swipe
  const vp = await page.locator('.album-taoyuan .viewport').boundingBox();
  await page.mouse.move(vp.x + vp.width * 0.8, vp.y + vp.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.x + vp.width * 0.2, vp.y + vp.height / 2, { steps: 5 });
  await page.mouse.up();
  pass('左右滑動切換', (await page.locator('.album-taoyuan .counter').textContent()) === '2 / 2');
  await page.context().close();

  page = await newPage(browser);
  await page.route('**/data/event-photos.json', (r) => r.fulfill({ status: 404, body: 'nope' }));
  await page.goto(`${BASE}?test=1`);
  await page.click('text=略過').catch(() => {});
  await page.click('text=11/13 真實紀錄');
  await page.waitForSelector('.album-taichung');
  pass('JSON 404 不白屏、兩城顯示整理中', (await page.locator('.photo-missing').count()) === 2);
  await page.click('text=回到首頁');
  pass('相簿可返回首頁', await page.locator('.menu-card').isVisible());
  await page.context().close();

  // ---------- 7b. two-finger: steer with one finger while tapping a skill with the other ----------
  page = await newPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto(`${BASE}?test=1`);
  await page.click('text=略過').catch(() => {});
  await startGame(page, 'normal', 'taoyuan');
  await page.waitForTimeout(800);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ ...p, radiusX: 4, radiusY: 4, force: 1 })) });
  await page.evaluate(() => { window.__dc.App.run.sun = 100; });
  const btn = await page.locator('.sk2-rally').boundingBox();
  const f1 = { x: 195, y: 420, id: 1 };
  const x0t = await page.evaluate(() => window.__dc.App.hooks.scene.player.x);
  await touch('touchStart', [f1]);
  for (let i = 1; i <= 4; i++) await touch('touchMove', [{ ...f1, x: f1.x + i * 15 }]);
  const f1b = { ...f1, x: f1.x + 60 };
  const f2 = { x: btn.x + btn.width / 2, y: btn.y + btn.height / 2, id: 2 };
  await touch('touchStart', [f1b, f2]);
  await touch('touchMove', [f1b]); // lifts finger 2 only (CDP: touchEnd releases all)
  await page.waitForTimeout(100);
  const mid = await page.evaluate(() => ({ rally: window.__dc.App.hooks.scene.skills.active.rally > 0, drag: !!window.__dc.App.hooks.scene.drag }));
  for (let i = 1; i <= 4; i++) await touch('touchMove', [{ ...f1b, x: f1b.x + i * 10 }]);
  await page.waitForTimeout(400);
  const x1t = await page.evaluate(() => window.__dc.App.hooks.scene.player.x);
  await touch('touchEnd', []);
  pass('一指拖曳中，另一指可按技能（技能施放、拖曳不中斷）', mid.rally && mid.drag && x1t > x0t + 40, JSON.stringify({ ...mid, x0: Math.round(x0t), x1: Math.round(x1t) }));
  await page.context().close();

  // ---------- 8. viewports ----------
  for (const [w, h] of [[375, 667], [390, 844], [393, 852], [430, 932], [1366, 768]]) {
    page = await newPage(browser, { viewport: { width: w, height: h }, hasTouch: w < 1000 });
    await page.goto(`${BASE}?test=1`);
    await page.click('text=略過').catch(() => {});
    await startGame(page, 'normal', w < 1000 ? 'taichung' : 'taoyuan');
    await page.waitForTimeout(1200);
    const lay = await page.evaluate(() => {
      const sc = window.__dc.App.hooks.scene;
      const d = window.__dc.App.dpr;
      const top = document.querySelector('.status-chips').getBoundingClientRect();
      const bottom = document.querySelector('.hud-bottom').getBoundingClientRect();
      const sk = [...document.querySelectorAll('.skill2')].map((b) => b.getBoundingClientRect());
      return {
        viewH: Math.round(sc.viewH),
        playH: Math.round(bottom.top - top.bottom),
        roadW: Math.round((360 * sc.viewScale) / d),
        minSkill: Math.min(...sk.map((b) => Math.min(b.width, b.height))),
        scrollW: document.documentElement.scrollWidth,
      };
    });
    await shot(page, `11-viewport-${w}x${h}`);
    pass(`版面 ${w}×${h}`, lay.minSkill >= 44 && lay.scrollW <= w && lay.playH > 280 && lay.viewH >= 400 && lay.roadW <= w, JSON.stringify(lay));
    await page.context().close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync('test-results/e2e.json', JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
process.exit(failed.length ? 1 : 0);
