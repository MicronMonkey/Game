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

/** Autoplayer: every tick select every idle/lost gatherer and send them to the zone. */
async function autoplay(page, on = true) {
  await page.evaluate((on) => {
    const A = window.__dc.App;
    clearInterval(A._auto);
    if (!on) return;
    A._auto = setInterval(() => {
      const sc = A.hooks.scene;
      if (!sc?.field || sc.paused || sc.ended) return;
      const f = sc.field;
      f.chars.filter((ch) => ch.active && (ch.state === 'idle' || ch.state === 'lost' || ch.willGetLost)).forEach((ch) => ch.setSelected(true));
      if (f.selected().length) sc.orderSelected(f);
      if (sc.evsys?.signal) [1, 2, 3].forEach((n) => sc.evsys.tapSignal(n));
    }, 250);
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

  // ---------- 4. core: real taps ----------
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
  await page.waitForTimeout(2500);
  await shot(page, '03-gathering');
  pass('只顯示單一城市戰場', await page.evaluate(() => { const sc = window.__dc.App.hooks.scene; return Object.keys(sc.fields).length === 1 && sc.city === 'taoyuan'; }));
  const ally1 = await page.evaluate(() => window.__dc.App.run.allyProgress);
  await page.waitForTimeout(800);
  const ally2 = await page.evaluate(() => window.__dc.App.run.allyProgress);
  pass('夥伴廠（台中）自動推進', ally2 > ally1, `${ally1.toFixed(2)} → ${ally2.toFixed(2)}`);
  pass('沒有框選按鈕', (await page.locator('.box-toggle').count()) === 0 && (await page.getByText('框選', { exact: true }).count()) === 0);
  // drag across the field must NOT select anyone
  const fr = await page.evaluate(() => { const f = window.__dc.App.hooks.scene.field; const d = window.__dc.App.dpr; return { x: f.rect.x / d, y: f.rect.y / d, w: f.rect.w / d, h: f.rect.h / d }; });
  await page.mouse.move(fr.x + 4, fr.y + 4);
  await page.mouse.down();
  await page.mouse.move(fr.x + fr.w - 4, fr.y + fr.h - 4, { steps: 6 });
  await page.mouse.up();
  pass('拖曳不會框選多人', (await page.evaluate(() => window.__dc.App.hooks.scene.field.selected().length)) === 0);
  // tap one character, then the zone
  const target = await page.evaluate(() => {
    const f = window.__dc.App.hooks.scene.field;
    const ch = f.chars.find((c) => c.active && c.state === 'idle' && c.type !== 'lost') || f.chars.find((c) => c.active && c.type !== 'lost');
    return { id: ch.id, x: ch.x, y: ch.y - 16 };
  });
  let sp = await fieldToScreen(page, target.x, target.y);
  await page.mouse.click(sp.x, sp.y);
  const selected = await page.evaluate((id) => window.__dc.App.hooks.scene.field.chars.find((c) => c.id === id)?.selected, target.id);
  pass('點擊角色可選取', selected);
  const zc = await page.evaluate(() => window.__dc.App.hooks.scene.field.map.zone);
  const zone = await fieldToScreen(page, zc.x, zc.y);
  await page.mouse.click(zone.x, zone.y);
  const moving = await page.evaluate((id) => window.__dc.App.hooks.scene.field.chars.find((c) => c.id === id)?.state, target.id);
  pass('點集合區下達指令', moving === 'moving' || moving === 'arrived', moving);
  await page.waitForTimeout(200);
  const route = await page.evaluate(() => window.__dc.App.hooks.scene.field.routeG.commandBuffer.length);
  await shot(page, '03b-route');
  pass('前往中的角色顯示 >>> 路線箭頭', route > 20, `draw commands=${route}`);
  await page.waitForFunction((id) => window.__dc.App.run.scoredIds.has(id), target.id, { timeout: 20000 }).catch(() => {});
  const arrivedInfo = await page.evaluate((id) => ({ has: window.__dc.App.run.scoredIds.has(id), tao: window.__dc.App.run.cities.taoyuan.arrived, score: window.__dc.App.run.score }), target.id);
  pass('沿道路尋路抵達並計分', arrivedInfo.has && arrivedInfo.tao >= 1 && arrivedInfo.score >= 100, JSON.stringify(arrivedInfo));
  const dbl = await page.evaluate((id) => {
    const sc = window.__dc.App.hooks.scene;
    const before = window.__dc.App.run.score;
    const ch = sc.field.chars.find((c) => c.id === id) || { id, type: 'lunch', field: sc.field, markArrived() {}, x: 0, y: 0 };
    sc.onArrive(ch);
    sc.onArrive(ch);
    return window.__dc.App.run.score - before;
  }, target.id);
  pass('同一角色重複抵達不重複計分', dbl === 0, `delta=${dbl}`);

  // virtual clock mapping
  const clk = await page.evaluate(async () => {
    const sc = window.__dc.App.hooks.scene;
    return { text: sc.clockText(), elapsed: sc.elapsed, act: sc.actSeconds };
  });
  const expectedMin = Math.floor((clk.elapsed / clk.act) * 30);
  pass('虛擬時鐘 12:00→12:30 映射', clk.text === `12:${String(expectedMin).padStart(2, '0')}` || clk.text === `12:${String(expectedMin + 1).padStart(2, '0')}`, `${clk.text} @${clk.elapsed.toFixed(1)}s/${clk.act}s`);

  // skills: insufficient sun / cooldown
  const sk = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const run = window.__dc.App.run;
    run.sun = 10;
    const r1 = sc.skills.cast('lunch_sprint');
    run.sun = 100;
    const r2 = sc.skills.cast('lunch_sprint');
    const r3 = sc.skills.cast('lunch_sprint');
    return { r1, r2, r3, sun: run.sun };
  });
  pass('陽光不足不能施放並顯示原因', !sk.r1.ok && /陽光不足/.test(sk.r1.reason));
  pass('冷卻中不能施放', sk.r2.ok && !sk.r3.ok && /冷卻/.test(sk.r3.reason) && sk.sun === 75);

  // pause freezes countdown, buffs and cooldowns
  await page.click('.hud-top .btn-icon');
  const p1 = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    return { rem: sc.remaining, cd: sc.skills.cooldowns.lunch_sprint, act: sc.skills.active.lunch_sprint };
  });
  await page.waitForTimeout(1200);
  const p2 = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    return { rem: sc.remaining, cd: sc.skills.cooldowns.lunch_sprint, act: sc.skills.active.lunch_sprint };
  });
  await shot(page, '04-pause');
  pass('暫停時倒數/CD/Buff 停止', p1.rem === p2.rem && p1.cd === p2.cd && p1.act === p2.act);
  await page.click('text=繼續遊戲');
  // auto-pause on tab hide
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  pass('分頁失焦自動暫停', await page.evaluate(() => window.__dc.App.hooks.scene.paused));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
  await page.click('text=繼續遊戲');

  // buff visuals appear while active and disappear afterwards
  const buff = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    window.__dc.App.run.sun = 100;
    sc.skills.cooldowns.lunch_sprint = 0;
    sc.castSkill('lunch_sprint');
    return true;
  });
  await page.waitForTimeout(300);
  const buffOn = await page.evaluate(() => ({ chip: !!document.querySelector('.chip.buff'), halo: window.__dc.App.hooks.scene.field.chars.some((c) => c.active && c.halo.visible), border: window.__dc.App.hooks.scene.field.borderG.commandBuffer.length > 0, card: !!document.querySelector('.skill-card.active') }));
  await shot(page, '03c-buff');
  pass('技能 Buff 特效（光環/邊框/標籤/技能卡）', buff && buffOn.chip && buffOn.halo && buffOn.border && buffOn.card, JSON.stringify(buffOn));
  await page.evaluate(() => { window.__dc.App.hooks.scene.skills.active.lunch_sprint = 0.05; });
  await page.waitForTimeout(400);
  const buffOff = await page.evaluate(() => ({ chip: !!document.querySelector('.chip.buff'), border: window.__dc.App.hooks.scene.field.borderG.commandBuffer.length > 0, gold: window.__dc.App.hooks.scene.field.chars.some((c) => c.active && c.halo.visible && c.halo.tintTopLeft === 0xffd447) }));
  pass('Buff 結束後特效消失', !buffOff.chip && !buffOff.border && !buffOff.gold, JSON.stringify(buffOff));
  // interference highlight
  const deb = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    sc.evsys.start('meeting', sc.city);
    return sc.field.meetings[0]?.group.map((c) => c.id) || [];
  });
  await page.waitForTimeout(200);
  const debInfo = await page.evaluate((ids) => {
    const f = window.__dc.App.hooks.scene.field;
    const g = f.chars.filter((c) => ids.includes(c.id));
    return { n: g.length, red: g.every((c) => c.halo.visible && c.halo.tintTopLeft === 0xff2a2a), icon: g.every((c) => c.status === '📢'), chip: !!document.querySelector('.chip.debuff') };
  }, deb);
  await shot(page, '03d-debuff');
  pass('干擾角色顯示紅色半透明強調＋圖示＋紅色標籤', debInfo.n > 0 && debInfo.red && debInfo.icon && debInfo.chip, JSON.stringify(debInfo));

  // events lifecycle
  const ev = await page.evaluate(() => {
    const sc = window.__dc.App.hooks.scene;
    const out = {};
    const C = sc.city;
    sc.field.meetings.slice().forEach((m) => sc.evsys.clearMeeting(C, m, true));
    sc.evsys.start('queue', C);
    out.queue = sc.field.queues.size;
    const [k] = sc.field.queues.keys();
    sc.evsys.tapQueue(C, k);
    sc.evsys.tapQueue(C, k);
    out.queueCleared = sc.field.queues.size === 0;
    sc.evsys.start('cloud', C);
    out.cloud = !!sc.field.cloud;
    window.__dc.App.run.sun = 100;
    sc.skills.cooldowns.sunlight = 0;
    sc.castSkill('sunlight');
    out.cloudCleared = !sc.field.cloud;
    sc.evsys.start('signal', C);
    out.blocked = sc.skills.reason('city_resonance');
    sc.evsys.tapSignal(1); sc.evsys.tapSignal(2); sc.evsys.tapSignal(3);
    out.unblocked = sc.skills.blocked.city_resonance === undefined;
    sc.evsys.start('meeting', C);
    const m = sc.field.meetings[0];
    out.meeting = !!m;
    if (m) { sc.evsys.tapMeeting(C, m); sc.evsys.tapMeeting(C, m); sc.evsys.tapMeeting(C, m); }
    out.meetingCleared = sc.field.meetings.length === 0;
    return out;
  });
  pass('事件生成與解除（排隊/烏雲/斷訊/開會）', ev.queue === 1 && ev.queueCleared && ev.cloud && ev.cloudCleared && /訊號/.test(ev.blocked) && ev.unblocked && ev.meeting && ev.meetingCleared, JSON.stringify(ev));

  // ---------- 5. full run → boss WIN ----------
  await autoplay(page, true);
  await page.evaluate(() => (window.__dc.App.timeScale = 6));
  await waitScene(page, 'Sync', 60000).catch(() => {});
  await page.waitForSelector('.interstitial', { state: 'detached', timeout: 10000 }).catch(() => {});
  pass('第一幕 → 第二幕', (await sceneKey(page)) === 'Sync');
  await page.waitForTimeout(800);
  await shot(page, '05-sync');
  const keptCounts = await page.evaluate(() => window.__dc.App.run.cities.taoyuan.arrived);
  pass('第一幕已集結數保留到第二幕', keptCounts > 0, `taoyuan=${keptCounts}`);
  pass('第二幕仍為單一城市', await page.evaluate(() => window.__dc.App.hooks.scene.field.id === 'taoyuan'));
  await waitScene(page, 'Boss', 60000);
  await autoplay(page, false);
  const syncSummary = await page.evaluate(() => ({ tao: window.__dc.App.run.cities.taoyuan.arrived, tai: window.__dc.App.run.cities.taichung.arrived, initDmg: window.__dc.App.run.bossInitialDamage, score: window.__dc.App.run.score }));
  pass('進入 Boss（依雙城達標給初始傷害）', true, JSON.stringify(syncSummary));
  await page.evaluate(() => (window.__dc.App.timeScale = 1));
  await page.waitForTimeout(1800);
  // real pointer aim on the weakpoint for a moment
  // super: burn veils → meter → button
  await page.evaluate(() => { window.__dc.App.hooks.scene.boss.superMeter = 1; });
  await page.waitForTimeout(100);
  pass('雙城合擊充滿後按鈕可用', await page.locator('.super-btn.ready').count() === 1);
  await page.click('.super-btn');
  pass('按下雙城合擊啟動大招', await page.evaluate(() => window.__dc.App.hooks.scene.boss.superTime > 0));
  const vb = await page.evaluate(() => { const b = window.__dc.App.hooks.scene.boss; b.superTime = 0; b.veilTimer = 0; return true; });
  await page.waitForFunction(() => window.__dc.App.hooks.scene.boss.veils.length > 0, null, { timeout: 5000 });
  pass('黑箱會丟下黑幕', vb);
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
  const winRun = await page.evaluate(() => ({ result: window.__dc.App.run.bossResult, score: window.__dc.App.run.score, bonuses: window.__dc.App.run.bonuses }));
  pass('Boss HP 0 → 成功', winRun.result === 'win', `score=${winRun.score}`);
  await page.evaluate(() => (window.__dc.App.timeScale = 1));
  await page.waitForSelector('.end-card.win');
  await shot(page, '07-win');
  pass('成功過場文案', await page.locator('text=陽光照進黑箱！').count() > 0);
  await page.click('text=略過');
  await page.waitForSelector('.gallery .album-taichung');
  await shot(page, '08-gallery-after-win');
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
  const fresh = await page.evaluate(() => ({ score: window.__dc.App.run.score, tao: window.__dc.App.run.cities.taoyuan.arrived, recorded: !!window.__dc.App.run.recorded }));
  pass('重新遊玩無殘留舊局分數', fresh.score === 0 && fresh.tao === 0 && !fresh.recorded);
  // zero targets reached: no orders, fast-forward both acts
  await page.evaluate(() => (window.__dc.App.timeScale = 10));
  await waitScene(page, 'Boss', 90000);
  const zero = await page.evaluate(() => ({ tao: window.__dc.App.run.cities.taoyuan.arrived, init: window.__dc.App.run.bossInitialDamage }));
  pass('自己廠未達標也可進 Boss（夥伴廠達標 → 初始傷害 75）', zero.tao === 0 && zero.init === 75, JSON.stringify(zero));
  await bossAim(page, 'lose');
  await waitScene(page, 'Ending', 90000);
  const loseRun = await page.evaluate(() => ({ result: window.__dc.App.run.bossResult, hp: window.__dc.App.run.bossStats.hp }));
  pass('時間 0 且 HP>0 → 失敗', loseRun.result === 'lose' && loseRun.hp > 0, JSON.stringify(loseRun));
  await page.evaluate(() => (window.__dc.App.timeScale = 1));
  await page.waitForSelector('.end-card.lose');
  await shot(page, '09-lose');
  pass('失敗過場文案', await page.locator('text=黑箱尚未融化，陽光不會停止。').count() > 0);
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
      const f = sc.field;
      const top = document.querySelector('.status-chips').getBoundingClientRect();
      const bottom = document.querySelector('.hud-bottom').getBoundingClientRect();
      const fy = f.container.y / d;
      const fh = (f.map.h * f.scale) / d;
      const sk = [...document.querySelectorAll('.skill-card')].map((b) => b.getBoundingClientRect());
      return {
        mode: sc.layoutMode,
        fieldH: Math.round(fh),
        overlap: fy < top.bottom - 1 || fy + fh > bottom.top + 1,
        minSkill: Math.min(...sk.map((b) => Math.min(b.width, b.height))),
        scrollW: document.documentElement.scrollWidth,
        scale: +(f.scale / d).toFixed(2),
      };
    });
    await shot(page, `11-viewport-${w}x${h}`);
    pass(`版面 ${w}×${h}`, !lay.overlap && lay.minSkill >= 44 && lay.scrollW <= w && lay.fieldH > 200, JSON.stringify(lay));
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
