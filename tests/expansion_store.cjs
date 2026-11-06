// 擴充資料層單元測試（不需瀏覽器）：遷移、損毀回退、備份、不寫入經典 Key、台灣日期、每日種子。
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function boot(init,now){const store=new Map(Object.entries(init||{})),writes=[];
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{writes.push(k);store.set(k,String(v));},removeItem:k=>{writes.push('-'+k);store.delete(k);},get length(){return store.size;},key:i=>[...store.keys()][i]};
 const window={localStorage};const ctx=vm.createContext({window,localStorage,setTimeout,clearTimeout,console,Date:now?class extends Date{constructor(...a){a.length?super(...a):super(now);}static now(){return now;}}:Date});
 vm.runInContext(read('game/fack_store.js'),ctx);return {S:window.FackExpStore,store,writes};}
const OLD={'fack-chase-live-record-version':'live-v2-hell-tuned-r1','fack-chase-live-v2-best':'{"hell":{"plays":9,"used":57}}','fack-chase-live-v2-trophies':'{"plays":24,"wins":12,"unlocked":["hello","hell"],"title":"hell"}','fack-live-v2-level':'hell','fack-mute':'1'};

// 1) 老玩家：經典 Key 不被寫入或刪除，只新增擴充自己的 Key
let t=boot(OLD);t.S.data.adventure.unlocked=2;t.S.save();
for(const k of Object.keys(OLD))assert.equal(t.store.get(k),OLD[k]);
assert.ok(t.writes.every(k=>k.startsWith('fack.expansion.v1')),'unexpected writes '+t.writes);
assert.equal(JSON.parse(t.store.get('fack.expansion.v1.classic-first')).keys['fack-chase-live-v2-best'],OLD['fack-chase-live-v2-best']);
// 2) 重新載入後進度保留
let t2=boot(Object.fromEntries(t.store));assert.equal(t2.S.status,'loaded');assert.equal(t2.S.data.adventure.unlocked,2);
// classic-first 不會被之後的載入覆寫
const first=t.store.get('fack.expansion.v1.classic-first');t2.store.set('fack-chase-live-v2-best','{}');let t3=boot(Object.fromEntries(t2.store));assert.equal(t3.store.get('fack.expansion.v1.classic-first'),first);
// 3) 損毀資料：備份原字串、狀態 recovered、不清除經典
let c=boot(Object.assign({},OLD,{'fack.expansion.v1':'{oops'}));assert.equal(c.S.status,'recovered');
const bk=[...c.store.keys()].filter(k=>k.startsWith('fack.expansion.v1.corrupt.'));assert.equal(bk.length,1);assert.equal(c.store.get(bk[0]),'{oops');
assert.equal(c.store.get('fack.expansion.v1'),'{oops','corrupt data must not be overwritten before the next save');
for(const k of Object.keys(OLD))assert.equal(c.store.get(k),OLD[k]);
// 相同損毀內容重複載入不會無限增加備份
let c2=boot(Object.fromEntries(c.store));assert.equal([...c2.store.keys()].filter(k=>k.startsWith('fack.expansion.v1.corrupt.')).length,1);
// 非物件（陣列、數字）也視為損毀
assert.equal(boot({'fack.expansion.v1':'[1,2]'}).S.status,'recovered');assert.equal(boot({'fack.expansion.v1':'7'}).S.status,'recovered');
// 4) 經典成就字串損毀 → 先備份
let cc=boot(Object.assign({},OLD,{'fack-chase-live-v2-trophies':'{"plays":'}));
assert.ok([...cc.store.keys()].some(k=>k.startsWith('fack.expansion.v1.classic-corrupt-fack-chase-live-v2-trophies')));
assert.equal(cc.store.get('fack-chase-live-v2-trophies'),'{"plays":');
// 5) 遷移：schema 0 → 1；型別錯誤欄位回到預設；未來 schema 與未知欄位保留
let m=boot({'fack.expansion.v1':JSON.stringify({adventure:{unlocked:3,stages:{night:{clears:4}}},stats:'bad'})});
assert.equal(m.S.data.schema,1);assert.equal(m.S.data.adventure.unlocked,3);assert.equal(m.S.data.adventure.stages.night.clears,4);assert.equal(typeof m.S.data.stats,'object');assert.equal(JSON.stringify(m.S.data.adventure.diffClears),'{"easy":0,"normal":0,"hard":0,"hell":0}');
let f=boot({'fack.expansion.v1':JSON.stringify({schema:5,x:{y:1},ach:{a:1}})});f.S.save();const fv=JSON.parse(f.store.get('fack.expansion.v1'));assert.equal(fv.schema,5);assert.equal(fv.x.y,1);assert.equal(fv.ach.a,1);
// 6) 沒有 localStorage（例如隱私模式被封鎖）也不會丟錯
{const ctx=vm.createContext({window:{get localStorage(){throw new Error('blocked');}},setTimeout,clearTimeout,console,Date});vm.runInContext(read('game/fack_store.js'),ctx);assert.equal(ctx.window.FackExpStore.save(),false);}
// 7) 台灣日期（UTC+8）與跨日
assert.equal(t.S.twDate(Date.parse('2026-11-06T15:59:59Z')),'2026-11-06');
assert.equal(t.S.twDate(Date.parse('2026-11-06T16:00:00Z')),'2026-11-07');
assert.equal(t.S.twDate(Date.parse('2026-12-31T16:00:00Z')),'2027-01-01');
// 8) 種子亂數可重現
const r1=t.S.rng(t.S.hash('fack-daily|2026-11-06')),r2=t.S.rng(t.S.hash('fack-daily|2026-11-06'));for(let i=0;i<5;i++)assert.equal(r1(),r2());
assert.notEqual(t.S.hash('fack-daily|2026-11-06'),t.S.hash('fack-daily|2026-11-07'));
// 9) 每日紀錄只清理擴充自己的舊資料
let p=boot();p.S.data.daily={'2026-01-01':{clears:1},'2026-11-05':{clears:1}};p.S.pruneDaily('2026-11-06');assert.equal(Object.keys(p.S.data.daily).join(),'2026-11-05');
// 10) 正式版頁面的版本字串沒有被改動（改動會觸發正式版清除紀錄）
assert.match(read('fack.html'),/RECORD_VERSION='live-v2-hell-tuned-r1'/);
assert.match(read('fack_v3.html'),/RECORD_VERSION='live-v2-hell-tuned-r1'/);
assert.doesNotMatch(read('fack_v3.html'),/localStorage\.removeItem/,'test page must never delete records');
for(const f of ['game/fack_store.js','game/fack_adv_core.js','game/fack_adv_stages.js','game/fack_adv_ui.js'])assert.doesNotMatch(read(f),/removeItem\((?!old\.key)/,f+' removes keys');
console.log('PASS: expansion store — classic keys untouched, backups, corrupt fallback, migration, future schema, storage blocked, Taiwan date rollover, seeded daily RNG, version string guard.');
