/* 全民找法克・冒險模式／每日挑戰／擴充成就 介面與紀錄
   所有紀錄只寫入 FackExpStore（localStorage Key：fack.expansion.v1），與經典模式完全分開。 */
(function(){
'use strict';
const A=window.FackAdv,S=window.FackExpStore,snd=A.util.snd;
const D=()=>S.data;
const fmtDate=t=>{if(!t)return '';const d=new Date(t+8*3600e3);return d.toISOString().slice(0,16).replace('T',' ');};

/* ── 擴充成就（與經典成就分開儲存；稱號可在圖鑑中切換展示）── */
const stage=id=>D().adventure.stages[id]||{};
const ACH=[
 {id:'nightShift',icon:'🔦',name:'夜班偵探',title:'夜班偵探',desc:'完成第一關「深夜追蹤」',goal:1,cur:()=>stage('night').clears|0,main:true},
 {id:'perfectEscort',icon:'📦',name:'零失誤護送員',title:'零失誤護送員',desc:'「連署書保衛戰」10 箱連署書全數送達',goal:1,cur:()=>D().stats.escortPerfect|0,main:true},
 {id:'extremeChaser',icon:'⚡',name:'極限追擊者',title:'極限追擊者',desc:'Boss 最終階段完全無傷並成功捕捉法克',goal:1,cur:()=>D().stats.bossFlawless|0,main:true},
 {id:'collector',icon:'🎒',name:'道具收藏家',title:'道具收藏家',desc:'在冒險／每日挑戰中使用過 10 種不同道具',goal:10,cur:()=>Object.keys(D().stats.itemsUsed).filter(k=>A.ITEMS[k]).length,main:true},
 {id:'fourStar',icon:'🌟',name:'四星挑戰王',title:'四星挑戰王',desc:'用簡單、中等、難、地獄四種難度，各通關至少一個冒險關卡',goal:4,cur:()=>Object.values(D().adventure.diffClears).filter(v=>v>0).length,main:true},
 {id:'truth',icon:'📔',name:'真相探索者',title:'真相探索者',desc:'找到四個冒險關卡中全部的 📔 隱藏線索',goal:4,cur:()=>A.STAGES.filter(s=>D().stats.hidden[s.id]).length,main:true},
 {id:'bane',icon:'👑',name:'法克剋星',title:'冒險・法克剋星',desc:'完成最終 Boss 戰「法克的最後反擊」',goal:1,cur:()=>D().stats.bossClears|0,main:true},
 {id:'legend',icon:'🐉',name:'傳說追擊者',title:'傳說追擊者',desc:'達成全部 7 項冒險模式主要成就',goal:7,cur:()=>ACH.filter(a=>a.main&&D().ach[a.id]).length},
 {id:'daily1',icon:'📅',name:'每日報到',title:'每日報到員',desc:'完成一次每日挑戰',goal:1,cur:()=>D().stats.dailyClears|0},
 {id:'daily3',icon:'🗓️',name:'三日勤務',title:'全勤追緝員',desc:'在 3 個不同日期完成每日挑戰',goal:3,cur:()=>D().stats.dailyDates|0},
 {id:'buffAll',icon:'🃏',name:'Buff 鑑賞家',title:'Buff 鑑賞家',desc:'在冒險中選過全部 8 種 Buff',goal:8,cur:()=>Object.keys(D().stats.buffsPicked).filter(k=>A.BUFFS[k]).length},
 {id:'shortcut',icon:'🕳️',name:'牆壁敲敲樂',title:'捷徑達人',desc:'找到「十日倒數」裡的隱藏捷徑',goal:1,cur:()=>D().stats.shortcut|0,hidden:true},
 {id:'wrongGuy',icon:'🎭',name:'抓錯人了',title:'認錯人專家',desc:'在 Boss 戰中戳破 10 個假分身',goal:10,cur:()=>D().stats.clonesPopped|0,hidden:true},
 {id:'buzzer',icon:'⏰',name:'壓線逃脫',title:'壓線之王',desc:'剩不到 5 秒時通關任一冒險關卡',goal:1,cur:()=>D().stats.lastSecond|0,hidden:true}
];
function checkGear(silent){if(!A.gear)return [];const g=A.gear.check();if(!silent)g.forEach(x=>A.toast(x.icon,'🎽 獲得裝備：'+x.name,x.effect));return g;}
function checkAch(){const d=D(),fresh=[];
 // legend 依賴其他成就，因此跑兩輪
 for(let pass=0;pass<2;pass++)ACH.forEach(a=>{if(!d.ach[a.id]&&a.cur()>=a.goal){d.ach[a.id]=Date.now();fresh.push(a);}});
 checkGear();return fresh;}
function announce(list){list.forEach(a=>A.toast(a.icon,'🏆 解鎖成就：'+a.name,'獲得稱號「'+a.title+'」'));}
function classicTitle(){try{return window.FackTrophies?window.FackTrophies.title():'見習追緝員';}catch(e){return '見習追緝員';}}
function displayTitle(){const t=D().title;if(t&&t.src==='adv'){const a=ACH.find(x=>x.id===t.id);if(a&&D().ach[a.id])return a.title;}return classicTitle();}
function summary(){const d=D();return {got:ACH.filter(a=>d.ach[a.id]).length,total:ACH.length,title:displayTitle(),cleared:A.STAGES.filter(s=>(d.adventure.stages[s.id]||{}).clears>0).length,unlocked:d.adventure.unlocked,run:d.adventure.run};}

function mergeItems(res){const u=D().stats.itemsUsed;Object.keys(res.itemsUsed||{}).forEach(k=>{if(A.ITEMS[k]&&!u[k])u[k]=Date.now();});}
function recordStage(res){const d=D(),ad=d.adventure;
 const st=ad.stages[res.stage]=Object.assign({plays:0,clears:0,bestStars:0,bestScore:0,bestTime:null,lastAt:0},ad.stages[res.stage]||{});
 st.plays++;st.lastAt=Date.now();mergeItems(res);
 if(res.hidden&&!d.stats.hidden[res.stage])d.stats.hidden[res.stage]=Date.now();
 if(res.flags.shortcut)d.stats.shortcut++;
 if(res.stage==='boss')d.stats.clonesPopped+=(res.extra.clones|0);
 const by=(field,stage)=>{const o=d.stats[field]=d.stats[field]||{};return o[stage]=o[stage]||{};};
 if(res.win){
  const cb=by('clearBy',res.stage);cb[res.diff]=(cb[res.diff]|0)+1;
  if(res.damage===0){const nb=by('noDmgBy',res.stage);nb[res.diff]=(nb[res.diff]|0)+1;}
  const tb=by('bestTimeBy',res.stage);tb[res.diff]=tb[res.diff]?Math.min(tb[res.diff],res.used):res.used;
  if(res.stage==='escort'&&res.flags.perfect){const eb=d.stats.escortPerfectBy=d.stats.escortPerfectBy||{};eb[res.diff]=(eb[res.diff]|0)+1;}
  st.clears++;res.newBest=res.score>st.bestScore&&st.clears>1;st.bestStars=Math.max(st.bestStars,res.stars);st.bestScore=Math.max(st.bestScore,res.score);st.bestTime=st.bestTime==null?res.used:Math.min(st.bestTime,res.used);
  ad.diffClears[res.diff]=(ad.diffClears[res.diff]|0)+1;
  const idx=A.STAGES.findIndex(s=>s.id===res.stage);if(idx+2>ad.unlocked){ad.unlocked=Math.min(4,idx+2);res.unlockedNext=A.STAGES[idx+1];}
  if(res.stage==='escort'&&res.flags.perfect)d.stats.escortPerfect++;
  if(res.stage==='boss'){d.stats.bossClears++;if(res.flags.p3flawless)d.stats.bossFlawless++;}
  if(res.remaining<=5)d.stats.lastSecond++;
 }
 const fresh=checkAch();S.save();return fresh;}
function dailyRec(date){return Object.assign({plays:0,clears:0,best:0,bestTime:null,firstClear:0},D().daily[date]||{});}
function recordDaily(date,res){const d=D(),r=dailyRec(date);r.plays++;mergeItems(res);
 if(res.win){if(!r.clears){r.firstClear=Date.now();d.stats.dailyClears++;d.stats.dailyDates=(d.stats.dailyDates|0)+1;}r.clears++;res.newBest=res.score>r.best&&r.clears>1;r.best=Math.max(r.best,res.score);r.bestTime=r.bestTime==null?res.used:Math.min(r.bestTime,res.used);}
 d.daily[date]=r;S.pruneDaily(S.twDate());const fresh=checkAch();S.save();return fresh;}
function streak(){const d=D();let day=S.twDate(),n=0;const prev=x=>S.twDate(Date.parse(x+'T12:00:00+08:00')-864e5);
 if(!(d.daily[day]&&d.daily[day].clears))day=prev(day);
 while(d.daily[day]&&d.daily[day].clears){n++;day=prev(day);}return n;}
function untilTomorrow(){const now=Date.now(),tw=now+8*3600e3,next=Math.ceil(tw/864e5)*864e5;const s=Math.max(0,Math.round((next-tw)/1000));return Math.floor(s/3600)+' 小時 '+Math.floor(s%3600/60)+' 分';}

/* ── 共用外殼 ── */
function Shell(host,opts){
 const self=this,layer=A.layer(host);let game=null;this.layer=layer;
 const pb=layer.querySelector('.ax-pause');
 function setTop(name,inGame){layer.querySelector('.ax-name').textContent=name;pb.textContent=inGame?'⏸':'✕';pb.setAttribute('aria-label',inGame?'暫停':'離開');if(!inGame){layer.querySelector('.ax-chips').innerHTML='';layer.querySelector('.ax-buffs').innerHTML='';}}
 pb.onclick=()=>{if(game&&!game.over){if(!game.paused)game.pause();}else self.exit();};
 this.setTop=setTop;
 this.card=function(html,cls){self.clearCard();const d=document.createElement('div');d.className='ax-card'+(cls?' '+cls:'');d.innerHTML=html;layer.append(d);const f=d.querySelector('button:not(:disabled)');if(f)setTimeout(()=>{try{f.focus({preventScroll:true});}catch(e){}},0);return d;};
 this.clearCard=()=>{layer.querySelectorAll('.ax-card,.ax-boss').forEach(e=>e.remove());const t=layer.querySelector('.ax-tip');if(t)t.remove();};
 this.stopGame=()=>{if(game){game.stop();game=null;}window.fackAdvState=null;};
 this.play=function(cfg){self.clearCard();self.stopGame();
  const debug=/[?&]fackdebug=1/.test(location.search);
  game=new A.Game(layer,Object.assign({debug},cfg,{onPause:g=>self.pauseCard(g,cfg),onEnd:(r,g)=>{window.fackAdvState=()=>({over:true,result:r});cfg.onEnd(r,g);}}));
  window.fackAdvState=()=>game?Object.assign(game.state(),{debug:!!game.debug}):null;if(debug)window.fackAdvGame=game;
  return game;};
 this.pauseCard=function(g,cfg){const d=self.card('<h2>⏸ 暫停中</h2><p>'+g.def.full+'</p><p class="ax-small">切換分頁或離開畫面時會自動暫停。</p><div class="ax-row"><button data-a="go">▶ 繼續</button><button class="alt" data-a="re">🔁 重新開始本關</button><button class="alt" data-a="out">🚪 離開本關</button></div>');
  d.querySelector('[data-a=go]').onclick=()=>{self.clearCard();g.resume();};
  d.querySelector('[data-a=re]').onclick=()=>self.play(cfg);
  d.querySelector('[data-a=out]').onclick=()=>{self.stopGame();cfg.onQuit();};};
 this.exit=function(){self.close();if(opts.onExit)opts.onExit();};
 this.close=function(){self.stopGame();layer.remove();if(self.onClose)self.onClose();};
}
function starsHtml(n){return '<div class="ax-stars" aria-label="'+n+' 星">'+[1,2,3].map(i=>'<i data-s="'+i+'">⭐</i>').join('')+'</div>';}
function animateStars(card,n){[1,2,3].forEach(i=>{if(i<=n)setTimeout(()=>{const e=card.querySelector('[data-s="'+i+'"]');if(e&&e.isConnected){e.classList.add('on');snd().sfx('coin');}},350+i*320);});}
function statsHtml(r,extra){const rows=[['⏱ 用時',r.used+' 秒'],['⌛ 剩餘',r.remaining+' 秒'],['💥 受傷',r.damage+' 次'],['📝 連署書',r.papers+' 份']].concat(extra||[]);if(r.win)rows.push(['🏆 分數',r.score.toLocaleString('zh-TW')]);return '<div class="ax-stats">'+rows.map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>';}
function introHtml(def,first){return '<div class="ax-kick">'+def.kick+'</div><h2>'+def.icon+' '+def.full+'</h2><p>'+def.story+'</p><h3>🎯 任務</h3><ul>'+def.goals.map(x=>'<li>'+x+'</li>').join('')+'</ul><h3>'+(first?'🔰 新手提示':'💡 提示')+'</h3><ul>'+def.tips.map(x=>'<li>'+x+'</li>').join('')+'</ul><p class="ax-small">手機：右下搖桿移動｜電腦：方向鍵／WASD，空白鍵衝刺，Esc 暫停</p>';}
function bossIntro(shell,go){const l=shell.layer,b=document.createElement('div');b.className='ax-boss';b.innerHTML='<div class="bar t"></div><div class="bar b"></div><div class="bf" aria-hidden="true">🏃‍♂️💨</div><h2>BOSS 登場</h2><p>法克的最後反擊！（點一下跳過）</p>';l.append(b);snd().sfx('siren');
 let done=false;const fin=()=>{if(done)return;done=true;b.remove();go();};b.onclick=fin;setTimeout(fin,2600);}

// 失敗畫面的裝備提示：目前裝備與已取得數量
function gearTip(){const ge=A.gear.equipped(),gd=A.gear.gearData(),got=A.GEAR.filter(x=>gd.unlocked[x.id]).length;
 if(ge)return '💡 目前裝備：'+ge.icon+' '+ge.name+'（'+ge.effect+'）。已取得 '+got+' 件裝備，可以換一件更適合這關的再挑戰！';
 return got?'💡 你已取得 '+got+' 件裝備但還沒裝上，裝備後再挑戰會更輕鬆！':'💡 還沒有裝備：完成經典或冒險的指定條件就能取得永久裝備，讓冒險更好過！';}
/* ── 冒險模式 ── */
function openAdventure(host,opts){opts=opts||{};const sh=new Shell(host,opts);
 function ad(){return D().adventure;}
 function hub(){sh.stopGame();sh.setTop('🗺️ 冒險模式',false);const a=ad(),run=a.run,diff=A.DIFFS[a.diff]||A.DIFFS.normal;
  const buffList=run?Object.keys(run.buffs).filter(k=>run.buffs[k]>0).map(k=>A.BUFFS[k].icon+A.BUFFS[k].name+(run.buffs[k]>1?'×'+run.buffs[k]:'')).join('、'):'';
  const next=run?A.STAGES[run.stage]:null;
  let h='<div class="ax-kick">ADVENTURE MODE</div><h2>🗺️ 冒險模式</h2><p>四個主題關卡連續闖關！每過一關，從 3 個隨機 Buff 中選 1 個帶到下一關。失敗只要重玩當前關卡。</p>';
  if(run&&next){h+='<div class="ax-stats"><div><span>進行中的冒險</span><b>'+A.DIFFS[run.diff].e+' '+A.DIFFS[run.diff].n+'</b></div><div><span>下一關</span><b>'+next.icon+' '+next.name+'</b></div><div><span>Buff</span><b>'+(buffList||'尚無')+'</b></div></div><div class="ax-row"><button data-a="cont">'+(run.pendingBuff?'🃏 選擇 Buff':'▶ 繼續冒險')+'</button><button class="alt" data-a="new">重新開始冒險</button></div>';}
  else{h+='<h3>選擇冒險難度</h3><div class="ax-diffs">'+Object.values(A.DIFFS).map(x=>'<button type="button" data-d="'+x.id+'" class="'+(x.id===diff.id?'on':'')+'">'+x.e+' '+x.n+'<small>'+x.desc+'</small></button>').join('')+'</div><div class="ax-row"><button data-a="start">▶ 開始新冒險</button></div>';}
  {const ge=A.gear&&A.gear.equipped();h+='<p class="ax-small">🎽 '+(ge?'裝備中：'+ge.icon+' '+ge.name+'｜'+ge.effect:'尚未裝備裝備')+'</p>';}
  h+='<h3>關卡選擇（單關挑戰不使用 Buff）</h3><div class="ax-stages">'+A.STAGES.map((s,i)=>{const st=a.stages[s.id]||{},lock=i+1>a.unlocked,cur=run&&run.stage===i;
   return '<div class="ax-stage'+(lock?' locked':'')+(cur?' cur':'')+'"><b>'+s.icon+' '+(i<3?'第'+(i+1)+'關':'最終關')+'｜'+s.name+'</b>'+(lock?'🔒 通關前一關後解鎖':(st.clears?'⭐'.repeat(st.bestStars)+'　通關 '+st.clears+' 次<br>最佳 '+(st.bestScore||0).toLocaleString('zh-TW')+' 分・'+st.bestTime+' 秒':'尚未通關'))+(D().stats.hidden[s.id]?'<br>📔 已找到隱藏線索':'')+'<button type="button" class="alt" data-s="'+i+'"'+(lock?' disabled':'')+'>'+(lock?'未解鎖':'單關挑戰（'+diff.e+diff.n+'）')+'</button></div>';}).join('')+'</div>';
  h+='<div class="ax-row"><button class="alt" data-a="ach">🏆 成就圖鑑</button><button class="alt" data-a="back">← 返回主選單</button></div>';
  const d=sh.card(h);
  d.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{a.diff=b.dataset.d;S.save();hub();});
  const q=s=>d.querySelector(s);
  if(q('[data-a=start]'))q('[data-a=start]').onclick=()=>{a.run={id:Date.now(),seed:S.hash('run|'+Date.now()+'|'+Math.random()),diff:a.diff,stage:0,buffs:{},pendingBuff:false,offer:null,results:[],startedAt:Date.now()};a.runsStarted++;S.save();intro(0,'run');};
  if(q('[data-a=cont]'))q('[data-a=cont]').onclick=()=>{if(a.run.pendingBuff)buffPick();else intro(a.run.stage,'run');};
  if(q('[data-a=new]'))q('[data-a=new]').onclick=()=>{const c=sh.card('<h2>重新開始冒險？</h2><p>目前這趟冒險的 Buff 和進度會重置。<br><b>已通關紀錄、星等、成就都會保留。</b></p><div class="ax-row"><button data-a="y">確定重新開始</button><button class="alt" data-a="n">取消</button></div>');c.querySelector('[data-a=y]').onclick=()=>{a.run=null;S.save();hub();};c.querySelector('[data-a=n]').onclick=hub;};
  d.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>intro(+b.dataset.s,'single'));
  q('[data-a=ach]').onclick=()=>openGallery({});
  q('[data-a=back]').onclick=()=>sh.exit();}
 function cfgFor(i,mode){const a=ad(),run=a.run,def=A.STAGES[i];
  const ge=A.gear&&A.gear.equipped(),gear=ge?ge.id:null;
  return mode==='run'?{stage:def,diff:A.DIFFS[run.diff],buffs:run.buffs,gear,seed:(run.seed^Math.imul(i+1,2654435761))>>>0,mode:'run'}:{stage:def,diff:A.DIFFS[a.diff]||A.DIFFS.normal,buffs:{},gear,seed:S.hash(def.id+'|'+Date.now()),mode:'single'};}
 function intro(i,mode){const def=A.STAGES[i],first=!D().tutorial[def.id];sh.setTop(def.icon+' '+def.name,false);
  const c=cfgFor(i,mode),bl=mode==='run'?Object.keys(c.buffs).filter(k=>c.buffs[k]>0).map(k=>A.BUFFS[k].icon+' '+A.BUFFS[k].name+' Lv'+c.buffs[k]):[];
  const d=sh.card(introHtml(def,first)+'<p class="ax-small">'+(mode==='run'?'冒險進行中':'單關挑戰')+'｜'+c.diff.e+' '+c.diff.n+(bl.length?'｜'+bl.join('、'):'')+'</p><p class="ax-small">'+(c.gear?'🎽 裝備中：'+A.GEAR.find(x=>x.id===c.gear).icon+' '+A.GEAR.find(x=>x.id===c.gear).name+'（'+A.GEAR.find(x=>x.id===c.gear).effect+'）':'🎽 尚未裝備（可在「成就・稱號・裝備」圖鑑中裝備）')+'</p><div class="ax-row"><button data-a="go">▶ 開始</button><button class="alt" data-a="back">返回</button></div>');
  d.querySelector('[data-a=go]').onclick=()=>{D().tutorial[def.id]=Date.now();S.save();const go=()=>start(i,mode);if(def.boss)bossIntro(sh,go);else go();};
  d.querySelector('[data-a=back]').onclick=hub;}
 function start(i,mode){const c=cfgFor(i,mode);sh.setTop(c.stage.icon+' '+c.stage.name,true);
  sh.play(Object.assign(c,{onQuit:hub,onEnd:r=>result(i,mode,r)}));}
 function result(i,mode,r){sh.setTop(A.STAGES[i].icon+' '+A.STAGES[i].name,false);const def=A.STAGES[i],a=ad();const fresh=recordStage(r);
  let finished=false;
  if(mode==='run'&&a.run&&a.run.stage===i)a.run.damage=(a.run.damage|0)+(r.damage|0);
  if(r.win&&mode==='run'&&a.run&&a.run.stage===i){a.run.results[i]={stars:r.stars,score:r.score,used:r.used};a.run.stage=i+1;
   if(i>=3){finished=true;a.runsCleared++;if(!a.run.damage){const fr=D().stats.flawlessRuns=D().stats.flawlessRuns||{};fr[a.run.diff]=(fr[a.run.diff]|0)+1;checkAch();}a.lastRun={finishedAt:Date.now(),diff:a.run.diff,results:a.run.results,buffs:a.run.buffs};a.run=null;}
   else{a.run.pendingBuff=true;a.run.offer=null;}S.save();}
  announce(fresh);
  const ex=def.id==='escort'?[['📦 送達',(r.extra.bundles|0)+'/10 箱']]:def.id==='boss'?[['🎭 戳破分身',(r.extra.clones|0)+' 個']]:[];
  let h=r.win?'<div class="ax-kick">STAGE CLEAR</div><h2>'+(finished?'🎉 冒險完成！':'🎉 通關！')+'</h2>'+starsHtml(r.stars)+'<p>'+def.full+'</p>':'<div class="ax-kick">FAILED</div><h2>'+(r.reason||'挑戰失敗')+'</h2><p>'+def.full+'<br>別灰心，可以直接重玩這一關。</p>';
  h+=statsHtml(r,ex);
  if(finished)h+='<p>法克終於在連署書上簽名了！<br>你是集合區真正的傳說。</p>';
  if(r.hidden)h+='<p class="ax-small">📔 這次找到了隱藏線索！</p>';
  if(r.newBest)h+='<p class="ax-small">🎉 新的最佳分數！</p>';
  if(r.unlockedNext)h+='<p class="ax-small">🔓 解鎖：'+r.unlockedNext.icon+' '+r.unlockedNext.name+'</p>';
  if(fresh.length)h+='<p class="ax-small">🏆 新成就：'+fresh.map(x=>x.icon+x.name).join('、')+'</p>';
  if(!r.win&&A.gear)h+='<p class="ax-small" data-gear-tip>'+gearTip()+'</p>';
  h+='<div class="ax-row">';
  if(r.win&&mode==='run'&&!finished)h+='<button data-a="buff">🃏 選擇 Buff</button>';
  else if(!r.win)h+='<button data-a="retry">🔁 重新挑戰本關</button><button class="alt" data-a="gear">🎽 換裝備</button>';
  else if(mode==='single')h+='<button data-a="retry">🔁 再玩一次</button>';
  h+='<button class="alt" data-a="hub">🗺️ 回到冒險地圖</button><button class="alt" data-a="ach">🏆 成就</button></div>';
  const d=sh.card(h);if(r.win)animateStars(d,r.stars);
  const q=s=>d.querySelector(s);
  if(q('[data-a=buff]'))q('[data-a=buff]').onclick=buffPick;
  if(q('[data-a=retry]'))q('[data-a=retry]').onclick=()=>{if(mode==='run'&&!(a.run&&a.run.stage===i))return hub();start(i,mode);};
  if(q('[data-a=gear]'))q('[data-a=gear]').onclick=()=>openGallery({tab:'gear',onClose:()=>{const t=d.querySelector('[data-gear-tip]');if(t)t.innerHTML=gearTip();}});
  q('[data-a=hub]').onclick=hub;q('[data-a=ach]').onclick=()=>openGallery({});}
 function buffPick(){const a=ad(),run=a.run;if(!run)return hub();sh.setTop('🃏 選擇 Buff',false);
  if(!run.offer){const rng=S.rng((run.seed^Math.imul(run.stage+7,40503))>>>0),pool=Object.keys(A.BUFFS).filter(k=>(run.buffs[k]|0)<A.BUFFS[k].max);
   for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}run.offer=pool.slice(0,3);S.save();}
  if(!run.offer.length){run.pendingBuff=false;S.save();return intro(run.stage,'run');}
  const d=sh.card('<div class="ax-kick">CHOOSE A BUFF</div><h2>🃏 選擇一個 Buff</h2><p>效果只在這趟冒險有效，同種 Buff 最多疊 2 層。</p><div class="ax-buffpick">'+run.offer.map(k=>{const B=A.BUFFS[k],n=(run.buffs[k]|0)+1;return '<button type="button" data-b="'+k+'"><span class="ic">'+B.icon+'</span><b>'+B.name+' Lv'+n+'</b><small>'+B.desc+'<br>→ '+B.lv(n)+'</small></button>';}).join('')+'</div><p class="ax-small">下一關：'+A.STAGES[run.stage].icon+' '+A.STAGES[run.stage].name+'</p>');
  d.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const k=b.dataset.b;if(!run.offer.includes(k))return;run.buffs[k]=Math.min(A.BUFFS[k].max,(run.buffs[k]|0)+1);run.pendingBuff=false;run.offer=null;D().stats.buffsPicked[k]=(D().stats.buffsPicked[k]|0)+1;const fresh=checkAch();S.save();announce(fresh);
   d.querySelectorAll('[data-b]').forEach(x=>x.disabled=true);b.classList.add('picked');snd().sfx('win');A.toast(A.BUFFS[k].icon,'獲得 Buff：'+A.BUFFS[k].name,A.BUFFS[k].lv(run.buffs[k]));setTimeout(()=>{if(d.isConnected)intro(run.stage,'run');},800);});}
 // 重新整理後：若有待選 Buff，直接回到選擇畫面（避免重抽）
 if(opts.direct==='continue'&&ad().run){if(ad().run.pendingBuff)buffPick();else intro(ad().run.stage,'run');}else hub();
 return sh;}

