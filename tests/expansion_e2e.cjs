/* 擴充測試版（fack.html）瀏覽器實測：紀錄相容性、經典模式、冒險四關、Buff、Boss、每日挑戰、手機操作。
   執行：node tests/expansion_e2e.cjs  （需要 playwright 與 python3；會自動啟動本機伺服器）
   結果寫入 tests/expansion-results.json */
const {chromium,devices}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.join(__dirname,'..'),PORT=8790+Math.floor(Math.random()*50),BASE='http://localhost:'+PORT+'/';
const BOT=fs.readFileSync(path.join(__dirname,'adv_bot.js'),'utf8');
const results=[];let failed=0;
function rec(name,ok,detail){results.push({name,ok,detail});if(!ok)failed++;console.log((ok?'PASS':'FAIL')+'  '+name+(detail?'  — '+(typeof detail==='string'?detail:JSON.stringify(detail)):''));}
async function check(name,fn){try{const d=await fn();rec(name,true,d);}catch(e){rec(name,false,e.message.split('\n')[0]);}}
function assert(c,m){if(!c)throw new Error(m);}

// 一位「老玩家」在正式版留下的真實格式紀錄
const OLD={
 'fack-chase-live-record-version':'live-v2-hell-tuned-r1',
 'fack-chase-live-v2-best':JSON.stringify({easy:{plays:5,used:21},normal:{plays:7,used:33},hard:{plays:3,used:48},hell:{plays:9,used:57}}),
 'fack-live-v2-level':'hell',
 'fack-chase-live-v2-trophies':JSON.stringify({plays:24,wins:12,papers:61230,paperPickups:420,powerTotal:51,powerTypes:{speed:14,freeze:12,magnet:15,shield:10},winsBy:{easy:3,normal:4,hard:2,hell:3},fast30:4,fast15:0,freezeWins:2,noPowerWins:0,flawlessWins:1,shieldBlocks:6,maxCombo:7,bestPapers:22,lateWins:1,unlocked:['hello','catch','three','ten','w3','w10','paper500','paper2000','paper5000','paper10','combo5','speed','freeze','magnet','shield','fourBuffs','freezeWin','thirty','hell','allLevels','noCandy','lastSecond'],title:'hell',manualTitle:true}),
 'fack-mute':'1'
};
const CLASSIC_KEYS=Object.keys(OLD);

