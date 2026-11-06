/* 全民找法克・永久裝備（15 種，一次只能裝備一種）
   ─ 效果只作用在「冒險模式」（含單關挑戰）；經典模式與每日挑戰不受影響，經典成績與排行仍然公平。
   ─ 取得條件會「唯讀」經典紀錄（fack-chase-live-v2-trophies／fack-chase-live-v2-best），從不寫入經典 Key。
   ─ 取得狀態存在 fack.expansion.v1 的 gear 欄位；一旦取得就永久保留。 */
(function(){
'use strict';
const A=window.FackAdv,S=window.FackExpStore,D=()=>S.data;
function readJSON(k){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v&&typeof v==='object'?v:{};}catch(e){return {};}}
const C=()=>readJSON('fack-chase-live-v2-trophies');          // 經典成就進度（唯讀）
const B=()=>readJSON('fack-chase-live-v2-best');              // 經典各難度最佳秒數（唯讀）
const n=v=>Number(v)||0;
const st=()=>D().stats;
const atLeast=['normal','hard','hell'];
const sumBy=(o,keys)=>keys.reduce((s,k)=>s+n(o&&o[k]),0);
const stageBy=(field,stage,keys)=>sumBy((st()[field]||{})[stage],keys);
const bestTime=(stage,keys)=>{const o=(st().bestTimeBy||{})[stage]||{};const xs=keys.map(k=>o[k]).filter(v=>v>0);return xs.length?Math.min(...xs):null;};
const achGot=id=>!!D().ach[id];
// 條件：cur 回傳目前值；low=true 代表「越低越好」（例如秒數）
const req=(label,goal,cur,o)=>Object.assign({label,goal,cur},o||{});
const GEAR=[
 {id:'cap',icon:'🧢',name:'集合區小帽',tier:1,effect:'連署書撿取範圍 +15',fx:{pick:15},
  reqs:[req('經典模式累積收集連署書',10000,()=>n(C().papers))]},
 {id:'sneakers',icon:'👟',name:'輕量跑鞋',tier:1,effect:'跑速 +3%',fx:{speed:.03},
  reqs:[req('經典模式累積勝利',10,()=>n(C().wins))]},
 {id:'torch',icon:'🔦',name:'強光手電筒',tier:2,effect:'「深夜追蹤」手電筒耗電 −20%',fx:{battery:.8},
  reqs:[req('「深夜追蹤」以中等以上難度無傷通關',1,()=>stageBy('noDmgBy','night',atLeast))]},
 {id:'insoles',icon:'⚡',name:'極速鞋墊',tier:2,effect:'⚡ 疾速鞋效果時間 ×1.5',fx:{speedDur:1.5},
  reqs:[req('經典模式累積使用疾速鞋',100,()=>n((C().powerTypes||{}).speed))]},
 {id:'iceclip',icon:'🧊',name:'冰霜貼紙夾',tier:2,effect:'定身效果時間 +15%',fx:{freeze:.15},
  reqs:[req('經典模式「趁定身時追上法克」次數',10,()=>n(C().freezeWins))]},
 {id:'clipboard',icon:'📋',name:'連署書夾板',tier:2,effect:'冒險連署書得分 +10%',fx:{paper:.1},
  reqs:[req('經典模式單局最高連擊（5 秒內連撿）',10,()=>n(C().maxCombo))]},
 {id:'glasses',icon:'🕶️',name:'識破墨鏡',tier:2,effect:'Boss 分身頭上會出現「？」',fx:{cloneMark:true},
  reqs:[req('Boss 戰累積戳破假分身',30,()=>n(st().clonesPopped))]},
 {id:'glove',icon:'🧤',name:'強力磁鐵手套',tier:3,effect:'磁鐵吸附範圍 ×1.5（吸紙磁鐵與連署磁鐵 Buff）',fx:{magnetMul:1.5},
  reqs:[req('經典模式累積收集連署書',100000,()=>n(C().papers))]},
 {id:'headset',icon:'🎧',name:'情報耳機',tier:3,effect:'每 25 秒自動雷達掃描 3 秒',fx:{radar:25},
  reqs:[req('找到四個冒險關卡的全部隱藏線索',4,()=>A.STAGES.filter(s=>D().stats.hidden[s.id]).length)]},
 {id:'wheels',icon:'🛞',name:'靜音推車輪',tier:3,effect:'護送推車速度與等待距離 +15%',fx:{cart:.15},
  reqs:[req('「連署書保衛戰」以難或地獄難度 10 箱全數送達',1,()=>sumBy(st().escortPerfectBy,['hard','hell']))]},
 {id:'watch',icon:'⌚',name:'加班手錶',tier:4,effect:'每關可用時間 +8%',fx:{time:.08},
  reqs:[req('經典模式累積收集連署書',200000,()=>n(C().papers))]},
 {id:'bento',icon:'🍱',name:'愛心便當袋',tier:4,effect:'愛心上限 +1',fx:{hearts:1},
  reqs:[req('經典模式累積勝利',50,()=>n(C().wins)),req('用四種難度各打倒一次最終 Boss',4,()=>['easy','normal','hard','hell'].filter(k=>n(((st().clearBy||{}).boss||{})[k])>0).length)]},
 {id:'vest',icon:'🦺',name:'防糖背心',tier:5,effect:'每關自動抵擋 1 次傷害',fx:{shield:1},
  reqs:[req('以中等以上難度完成整趟冒險（四關）且完全沒被攻擊',1,()=>sumBy(st().flawlessRuns,atLeast))]},
 {id:'hellshoes',icon:'🥾',name:'地獄跑鞋',tier:5,effect:'跑速 +5%',fx:{speed:.05},
  reqs:[req('經典模式地獄難度通關秒數',20,()=>{const b=B().hell;return b&&b.used?b.used:null;},{low:true,unit:'秒'}),
        req('冒險 Boss 關卡（中等以上）通關秒數',30,()=>bestTime('boss',atLeast),{low:true,unit:'秒'})]},
 {id:'badge',icon:'🏅',name:'會長金徽章',tier:5,effect:'跑速 +3%、撿取範圍 +20、道具時間 +15%',fx:{speed:.03,pick:20,itemDur:.15},
  reqs:[req('經典模式累積收集連署書',300000,()=>n(C().papers)),req('達成「傳說追擊者」',1,()=>achGot('legend')?1:0)]}
];
const DEFAULT_FX={speed:0,pick:0,magnetMul:1,speedDur:1,freeze:0,itemDur:0,time:0,shield:0,hearts:0,radar:0,battery:1,cart:0,paper:0,cloneMark:false};
function gearData(){const d=D();if(!d.gear||typeof d.gear!=='object')d.gear={equipped:null,unlocked:{}};if(!d.gear.unlocked||typeof d.gear.unlocked!=='object')d.gear.unlocked={};return d.gear;}
function reqDone(r){const v=r.cur();return r.low?(v!=null&&v<=r.goal):n(v)>=r.goal;}
function done(gr){return gr.reqs.every(reqDone);}
// 依目前紀錄解鎖新裝備（不會收回已取得的裝備）
function check(){const gd=gearData(),fresh=[];GEAR.forEach(gr=>{if(!gd.unlocked[gr.id]&&done(gr)){gd.unlocked[gr.id]=Date.now();fresh.push(gr);}});return fresh;}
function equipped(){const gd=gearData(),id=gd.equipped;return id&&gd.unlocked[id]?GEAR.find(x=>x.id===id)||null:null;}
function equip(id){const gd=gearData();if(id===null){gd.equipped=null;S.save();return true;}if(!gd.unlocked[id])return false;gd.equipped=id;S.save();return true;}
function fx(id){const gr=GEAR.find(x=>x.id===id);return Object.assign({},DEFAULT_FX,gr?gr.fx:{});}
A.GEAR=GEAR;A.gear={check,equipped,equip,fx,done,reqDone,gearData,DEFAULT_FX};
})();