/* ── 每日挑戰 ── */
function openDaily(host,opts){opts=opts||{};const sh=new Shell(host,opts);
 function home(){sh.stopGame();sh.setTop('📅 每日挑戰',false);const date=S.twDate(),info=A.dailyInfo(date),r=dailyRec(date),T=info.type;
  const d=sh.card('<div class="ax-kick">DAILY CHALLENGE</div><h2>📅 每日挑戰</h2><p><b>'+date+'</b>（台灣時間）</p><div class="ax-stats"><div><span>今日任務</span><b>'+T.name+'</b></div><div><span>規則</span><b style="text-align:right">'+T.desc+'</b></div><div><span>今日遊玩／通關</span><b>'+r.plays+' / '+r.clears+'</b></div><div><span>今日最佳</span><b>'+(r.clears?r.best.toLocaleString('zh-TW')+' 分・'+r.bestTime+' 秒':'—')+'</b></div><div><span>連續完成</span><b>'+streak()+' 天</b></div><div><span>下一個挑戰</span><b>'+untilTomorrow()+'後</b></div></div><p class="ax-small">每天所有玩家都是同一張地圖與任務，可以重複挑戰。<br>每日挑戰固定為「中等」難度、不使用冒險 Buff，紀錄與經典模式分開保存。</p><div class="ax-row"><button data-a="go">▶ 開始挑戰</button><button class="alt" data-a="ach">🏆 成就圖鑑</button><button class="alt" data-a="back">← 返回主選單</button></div>');
  d.querySelector('[data-a=go]').onclick=()=>play(date);d.querySelector('[data-a=ach]').onclick=()=>openGallery({});d.querySelector('[data-a=back]').onclick=()=>sh.exit();}
 function play(date){const info=A.dailyInfo(date),def=A.dailyDef(date);sh.setTop('📅 '+info.type.name,true);
  sh.play({stage:def,diff:A.DIFFS.normal,buffs:{},seed:info.seed,mode:'daily',daily:date,onQuit:home,onEnd:r=>done(date,r)});}
 function done(date,r){sh.setTop('📅 每日挑戰',false);const fresh=recordDaily(date,r);announce(fresh);const info=A.dailyInfo(date),today=S.twDate();
  let h=(r.win?'<div class="ax-kick">DAILY CLEAR</div><h2>🎉 每日挑戰完成！</h2>'+starsHtml(r.stars):'<div class="ax-kick">FAILED</div><h2>'+(r.reason||'挑戰失敗')+'</h2>')+'<p>'+date+'｜'+info.type.name+'</p>'+statsHtml(r)+(r.newBest?'<p class="ax-small">🎉 今日新紀錄！</p>':'')+(fresh.length?'<p class="ax-small">🏆 新成就：'+fresh.map(x=>x.icon+x.name).join('、')+'</p>':'')+(date!==today?'<p class="ax-small">⏰ 已經跨日了，這筆成績記在 '+date+'；新的每日挑戰已經開放。</p>':'');
  h+='<div class="ax-row">'+(date===today?'<button data-a="re">🔁 再挑戰一次</button>':'')+'<button class="alt" data-a="home">'+(date===today?'返回每日挑戰':'看今天的新挑戰')+'</button><button class="alt" data-a="share">分享</button></div>';
  const d=sh.card(h);if(r.win)animateStars(d,r.stars);
  if(d.querySelector('[data-a=re]'))d.querySelector('[data-a=re]').onclick=()=>play(date);
  d.querySelector('[data-a=home]').onclick=home;
  d.querySelector('[data-a=share]').onclick=()=>{const text='我'+(r.win?'完成了':'挑戰了')+'「全民找法克」'+date+' 每日挑戰「'+info.type.name+'」'+(r.win?'，拿到 '+r.score+' 分':'')+'！';const url=location.href.split('#')[0].split('?')[0];
   (navigator.share?navigator.share({title:'全民找法克・每日挑戰',text,url}).catch(()=>{}):navigator.clipboard?navigator.clipboard.writeText(text+' '+url).then(()=>A.toast('📋','已複製分享文字',''),()=>{}):Promise.resolve());};}
 home();return sh;}