// 舊正式版（V2，含會刪除紀錄的舊遷移程式）：測試時從 git 取出到暫存檔，用來驗證「新版 → 快取中的舊版」不會清除紀錄，以及經典模式行為一致。
const LEGACY='_legacy_fack_test.html',LEGACY_PATH=path.join(ROOT,LEGACY);
fs.writeFileSync(LEGACY_PATH,require('node:child_process').execSync('git show f0c083c:fack.html',{cwd:ROOT}));
(async()=>{
 const srv=spawn('python3',['-m','http.server',String(PORT)],{cwd:ROOT,stdio:'ignore'});
 await new Promise(r=>setTimeout(r,900));
 const browser=await chromium.launch();
 const errors=[];
 async function page(opts){const ctx=await browser.newContext(opts||{viewport:{width:420,height:860}});const p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});return {ctx,p};}
 const dump=p=>p.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}return o;});
 const seed=(p,data)=>p.evaluate(d=>{localStorage.clear();Object.entries(d).forEach(([k,v])=>localStorage.setItem(k,v));},data);
 try{
 // ── 1. 舊玩家升級 ──
 await check('舊玩家升級：開啟新正式版後經典紀錄逐字不變',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,OLD);await p.reload();await p.waitForTimeout(300);
  const after=await dump(p);CLASSIC_KEYS.forEach(k=>assert(after[k]===OLD[k],'changed '+k));
  const hall=await p.textContent('#hall'),best=await p.textContent('#best');
  assert(hall.includes('22/24')&&hall.includes('61,230'),'hall '+hall);assert(best.includes('21 秒')&&best.includes('57 秒'),'best '+best);
  assert(await p.evaluate(()=>!!localStorage.getItem('fack.expansion.v1.classic-first')),'no classic backup');
  await ctx.close();return hall.trim();});
 await check('舊玩家：裝置上若還有快取的舊版頁面，開啟後也不會清除紀錄、不跳重置通知',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,OLD);await p.reload();
  await p.click('#adv');await p.click('[data-a=start]');await p.click('[data-a=go]');await p.waitForTimeout(400);
  await p.goto(BASE+LEGACY);await p.waitForTimeout(300);const after=await dump(p);CLASSIC_KEYS.forEach(k=>assert(after[k]===OLD[k],'official changed '+k));
  assert(!(await p.isVisible('#versionNotice.open')),'notice shown');assert(after['fack.expansion.v1'],'expansion data lost');
  const hall=await p.textContent('#hall');await ctx.close();return '正式版顯示：'+hall.trim();});
 await check('冒險／每日資料只寫入 fack.expansion.v1*，不新增或修改經典 Key',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');await seed(p,OLD);await p.reload();
  await p.addScriptTag({content:BOT});
  await p.click('#adv');await p.click('[data-a=start]');await p.click('[data-a=go]');await p.waitForTimeout(200);await p.evaluate(()=>window.fackAdvGame.debug.win());await p.evaluate(()=>window.fackAdvGame.debug.step(120,1/30));
  await p.waitForSelector('[data-a=buff]');await p.click('[data-a=buff]');await p.click('[data-b]');await p.waitForTimeout(900);
  const after=await dump(p),extra=Object.keys(after).filter(k=>!CLASSIC_KEYS.includes(k));CLASSIC_KEYS.forEach(k=>assert(after[k]===OLD[k],'changed '+k));
  assert(extra.every(k=>k.startsWith('fack.expansion.v1')),'unexpected keys '+extra);await ctx.close();return extra.join(', ');});
 await check('無紀錄的新玩家首次進入：正常顯示、不跳通知；之後若碰到快取的舊版頁面也不會清掉新紀錄',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await p.evaluate(()=>localStorage.clear());await p.reload();
  const s=await dump(p);assert(s['fack-chase-live-record-version']==='live-v2-hell-tuned-r1','version guard missing');
  assert((await p.textContent('#hall')).includes('見習追緝員'),'title');
  // 模擬新玩家在測試版打下一筆經典紀錄，再開正式版
  await p.evaluate(()=>localStorage.setItem('fack-chase-live-v2-best',JSON.stringify({normal:{plays:1,used:40}})));
  await p.goto(BASE+LEGACY);await p.waitForTimeout(200);const s2=await dump(p);assert(s2['fack-chase-live-v2-best']&&s2['fack-chase-live-v2-best'].includes('40'),'official wiped new record');
  await ctx.close();return Object.keys(s).join(', ');});
 await check('更早期的舊版紀錄（無版本標記）在新版中原樣保留，不被刪除',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');
  await seed(p,{'fack-chase-best2':'{"normal":{"used":30}}','fack-chase-trophies-v1':'{"plays":3,"unlocked":["hello"]}'});await p.reload();const s=await dump(p);
  assert(s['fack-chase-best2']==='{"normal":{"used":30}}'&&s['fack-chase-trophies-v1'],'legacy removed');await ctx.close();return '保留 fack-chase-best2、fack-chase-trophies-v1';});
 await check('損毀的擴充紀錄：保留原始字串備份並安全回退，不清空經典資料',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,Object.assign({},OLD,{'fack.expansion.v1':'{broken json'}));await p.reload();
  const st=await p.evaluate(()=>FackExpStore.status);const s=await dump(p);const bk=Object.keys(s).filter(k=>k.startsWith('fack.expansion.v1.corrupt.'));
  assert(st==='recovered','status '+st);assert(bk.length===1&&s[bk[0]]==='{broken json','backup missing');CLASSIC_KEYS.forEach(k=>assert(s[k]===OLD[k],'changed '+k));
  await p.click('#adv');assert(await p.isVisible('.ax-card'),'hub not shown');await ctx.close();return bk[0];});
 await check('損毀的經典成就字串：在經典模組覆寫前先備份原始內容',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,Object.assign({},OLD,{'fack-chase-live-v2-trophies':'{"plays":3,'}));await p.reload();
  const s=await dump(p);const bk=Object.keys(s).filter(k=>k.includes('classic-corrupt-fack-chase-live-v2-trophies'));assert(bk.length===1&&s[bk[0]]==='{"plays":3,','no backup');await ctx.close();return bk[0];});
 await check('未來版本的擴充資料（schema 2、未知欄位）讀取後保留，不降版、不刪欄位',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');
  await seed(p,{'fack.expansion.v1':JSON.stringify({schema:2,futureField:{a:1},adventure:{unlocked:3,stages:{night:{clears:2,bestStars:3,bestScore:999}}},ach:{nightShift:1700000000000}})});await p.reload();
  await p.click('#adv');await p.click('[data-d=hard]');const v=JSON.parse((await dump(p))['fack.expansion.v1']);
  assert(v.schema===2&&v.futureField&&v.futureField.a===1&&v.adventure.unlocked===3&&v.adventure.stages.night.clears===2&&v.ach.nightShift,'lost '+JSON.stringify(v).slice(0,200));await ctx.close();return 'schema '+v.schema;});
 await check('早期無 schema 的擴充資料會遷移到 schema 1，成績保留',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');
  await seed(p,{'fack.expansion.v1':JSON.stringify({adventure:{unlocked:2,stages:{night:{clears:1,bestStars:2}}}})});await p.reload();const d=await p.evaluate(()=>FackExpStore.data);
  assert(d.schema===1&&d.adventure.unlocked===2&&d.adventure.stages.night.clears===1&&d.stats&&d.daily,'migrate');await ctx.close();return 'ok';});

 await check('舊的測試版連結 fack_v3.html 會自動轉到正式版 fack.html，頁面沒有測試版字樣',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack_v3.html?fackdebug=1');await p.waitForURL(/\/fack\.html\?fackdebug=1$/);
  const t=await p.textContent('body');assert(!/測試版|正式版/.test(t),'leftover text');assert(await p.isVisible('#adv'),'menu');await ctx.close();return p.url().replace(BASE,'');});
 // ── 2. 經典模式 ──
 await check('經典模式四種難度：可開始、計時、退出；與舊版 V2 做相同操作後，紀錄結果完全一致',async()=>{
  async function flow(url){const {ctx,p}=await page();await p.goto(BASE+url);await seed(p,OLD);await p.reload();const out=[];
   for(const id of ['easy','normal','hard','hell']){await p.click('#go');await p.click('.cz-start[data-lv='+id+']');await p.waitForTimeout(600);const s=await p.evaluate(()=>window.fackChaseState());assert(s&&s.time>0,'no state '+id);
    out.push(id+':'+Math.round(s.time)+'s');await p.click('.cz-quit');await p.waitForSelector('.cz-card');await p.reload();await p.waitForSelector('#hero',{state:'visible'});}
   const lv=await p.evaluate(()=>JSON.stringify(FackChase.LEVELS));const d=await dump(p);await ctx.close();return {out,lv,d};}
  const v3=await flow('fack.html'),off=await flow(LEGACY);
  assert(v3.lv===off.lv,'LEVELS differ from official');
  CLASSIC_KEYS.forEach(k=>assert(v3.d[k]===off.d[k],'differs from official after same actions: '+k+' '+v3.d[k]+' vs '+off.d[k]));
  return v3.out.join(' ')+'；難度數值、離開後的紀錄（含 plays 計數）與正式版完全相同';});
 await check('經典模式勝利結算：走原本的 FackTrophies.record 與最佳紀錄（格式不變）',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,OLD);await p.reload();
  const before=JSON.parse(OLD['fack-chase-live-v2-trophies']);
  const r=await p.evaluate(()=>{FackTrophies.record({win:true,used:25,remaining:35,level:FackChase.LEVELS.normal,papers:2700,paperPickups:12,powerTotal:2,powerStats:{speed:1,freeze:1,magnet:0,shield:0},maxCombo:3,candyHits:0,shieldBlocks:0});return JSON.parse(localStorage.getItem('fack-chase-live-v2-trophies'));});
  assert(r.plays===before.plays+1&&r.wins===before.wins+1&&r.unlocked.length>=before.unlocked.length&&r.title==='hell','record');await ctx.close();return 'plays '+before.plays+'→'+r.plays;});

 await check('經典模式：難度選單與結算畫面都有「回主選單」，按了回到主選單且紀錄不變',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,OLD);await p.reload();
  await p.click('#go');await p.waitForSelector('.cz-card .x-home');await p.click('.cz-card .x-home');await p.waitForSelector('#hero',{state:'visible'});
  await p.click('#go');await p.click('.cz-start[data-lv=easy]');await p.waitForTimeout(400);await p.click('.cz-quit');await p.waitForSelector('.cz-card .x-home');
  const n=await p.$$eval('.cz-card .x-home',b=>b.length);await p.click('.cz-card .x-home');await p.waitForSelector('#hero',{state:'visible'});
  await p.click('#go');await p.waitForSelector('.cz-card .x-home');const again=await p.$$eval('.cz-card .x-home',b=>b.length);
  const d=await dump(p);assert(d['fack-chase-live-v2-trophies']===OLD['fack-chase-live-v2-trophies'],'trophies changed');assert(n===1&&again===1,'home buttons '+n+'/'+again);
  await ctx.close();return '選單與結算都只出現 1 個回主選單按鈕';});
 await check('裝備：依經典紀錄（唯讀）解鎖、一次只能裝備一件、效果只作用在冒險模式',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');
  const t=JSON.parse(OLD['fack-chase-live-v2-trophies']);t.papers=120000;t.wins=12;const data=Object.assign({},OLD,{'fack-chase-live-v2-trophies':JSON.stringify(t)});
  await seed(p,data);await p.reload();await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{const A=FackAdv,gd=A.gear.gearData();const un=Object.keys(gd.unlocked).sort();const e1=A.gear.equip('glove'),e2=A.gear.equip('watch'),eq1=A.gear.equipped().id;A.gear.equip('sneakers');const eq2=A.gear.equipped().id;A.gear.equip('glove');
   const l=A.layer(document.getElementById('stage'));const mk=(mode,stage)=>new A.Game(l,{stage,diff:A.DIFFS.normal,buffs:{magnet:1},gear:A.gear.equipped().id,seed:3,mode,onEnd(){}});
   const g1=mk('run',A.STAGES[0]);g1.eff.magnet=5;const m1=g1.magR();g1.stop();const g0=new A.Game(l,{stage:A.STAGES[0],diff:A.DIFFS.normal,buffs:{magnet:1},seed:3,mode:'run',onEnd(){}});g0.eff.magnet=5;const m0=g0.magR();g0.stop();
   const g2=mk('daily',A.dailyDef('2026-11-07'));g2.eff.magnet=5;const m2=g2.magR();g2.stop();l.remove();return {un,e1,e2,eq1,eq2,m0,m1,m2};});
  const d=await dump(p);CLASSIC_KEYS.forEach(k=>assert(d[k]===data[k],'classic changed '+k));
  assert(r.un.includes('cap')&&r.un.includes('sneakers')&&r.un.includes('glove')&&!r.un.includes('watch'),'unlock '+r.un);
  assert(r.e1&&!r.e2&&r.eq1==='glove'&&r.eq2==='sneakers','equip '+JSON.stringify(r));assert(Math.abs(r.m1-(20+(35+95)*1.5))<.01&&Math.abs(r.m0-150)<.01&&Math.abs(r.m2-115)<.01,'fx '+JSON.stringify(r));
  await p.click('#achievements');await p.click('.axg [data-t=gear]');const txt=await p.textContent('.axg');assert(txt.includes('強力磁鐵手套')&&txt.includes('3 / 23'),'gallery');
  await ctx.close();return '取得 '+r.un.join('、')+'；磁鐵範圍 冒險 '+r.m1+'／無裝備 '+r.m0+'／每日挑戰 '+r.m2;});
 await check('裝備組合條件：經典地獄 20 秒內 ＋ 冒險 Boss 30 秒內，兩者都達成才解鎖',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');
  const best=JSON.parse(OLD['fack-chase-live-v2-best']);best.hell.used=18;await seed(p,Object.assign({},OLD,{'fack-chase-live-v2-best':JSON.stringify(best)}));await p.reload();
  const r=await p.evaluate(()=>{const A=FackAdv,gd=A.gear.gearData();const a=!!gd.unlocked.hellshoes;
   FackAdventure.recordStage({win:true,stage:'boss',mode:'single',diff:'easy',used:20,remaining:150,limit:168,hearts:3,maxHearts:4,damage:0,papers:0,itemsUsed:{},hidden:false,flags:{},extra:{},stars:3,score:900});const b=!!gd.unlocked.hellshoes;
   FackAdventure.recordStage({win:true,stage:'boss',mode:'single',diff:'normal',used:29,remaining:130,limit:168,hearts:3,maxHearts:3,damage:0,papers:0,itemsUsed:{},hidden:false,flags:{},extra:{},stars:3,score:900});const c=!!gd.unlocked.hellshoes;return {a,b,c};});
  assert(!r.a&&!r.b&&r.c,JSON.stringify(r));await ctx.close();return '只有經典→未解鎖；簡單 Boss 20 秒→未解鎖（需中等以上）；中等 Boss 29 秒→解鎖';});
 // ── 3. 冒險模式（實際以自動玩家操作遊玩） ──
 const balance={};
 async function playStage(p,idx,diff,mode){await p.evaluate(([i,d,m])=>{const a=FackExpStore.data.adventure;a.unlocked=4;a.diff=d;if(m==='run'){a.run={id:1,seed:FackExpStore.hash('t'+Math.random()),diff:d,stage:i,buffs:{},pendingBuff:false,offer:null,results:[],startedAt:Date.now()};}FackExpStore.save();},[idx,diff,mode]);
  await p.click('#hero').catch(()=>{});
  const shell=await p.evaluate(()=>!!document.querySelector('.ax-layer'));if(shell)await p.evaluate(()=>document.querySelector('[data-a=back]')&&document.querySelector('[data-a=back]').click());
  await p.click('#adv');if(mode==='run')await p.click('[data-a=cont]');else await p.click('[data-s="'+idx+'"]');
  await p.click('[data-a=go]');if(idx===3){await p.waitForSelector('.ax-boss');await p.click('.ax-boss');}
  await p.waitForFunction(()=>window.fackAdvGame&&!window.fackAdvGame.over);
  const r=await p.evaluate(()=>window.__advBot(400));await p.waitForSelector('.ax-card');
  const res=await p.evaluate(()=>window.fackAdvState());return Object.assign({t:r.t},res.result||{});}
 {const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');await p.evaluate(()=>localStorage.clear());await p.reload();await p.addScriptTag({content:BOT});
  for(const [i,name] of [[0,'第一關 深夜追蹤'],[1,'第二關 連署書保衛戰'],[2,'第三關 十日倒數'],[3,'最終關 Boss 三階段']]){
   for(const diff of ['easy','normal','hard','hell']){const runs=[];
    for(let k=0;k<3;k++){const r=await playStage(p,i,diff,'single');runs.push(r);await p.click('[data-a=hub]');await p.click('[data-a=back]');}
    balance[name+'｜'+diff]=runs.map(r=>(r.win?'勝':'敗('+r.reason+')')+' '+r.used+'s ★'+r.stars+(r.extra&&r.extra.bundles!=null?' 📦'+r.extra.bundles:'')).join('；');
    const wins=runs.filter(r=>r.win).length;
    rec('自動玩家實玩 '+name+'（'+diff+'）',diff==='hell'?true:wins>0,wins+'/3 勝｜'+balance[name+'｜'+diff]);}
  }
  await ctx.close();}
 await check('連續冒險：通關→選 Buff→下一關；重新整理後進度、待選 Buff 與選項都保留',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');await p.evaluate(()=>localStorage.clear());await p.reload();await p.addScriptTag({content:BOT});
  await p.click('#adv');await p.click('[data-d=easy]');await p.click('[data-a=start]');await p.click('[data-a=go]');await p.waitForFunction(()=>window.fackAdvGame);
  await p.evaluate(()=>{window.fackAdvGame.debug.win();window.fackAdvGame.debug.step(90,1/30);});await p.waitForSelector('[data-a=buff]');
  let d=await p.evaluate(()=>FackExpStore.data.adventure);assert(d.run.stage===1&&d.run.pendingBuff,'run not advanced');
  await p.click('[data-a=buff]');const offer1=await p.$$eval('[data-b]',b=>b.map(x=>x.dataset.b));assert(offer1.length===3&&new Set(offer1).size===3,'offer');
  await p.reload();await p.addScriptTag({content:BOT});assert(await p.isVisible('#cont'),'continue hidden');await p.click('#cont');const offer2=await p.$$eval('[data-b]',b=>b.map(x=>x.dataset.b));
  assert(JSON.stringify(offer1)===JSON.stringify(offer2),'offer rerolled after reload');
  await p.click('[data-b="'+offer2[0]+'"]');await p.waitForSelector('[data-a=go]');d=await p.evaluate(()=>FackExpStore.data.adventure);assert(d.run.buffs[offer2[0]]===1&&!d.run.pendingBuff,'buff not saved');
  // 中途重新整理：已通關的第一關仍然保留
  await p.click('[data-a=go]');await p.waitForTimeout(500);await p.reload();d=await p.evaluate(()=>FackExpStore.data.adventure);
  assert(d.stages.night.clears===1&&d.run.stage===1&&d.unlocked>=2,'progress lost');await ctx.close();return '選到 '+offer2[0]+'；第一關紀錄保留，從第二關繼續';});
 await check('Buff：數值有上限（同種最多 2 層），效果只在冒險模式套用',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');
  const r=await p.evaluate(()=>{const A=FackAdv;const caps=Object.keys(A.BUFFS).map(k=>A.buffLv({[k]:99},k));const host=document.getElementById('stage');const l=A.layer(host);
   const g1=new A.Game(l,{stage:A.STAGES[0],diff:A.DIFFS.normal,buffs:{swift:9,shield:9,dash:9},seed:1,mode:'run',onEnd(){}});const s1=g1.speed(),sc=g1.shieldCharges,dl=g1.dashLv;g1.stop();
   const g2=new A.Game(l,{stage:A.dailyDef('2026-11-06'),diff:A.DIFFS.normal,buffs:{swift:2,shield:2},seed:1,mode:'daily',onEnd(){}});const s2=g2.speed(),sc2=g2.shieldCharges;g2.stop();l.remove();
   return {caps,s1,sc,dl,s2,sc2};});
  assert(r.caps.every(c=>c===2),'caps');assert(Math.abs(r.s1-168*1.2)<.01&&r.sc===2&&r.dl===2,'capped run '+JSON.stringify(r));assert(r.s2===168&&r.sc2===0,'daily used buffs');await ctx.close();return JSON.stringify(r);});
 await check('Buff 實際效果：緊急護盾抵擋一次傷害、衝刺冷卻、雙倍效率、連署磁鐵範圍',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');
  const r=await p.evaluate(()=>{const A=FackAdv,l=A.layer(document.getElementById('stage'));const g=new A.Game(l,{stage:A.STAGES[0],diff:A.DIFFS.normal,buffs:{shield:1,dash:1,double:1,magnet:2},seed:5,mode:'run',onEnd(){}});
   const h0=g.hearts;g.hurt('x');const h1=g.hearts;g.inv=0;g.hurt('x');const h2=g.hearts;g.dash();const cd=g.dashCD;const mul=g.paperMul();g.t=30;const mul2=g.paperMul();
   g.papers=[{x:g.P.x+80,y:g.P.y,r:12,v:50}];g.inv=0;for(let i=0;i<20;i++)g.step(1/30);const got=g.paperScore;g.stop();l.remove();return {h0,h1,h2,cd,mul,mul2,got};});
  assert(r.h1===r.h0&&r.h2===r.h0-1&&r.cd===9&&r.mul===2&&r.mul2===1&&r.got>0,JSON.stringify(r));await ctx.close();return JSON.stringify(r);});
 await check('Boss：三階段依序進行、分身與衝刺預告、第三階段需定身才能捕捉',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');
  const r=await p.evaluate(()=>{const A=FackAdv,l=A.layer(document.getElementById('stage'));let res=null;const g=new A.Game(l,{stage:A.STAGES[3],diff:A.DIFFS.normal,buffs:{},seed:9,mode:'single',debug:true,onEnd(x){res=x;}});
   const log=[];const tag=()=>{g.F.inv=0;g.P.x=g.F.x;g.P.y=g.F.y;g.step(1/30);};
   for(let i=0;i<3;i++){tag();g.F.inv=0;}log.push('p'+g.F.phase+' clones'+g.clones.length);g.step(1/30);for(let i=0;i<70;i++)g.step(1/30);
   g.F.dashT=0;g.P.x=g.F.x+200;g.P.y=g.F.y;for(let i=0;i<3;i++)g.step(1/30);log.push('tele:'+g.teles.filter(t=>t.kind==='line').length+' state:'+g.F.state);
   for(let i=0;i<3;i++){tag();}log.push('p'+g.F.phase);for(let i=0;i<70;i++)g.step(1/30);
   g.F.inv=0;g.P.x=g.F.x;g.P.y=g.F.y;g.step(1/30);log.push('shieldTag:'+g.F.tags);
   g.useItem('freeze');g.F.inv=0;g.P.x=g.F.x;g.P.y=g.F.y;g.step(1/30);g.useItem('freeze');g.F.inv=0;g.P.x=g.F.x;g.P.y=g.F.y;g.step(1/30);log.push('afterFreeze:'+g.F.tags+' celebrate:'+(g.celebrate>0));
   for(let i=0;i<150;i++)g.step(1/30);l.remove();return {log,win:res&&res.win,p3:res&&res.flags.p3flawless};});
  assert(r.log[0]==='p2 clones5'&&r.log[1].startsWith('tele:1')&&r.log[2]==='p3'&&r.log[3]==='shieldTag:0'&&r.win,JSON.stringify(r));await ctx.close();return r.log.join(' → ')+' → 勝利';});
 await check('成就：完成條件後解鎖、有時間戳、傳說追擊者在 7 項主要成就後解鎖、可切換展示稱號',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html');await seed(p,OLD);await p.reload();
  const r=await p.evaluate(()=>{const F=FackAdventure,d=FackExpStore.data;const base={mode:'single',diff:'easy',used:60,remaining:100,limit:160,hearts:3,damage:0,papers:0,itemsUsed:{},hidden:true,flags:{},extra:{},stars:3,score:1000,win:true};
   const all=[];['night','escort','tenday','boss'].forEach((s,i)=>{const diff=['easy','normal','hard','hell'][i];all.push(...F.recordStage(Object.assign({},base,{stage:s,diff,flags:s==='escort'?{perfect:true}:s==='boss'?{p3flawless:true}:{},itemsUsed:Object.fromEntries(Object.keys(FackAdv.ITEMS).map(k=>[k,1]))})));});
   return {got:all.map(a=>a.id),ts:d.ach.legend,sum:F.summary()};});
  assert(['nightShift','perfectEscort','extremeChaser','collector','fourStar','truth','bane','legend'].every(x=>r.got.includes(x)),'missing '+r.got);assert(r.ts>0,'ts');
  await p.click('#achievements');await p.selectOption('.axg select','legend');await p.click('.axg [data-a=x]');assert((await p.textContent('#hall')).includes('傳說追擊者'),'title not shown');
  await p.click('#achievements');await p.selectOption('.axg select','classic');await p.click('.axg [data-a=x]');assert((await p.textContent('#hall')).includes('地獄追緝官'),'classic title missing');
  const after=await dump(p);CLASSIC_KEYS.forEach(k=>assert(after[k]===OLD[k],'changed '+k));await ctx.close();return r.got.length+' 項；展示稱號可在冒險/經典間切換，經典稱號資料未被改寫';});

 // ── 4. 每日挑戰 ──
 await check('每日挑戰：台灣時間跨日切換、同日同種子同地圖、紀錄依日期分開',async()=>{const {ctx,p}=await page();await p.clock.install({time:new Date('2026-11-06T15:59:00Z')});await p.goto(BASE+'fack.html?fackdebug=1');await p.evaluate(()=>localStorage.clear());await p.reload();
  const d1=await p.evaluate(()=>FackExpStore.twDate());const i1=await p.evaluate(()=>FackAdv.dailyInfo(FackExpStore.twDate()));
  const mapA=await p.evaluate(()=>{const A=FackAdv,l=A.layer(document.getElementById('stage'));const date=FackExpStore.twDate(),info=A.dailyInfo(date);const g=new A.Game(l,{stage:A.dailyDef(date),diff:A.DIFFS.normal,seed:info.seed,mode:'daily',onEnd(){}});const s=JSON.stringify(g.state().extra.solids);g.stop();l.remove();return s;});
  const mapB=await p.evaluate(()=>{const A=FackAdv,l=A.layer(document.getElementById('stage'));const date=FackExpStore.twDate(),info=A.dailyInfo(date);const g=new A.Game(l,{stage:A.dailyDef(date),diff:A.DIFFS.normal,seed:info.seed,mode:'daily',onEnd(){}});const s=JSON.stringify(g.state().extra.solids);g.stop();l.remove();return s;});
  assert(mapA===mapB,'same-day map differs');
  await p.click('#daily');await p.click('[data-a=go]');await p.waitForFunction(()=>window.fackAdvGame);await p.evaluate(()=>{window.fackAdvGame.debug.win();window.fackAdvGame.debug.step(90,1/30);});
  await p.clock.runFor(2*60*1000);
  await p.waitForSelector('.ax-card');const d2=await p.evaluate(()=>FackExpStore.twDate());const daily=await p.evaluate(()=>FackExpStore.data.daily);
  assert(d1==='2026-11-06'&&d2==='2026-11-07','dates '+d1+' '+d2);assert(daily['2026-11-06']&&daily['2026-11-06'].clears===1&&!daily['2026-11-07'],'record date '+JSON.stringify(daily));
  await p.click('[data-a=home]');const txt=await p.textContent('.ax-card');assert(txt.includes('2026-11-07'),'home not switched');const i2=await p.evaluate(()=>FackAdv.dailyInfo('2026-11-07'));
  await ctx.close();return d1+' 「'+i1.type.name+'」 → '+d2+' 「'+i2.type.name+'」（種子 '+i1.seed+' → '+i2.seed+'）';});
 await check('每日挑戰五種題型都可產生並被自動玩家完成',async()=>{const {ctx,p}=await page();await p.goto(BASE+'fack.html?fackdebug=1');await p.addScriptTag({content:BOT});
  const r=await p.evaluate(()=>{const A=FackAdv,out={};let d=new Date('2026-11-01T12:00:00+08:00').getTime();const seen=new Set();
   for(let n=0;n<60&&seen.size<5;n++,d+=864e5){const date=FackExpStore.twDate(d),info=A.dailyInfo(date);if(seen.has(info.type.id))continue;seen.add(info.type.id);
    const l=A.layer(document.getElementById('stage'));let res=null;const g=new A.Game(l,{stage:A.dailyDef(date),diff:A.DIFFS.normal,seed:info.seed,mode:'daily',debug:true,onEnd(x){res=x;}});window.fackAdvGame=g;window.__advBot(200);g.stop();l.remove();out[info.type.id]=date+' '+(res&&res.win?'勝 '+res.used+'s':'敗 '+(res&&res.reason));}
   return out;});
  const wins=Object.values(r).filter(x=>x.includes('勝')).length;assert(Object.keys(r).length===5&&wins>=4,JSON.stringify(r));await ctx.close();return JSON.stringify(r);});

 // ── 5. 手機操作／版面 ──
 for(const dev of ['iPhone 13','Pixel 7']){
  await check('手機版面與操作：'+dev,async()=>{const {ctx,p}=await page(devices[dev]);await p.goto(BASE+'fack.html?fackdebug=1');await p.evaluate(()=>localStorage.clear());await p.reload();
   await p.click('#adv');await p.click('[data-a=start]');await p.click('[data-a=go]');await p.waitForFunction(()=>window.fackAdvGame);
   const box=await p.locator('.ax-joy').boundingBox(),cv=await p.locator('.ax-cv').boundingBox(),vp=p.viewportSize();
   assert(box.x>=0&&box.y>=0&&box.x+box.width<=vp.width&&box.y+box.height<=vp.height,'joystick offscreen');
   const s0=await p.evaluate(()=>window.fackAdvState());
   await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2,box.y+4,{steps:4});await p.waitForTimeout(700);await p.mouse.up();
   const s1=await p.evaluate(()=>window.fackAdvState());assert(s1.y<s0.y-40,'joystick did not move player '+s0.y+'→'+s1.y);
   const occl=(box.width*box.height)/(cv.width*cv.height);
   // 自動暫停：切到背景
   await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   const paused=await p.evaluate(()=>window.fackAdvState().paused);assert(paused,'not paused when hidden');
   await p.screenshot({path:path.join(process.env.SHOTS||require('node:os').tmpdir(),'mobile-'+dev.replace(/ /g,'')+'.png')}).catch(()=>{});
   await ctx.close();return '搖桿上移 '+Math.round(s0.y-s1.y)+'px；搖桿佔畫面 '+Math.round(occl*100)+'%；背景自動暫停';});
 }
 await check('重複進出冒險模式 10 次：事件監聽器沒有累積（無記憶體洩漏跡象）',async()=>{const {ctx,p}=await page();await p.addInitScript(()=>{const c={n:0};window.__lc=c;const add=EventTarget.prototype.addEventListener,rm=EventTarget.prototype.removeEventListener;
   EventTarget.prototype.addEventListener=function(t,f,o){if(this===window||this===document)c.n++;return add.call(this,t,f,o);};EventTarget.prototype.removeEventListener=function(t,f,o){if(this===window||this===document)c.n--;return rm.call(this,t,f,o);};});
  await p.goto(BASE+'fack.html?fackdebug=1');const base=await p.evaluate(()=>window.__lc.n);
  for(let i=0;i<10;i++){await p.click('#adv');await p.click('[data-s="0"]');await p.click('[data-a=go]');await p.waitForTimeout(80);await p.click('.ax-pause');await p.click('[data-a=out]');await p.click('[data-a=back]');}
  const end=await p.evaluate(()=>window.__lc.n);assert(end-base<=1,'listeners grew '+base+'→'+end);await ctx.close();return 'window/document 監聽器 '+base+' → '+end;});
 await check('FPS 量測（手機模擬，無頭瀏覽器，僅供參考）',async()=>{const {ctx,p}=await page(devices['Pixel 7']);await p.goto(BASE+'fack.html?fackdebug=1');
  const out={};for(const i of [0,1,2,3]){await p.evaluate(()=>{const b=document.querySelector('[data-a=back]');if(b)b.click();});await p.click('#adv');await p.evaluate(()=>{const a=FackExpStore.data.adventure;a.unlocked=4;});await p.evaluate(()=>{});
   await p.evaluate(()=>{document.querySelector('[data-a=back]').click();});await p.click('#adv');await p.click('[data-s="'+i+'"]');await p.click('[data-a=go]');if(i===3){await p.waitForSelector('.ax-boss');await p.click('.ax-boss');}
   await p.waitForFunction(()=>window.fackAdvGame&&!window.fackAdvGame.over);
   out[i]=await p.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r(Math.round(n/2));};requestAnimationFrame(f);}));
   await p.click('.ax-pause');await p.click('[data-a=out]');}
  await ctx.close();return Object.entries(out).map(([k,v])=>'第'+(+k+1)+'關 '+v+' fps').join('、');});
 }finally{
  rec('頁面 JavaScript 錯誤',errors.length===0,errors.length?errors.slice(0,5).join(' | '):'無');
  await browser.close();srv.kill();try{fs.unlinkSync(LEGACY_PATH);}catch(e){}
  fs.writeFileSync(path.join(__dirname,'expansion-results.json'),JSON.stringify({date:new Date().toISOString(),passed:results.filter(r=>r.ok).length,failed,results},null,1));
  console.log('\n'+(failed?failed+' FAILED':'ALL PASSED')+' ('+results.length+' checks)');process.exit(failed?1:0);
 }
})();
