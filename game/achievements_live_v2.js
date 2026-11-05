/* 全民找法克：成就與稱號（只在此裝置 localStorage 儲存匿名遊戲進度） */
(function(){
'use strict';
const KEY='fack-chase-live-v2-trophies',TYPES=['speed','freeze','magnet','shield'];
function blank(){return {plays:0,wins:0,papers:0,paperPickups:0,powerTotal:0,powerTypes:{speed:0,freeze:0,magnet:0,shield:0},winsBy:{easy:0,normal:0,hard:0,hell:0},fast30:0,fast15:0,freezeWins:0,noPowerWins:0,flawlessWins:0,shieldBlocks:0,maxCombo:0,bestPapers:0,lateWins:0,unlocked:[],title:null,manualTitle:false};}
let p=blank();
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object'&&Array.isArray(v.unlocked)){p=Object.assign(blank(),v);p.powerTypes=Object.assign(blank().powerTypes,v.powerTypes||{});p.winsBy=Object.assign(blank().winsBy,v.winsBy||{});p.unlocked=v.unlocked.filter(x=>typeof x==='string');}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(p));}catch(e){}}
const ACH=[
 ['hello','🎟️','第一次出勤','集合區新兵','完成第一場追逐',1,()=>p.plays],
 ['catch','🖐️','終於追到你','法克追蹤員','第一次追上法克',1,()=>p.wins],
 ['three','🏃','鍥而不捨','追逐常客','完成 3 場追逐',3,()=>p.plays],
 ['ten','🔁','這局再來','重玩大師','完成 10 場追逐',10,()=>p.plays],
 ['w3','🏆','穩定出勤','三連追緝員','累積勝利 3 場',3,()=>p.wins],
 ['w10','👑','集合區傳說','法克剋星','累積勝利 10 場',10,()=>p.wins],
 ['paper500','📝','紙本力量','連署書搬運工','累積撿到 500 份連署書',500,()=>p.papers],
 ['paper2000','📦','行走的資料箱','連署物流王','累積撿到 2,000 份連署書',2000,()=>p.papers],
 ['paper5000','📚','萬紙齊飛','萬紙之王','累積撿到 5,000 份連署書',5000,()=>p.papers],
 ['paper10','💼','一趟大豐收','收件狂人','單局撿到 10 疊連署書',10,()=>p.bestPapers],
 ['combo5','✨','連續撿撿樂','紙張連擊手','5 秒內連續撿到 5 疊',5,()=>p.maxCombo],
 ['speed','⚡','快到看不見','追風快遞','使用過疾速鞋',1,()=>p.powerTypes.speed],
 ['freeze','🧊','不准再跑','冰封法克使者','使用過定身貼',1,()=>p.powerTypes.freeze],
 ['magnet','🧲','連署磁鐵','紙張吸引王','使用過吸紙磁鐵',1,()=>p.powerTypes.magnet],
 ['shield','🛡️','糖糖退散','防糖護衛','用防糖護盾擋下糖糖',1,()=>p.shieldBlocks],
 ['fourBuffs','🌈','全能道具王','四寶收藏家','四種道具都使用過',4,()=>TYPES.filter(x=>p.powerTypes[x]>0).length],
 ['freezeWin','⛄','冰封逮捕','冰雪追捕王','趁法克被定身時追上他',1,()=>p.freezeWins],
 ['thirty','⏱️','三十秒快遞','極速交件員','30 秒內追上法克',1,()=>p.fast30],
 ['fifteen','🚀','十五秒神速','瞬移級會長','15 秒內追上法克',1,()=>p.fast15],
 ['hell','💀','地獄也要追','地獄追緝官','贏得地獄難度',1,()=>p.winsBy.hell],
 ['allLevels','🏅','四關全通','四界征服者','四種難度都贏過',4,()=>Object.values(p.winsBy).filter(v=>v>0).length],
 ['noBuff','✊','只靠雙腳','素身追捕者','不使用道具而追上法克',1,()=>p.noPowerWins],
 ['noCandy','🍬','不沾糖','糖糖閃避王','整局未被糖糖撞到就獲勝',1,()=>p.flawlessWins],
 ['lastSecond','🔥','壓線奇蹟','最後五秒英雄','倒數 5 秒內追上法克',1,()=>p.lateWins]
].map(a=>({id:a[0],icon:a[1],name:a[2],title:a[3],desc:a[4],goal:a[5],cur:a[6]}));
function title(){const a=ACH.find(a=>a.id===p.title&&p.unlocked.includes(a.id));return a?a.title:'見習追緝員';}
function summary(){return {got:p.unlocked.filter(id=>ACH.some(a=>a.id===id)).length,total:ACH.length,title:title(),plays:p.plays,wins:p.wins,papers:p.papers};}
function record(r){
 if(!r||r.quit)return [];
 p.plays++;p.papers+=(r.papers||0);p.paperPickups+=(r.paperPickups||0);p.powerTotal+=(r.powerTotal||0);
 p.maxCombo=Math.max(p.maxCombo,r.maxCombo||0);p.bestPapers=Math.max(p.bestPapers,r.paperPickups||0);
 p.shieldBlocks+=(r.shieldBlocks||0);
 TYPES.forEach(k=>p.powerTypes[k]+=(r.powerStats&&r.powerStats[k])||0);
 if(r.win){
  p.wins++;if(p.winsBy[r.level.id]!==undefined)p.winsBy[r.level.id]++;
  if(r.used<=30)p.fast30++;if(r.used<=15)p.fast15++;
  if(r.freezeCatch)p.freezeWins++;if(!r.powerTotal)p.noPowerWins++;
  if(!r.candyHits)p.flawlessWins++;
  if(r.level.time-r.used<=5)p.lateWins++;
 }
 const fresh=ACH.filter(a=>!p.unlocked.includes(a.id)&&a.cur()>=a.goal);
 fresh.forEach(a=>p.unlocked.push(a.id));
 if(fresh.length&&!p.manualTitle)p.title=fresh[fresh.length-1].id;
 save();return fresh.map(a=>a.name);
}
const STYLE='.fa-overlay{position:fixed;inset:0;z-index:9999;background:#07101ff0;display:flex;align-items:center;justify-content:center;padding:calc(12px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px));font-family:system-ui,"PingFang TC",sans-serif;color:#f4f1e9}.fa-panel{width:min(640px,100%);max-height:94dvh;overflow-y:auto;overscroll-behavior:contain;background:linear-gradient(145deg,#1e3445,#111f30);border:1px solid #9aaebe6b;border-radius:18px;box-shadow:0 20px 80px #000c;padding:20px}.fa-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.fa-title h2{font-size:25px;color:#ffe0a1;margin:0}.fa-close{border:1px solid #7894a9;background:#284355;color:white;border-radius:9px;padding:7px 12px;font-weight:800;cursor:pointer}.fa-meta{color:#b5d4d9;font-size:13px;line-height:1.7;margin:12px 0}.fa-progress{height:9px;border-radius:10px;background:#33485a;overflow:hidden;margin:8px 0 18px}.fa-progress i{display:block;background:linear-gradient(90deg,#f4bb59,#fff1c2);height:100%}.fa-list{display:grid;grid-template-columns:1fr 1fr;gap:9px}.fa-item{border:1px solid #7899a14d;border-radius:12px;background:#162938;padding:11px;text-align:left;min-height:123px}.fa-item.locked{opacity:.55;filter:saturate(.4)}.fa-name{font-weight:900;font-size:15px}.fa-desc{font-size:12px;line-height:1.5;color:#bed1d9;margin:6px 0}.fa-rank{font-size:12px;color:#ffdc9e;font-weight:800}.fa-bar{height:5px;background:#37505b;border-radius:8px;overflow:hidden;margin:8px 0 6px}.fa-bar i{display:block;height:100%;background:#f2ce8b}.fa-item button{font-size:11px;border:1px solid #f0cc81;background:#394754;color:#fff1cf;padding:6px 10px;border-radius:7px;cursor:pointer;margin-top:7px}.fa-item button[disabled]{opacity:.7;cursor:default}@media(max-width:450px){.fa-panel{padding:14px}.fa-list{gap:7px}.fa-item{padding:9px}.fa-name{font-size:13px}.fa-title h2{font-size:21px}}';
function style(){if(document.getElementById('fa-style'))return;const e=document.createElement('style');e.id='fa-style';e.textContent=STYLE;document.head.append(e);}
function open(){
 style();const prev=document.querySelector('.fa-overlay');if(prev)prev.remove();
 const o=document.createElement('div');o.className='fa-overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','成就與稱號圖鑑');document.body.append(o);
 function close(){o.remove();document.removeEventListener('keydown',esc);}
 function esc(e){if(e.key==='Escape')close();}
 document.addEventListener('keydown',esc);
 o.onclick=e=>{if(e.target===o)close();};
 function paint(){
  const n=summary(),pct=Math.round(n.got/n.total*100);
  o.innerHTML='<div class="fa-panel"><div class="fa-title"><h2>🏆 成就・稱號圖鑑</h2><button class="fa-close" type="button">✕ 關閉</button></div><p class="fa-meta">目前稱號：<b>'+n.title+'</b><br>已解鎖 '+n.got+' / '+n.total+' 項（'+pct+'%）・遊玩 '+n.plays+' 場・勝利 '+n.wins+' 場・累積收集 '+n.papers.toLocaleString('zh-TW')+' 份。<br>成就與稱號保存在這台裝置的瀏覽器中，換裝置不會同步。點選已解鎖的稱號可裝備。</p><div class="fa-progress"><i style="width:'+pct+'%"></i></div><div class="fa-list">'+ACH.map(a=>{
   const ok=p.unlocked.includes(a.id),v=Math.min(a.goal,Math.max(0,a.cur()));
   return '<div class="fa-item'+(ok?'':' locked')+'"><div class="fa-name">'+a.icon+' '+a.name+(ok?' ✓':' 🔒')+'</div><div class="fa-desc">'+a.desc+'</div><div class="fa-rank">稱號｜'+(ok?a.title:'？？？')+'</div><div class="fa-bar"><i style="width:'+(v/a.goal*100)+'%"></i></div><div class="fa-desc">'+v.toLocaleString('zh-TW')+' / '+a.goal.toLocaleString('zh-TW')+'</div>'+(ok?'<button type="button" data-title="'+a.id+'"'+(p.title===a.id?' disabled':'')+'>'+(p.title===a.id?'已裝備':'裝備稱號')+'</button>':'')+'</div>';
  }).join('')+'</div></div>';
  o.querySelector('.fa-close').onclick=close;
  o.querySelectorAll('button[data-title]').forEach(b=>b.onclick=()=>{const id=b.dataset.title;if(!p.unlocked.includes(id))return;p.title=id;p.manualTitle=true;save();paint();document.dispatchEvent(new Event('fack-title-changed'));});
 }
 paint();o.querySelector('.fa-close').focus();
}
window.FackTrophies={ACH,record,summary,title,open};
})();