/* ── 成就圖鑑（擴充）── */
const GSTYLE='.axg{position:fixed;inset:0;z-index:9998;background:#07101ff0;display:flex;align-items:center;justify-content:center;padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px));font-family:system-ui,"PingFang TC",sans-serif;color:#f4f1e9}.axg-p{width:min(680px,100%);max-height:94dvh;overflow-y:auto;overscroll-behavior:contain;background:linear-gradient(145deg,#1e3445,#111f30);border:1px solid #9aaebe6b;border-radius:18px;box-shadow:0 20px 80px #000c;padding:18px}.axg h2{font-size:23px;color:#ffe0a1;margin:0}.axg-t{display:flex;justify-content:space-between;align-items:center;gap:8px}.axg button{border:1px solid #7894a9;background:#284355;color:#fff;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer;min-height:38px}.axg-tabs{display:flex;gap:6px;margin:12px 0 8px}.axg-tabs button.on{background:#f1d09a;color:#102338;border-color:#f1d09a}.axg-m{color:#b5d4d9;font-size:13px;line-height:1.7;margin:6px 0}.axg-bar{height:9px;border-radius:10px;background:#33485a;overflow:hidden;margin:6px 0 14px}.axg-bar i{display:block;background:linear-gradient(90deg,#f4bb59,#fff1c2);height:100%}.axg-l{display:grid;grid-template-columns:1fr 1fr;gap:9px}@media(max-width:520px){.axg-l{grid-template-columns:1fr}}.axg-i{border:1px solid #7899a14d;border-radius:12px;background:#162938;padding:10px;font-size:12px;line-height:1.55}.axg-i.lk{opacity:.62}.axg-i b{font-size:14px;color:#ffe1a3}.axg-i .pb{height:5px;background:#33485a;border-radius:4px;overflow:hidden;margin:5px 0}.axg-i .pb i{display:block;height:100%;background:#9fe3c4}.axg-i .main{font-size:10px;background:#5a4420;color:#ffe1a3;border-radius:5px;padding:1px 5px;margin-left:4px}.axg select{font-size:14px;padding:6px;border-radius:8px;background:#20394c;color:#fff;border:1px solid #8297a4;max-width:100%}';
function openGallery(opts){opts=opts||{};if(!document.getElementById('axg-style')){const s=document.createElement('style');s.id='axg-style';s.textContent=GSTYLE;document.head.append(s);}
 const old=document.querySelector('.axg');if(old)old.remove();checkGear();S.save();
 const o=document.createElement('div');o.className='axg';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','成就・稱號・裝備圖鑑');document.body.append(o);
 let tab=opts.tab==='gear'?'gear':'ach';
 function close(){o.remove();document.removeEventListener('keydown',esc,true);document.dispatchEvent(new Event('fack-title-changed'));if(opts.onClose)opts.onClose();}
 function esc(e){if(e.key==='Escape'){e.stopPropagation();close();}}
 document.addEventListener('keydown',esc,true);o.onclick=e=>{if(e.target===o)close();};
 const stars=t=>t>5?'🌈 傳說級':'★'.repeat(t)+'☆'.repeat(5-t);
 const fmtV=(r,v)=>v==null?'—':r.low?v+(r.unit||''):Number(v).toLocaleString('zh-TW');
 function achHtml(){const d=D(),got=ACH.filter(a=>d.ach[a.id]).length,pct=Math.round(got/ACH.length*100),cur=d.title&&d.title.src==='adv'?d.title.id:'classic';
  const opt='<option value="classic"'+(cur==='classic'?' selected':'')+'>經典稱號：'+classicTitle()+'</option>'+ACH.filter(a=>d.ach[a.id]).map(a=>'<option value="'+a.id+'"'+(cur===a.id?' selected':'')+'>冒險稱號：'+a.title+'</option>').join('');
  return '<p class="axg-m">已解鎖 <b>'+got+' / '+ACH.length+'</b> 項（'+pct+'%）。冒險成就與經典成就分開保存，經典紀錄不受影響。</p><div class="axg-bar"><i style="width:'+pct+'%"></i></div>'
   +'<p class="axg-m">展示稱號：<select aria-label="展示稱號">'+opt+'</select></p><div class="axg-l">'
   +ACH.map(a=>{const ok=!!d.ach[a.id],v=Math.min(a.goal,Math.max(0,a.cur())),hid=a.hidden&&!ok;
    return '<div class="axg-i'+(ok?'':' lk')+'"><b>'+(hid?'❔ ？？？':a.icon+' '+a.name)+(ok?' ✓':' 🔒')+'</b>'+(a.main?'<span class="main">主要</span>':'')+(a.hidden?'<span class="main">隱藏</span>':'')+'<br>'+(hid?'隱藏成就：達成特定條件後揭曉':a.desc)+'<br>稱號｜'+(ok?a.title:'？？？')+'<div class="pb"><i style="width:'+(hid?0:v/a.goal*100)+'%"></i></div>'+(hid?'':v+' / '+a.goal)+(ok?'　🕒 '+fmtDate(d.ach[a.id]):'')+'</div>';}).join('')+'</div>';}
 function gearHtml(){const gd=A.gear.gearData(),eq=A.gear.equipped(),got=A.GEAR.filter(x=>gd.unlocked[x.id]).length;
  return '<p class="axg-m">已取得 <b>'+got+' / '+A.GEAR.length+'</b> 件裝備。<b>一次只能裝備一件</b>，效果永久生效，但<b>只作用在冒險模式</b>（經典模式與每日挑戰維持公平，不受裝備影響）。<br>目前裝備：<b>'+(eq?eq.icon+' '+eq.name+'｜'+eq.effect:'無')+'</b></p>'
   +(eq?'<p class="axg-m"><button type="button" data-un="1">卸下裝備</button></p>':'')+'<div class="axg-l">'
   +A.GEAR.map(x=>{const ok=!!gd.unlocked[x.id],on=eq&&eq.id===x.id;
    const leg=x.tier>5?'background:linear-gradient(150deg,#4a3410,#1f2a3a 60%);border-color:#ffd56b;':'';
    return '<div class="axg-i'+(ok?'':' lk')+'" style="'+leg+(on?'border-color:#f1d09a;box-shadow:0 0 0 1px #f1d09a':'')+'"><b>'+x.icon+' '+x.name+(ok?' ✓':' 🔒')+'</b><span class="main">'+stars(x.tier)+'</span><br>效果｜<b style="font-size:12px;color:#a7ffd6">'+x.effect+'</b>'
     +x.reqs.map(r=>{const v=r.cur(),okR=A.gear.reqDone(r),pc=r.low?(v==null?0:Math.min(100,r.goal/v*100)):Math.min(100,(Number(v)||0)/r.goal*100);
      return '<div style="margin-top:5px">'+(okR?'✅ ':'⬜ ')+r.label+(r.low?'在 '+r.goal+(r.unit||'')+' 內':'')+'</div><div class="pb"><i style="width:'+pc+'%"></i></div>'+(r.low?'目前最佳：'+fmtV(r,v):fmtV(r,Math.min(Number(v)||0,r.goal))+' / '+r.goal.toLocaleString('zh-TW'));}).join('')
     +(ok?'<br>🕒 取得：'+fmtDate(gd.unlocked[x.id])+'<br><button type="button" data-eq="'+x.id+'"'+(on?' disabled':'')+' style="margin-top:6px">'+(on?'裝備中':'裝備')+'</button>':'')+'</div>';}).join('')+'</div>';}
 function paint(){
  o.innerHTML='<div class="axg-p"><div class="axg-t"><h2>🏆 成就・稱號・裝備</h2><button type="button" data-a="x">✕ 關閉</button></div><div class="axg-tabs"><button type="button" data-t="ach" class="'+(tab==='ach'?'on':'')+'">🗺️ 冒險成就・稱號</button><button type="button" data-t="gear" class="'+(tab==='gear'?'on':'')+'">🎽 裝備</button><button type="button" data-a="classic">🏃 經典成就</button></div>'+(tab==='gear'?gearHtml():achHtml())+'</div>';
  o.querySelector('[data-a=x]').onclick=close;
  o.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;paint();});
  o.querySelector('[data-a=classic]').onclick=()=>{close();if(window.FackTrophies)window.FackTrophies.open();};
  const sel=o.querySelector('select');if(sel)sel.onchange=e=>{const v=e.target.value,d=D();d.title=v==='classic'?{src:'classic'}:{src:'adv',id:v};S.save();paint();document.dispatchEvent(new Event('fack-title-changed'));};
  o.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{const x=A.GEAR.find(g=>g.id===b.dataset.eq);if(A.gear.equip(x.id)){A.toast(x.icon,'🎽 已裝備：'+x.name,x.effect);paint();document.dispatchEvent(new Event('fack-title-changed'));}});
  const un=o.querySelector('[data-un]');if(un)un.onclick=()=>{A.gear.equip(null);paint();document.dispatchEvent(new Event('fack-title-changed'));};}
 paint();o.querySelector('[data-a=x]').focus();}

window.FackAdventure={openAdventure,openDaily,openGallery,summary,displayTitle,ACH,checkAch,checkGear,recordStage,recordDaily,streak};
})();
