/* 全民找法克・擴充資料層（冒險模式／每日挑戰／擴充成就）
   ─ 只讀寫自己的 localStorage Key：fack.expansion.v1（以及備份用的 fack.expansion.v1.* 子 Key）。
   ─ 絕對不寫入、不刪除經典模式的 Key（fack-chase-live-v2-best、fack-chase-live-v2-trophies、
     fack-live-v2-level、fack-chase-live-record-version、fack-mute）。
   ─ 讀取失敗或資料損毀時，原始字串會先備份，再以安全的預設值繼續，不會清空任何資料。 */
(function(){
'use strict';
const KEY='fack.expansion.v1',SCHEMA=1;
const CLASSIC_KEYS=['fack-chase-live-v2-best','fack-chase-live-v2-trophies','fack-live-v2-level','fack-chase-live-record-version','fack-mute','fack-chase-best2','fack-chase-trophies-v1'];
const CLASSIC_JSON_KEYS=['fack-chase-live-v2-best','fack-chase-live-v2-trophies'];
let ls=null;try{ls=window.localStorage;ls.getItem(KEY);}catch(e){ls=null;}
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function get(k){try{return ls?ls.getItem(k):null;}catch(e){return null;}}
function set(k,v){try{if(!ls)return false;ls.setItem(k,v);return true;}catch(e){return false;}}

function blank(){return {
 schema:SCHEMA,created:Date.now(),updated:0,
 adventure:{unlocked:1,diff:'normal',run:null,stages:{},diffClears:{easy:0,normal:0,hard:0,hell:0},runsStarted:0,runsCleared:0},
 stats:{itemsUsed:{},buffsPicked:{},clonesPopped:0,hidden:{},shortcut:0,bossClears:0,bossFlawless:0,escortPerfect:0,lastSecond:0,dailyClears:0},
 ach:{},title:null,daily:{},tutorial:{}
};}
// 深層合併：保留未知欄位（例如未來版本新增的資料），型別不符時採用預設值。
function merge(base,v){
 if(!isObj(v))return base;
 const out=Object.assign({},v);
 Object.keys(base).forEach(k=>{
  const b=base[k],x=v[k];
  if(isObj(b))out[k]=merge(b,x);
  else if(b===null)out[k]=x===undefined?null:x;
  else if(typeof b!==typeof x)out[k]=b;
 });
 return out;
}
// 版本遷移：每一步只「加」欄位或轉換格式，絕不刪除玩家成績。
const MIGRATIONS={
 // 0 → 1：沒有 schema 欄位的早期測試資料。
 0:d=>{d.schema=1;return d;}
};
function migrate(v){
 let d=Object.assign({},v),from=Number.isInteger(d.schema)?d.schema:0;
 while(from<SCHEMA&&MIGRATIONS[from]){d=MIGRATIONS[from](d);from=d.schema;}
 // 比目前程式更新的資料（例如玩家先玩過更新版再回到舊快取）：照常讀取，但保留 schema 數字與未知欄位。
 const out=merge(blank(),d);out.schema=Math.max(SCHEMA,Number.isInteger(v.schema)?v.schema:0);
 return out;
}
function backupRaw(tag,raw){
 // 每種備份最多保留 3 份；相同內容不重複備份。
 const listKey=KEY+'.backups',list=(()=>{try{const x=JSON.parse(get(listKey)||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}})();
 if(list.some(b=>b.tag===tag&&get(b.key)===raw))return;
 const key=KEY+'.'+tag+'.'+Date.now();
 if(!set(key,raw))return;
 list.push({tag,key,at:Date.now()});
 const same=list.filter(b=>b.tag===tag);
 while(same.length>3){const old=same.shift();try{ls.removeItem(old.key);}catch(e){}list.splice(list.indexOf(old),1);}
 set(listKey,JSON.stringify(list));
}
let data=blank(),status='new',memoryOnly=!ls;
(function load(){
 const raw=get(KEY);
 if(raw==null){status='new';return;}
 try{
  const v=JSON.parse(raw);
  if(!isObj(v))throw new Error('not object');
  data=migrate(v);status='loaded';
 }catch(e){
  // 損毀資料：先完整備份原始字串，再使用預設值；原始 Key 會在下一次存檔時才被覆寫。
  backupRaw('corrupt',raw);data=blank();status='recovered';
 }
})();
// 經典模式紀錄安全網：只「讀取」並備份，不修改原 Key。
// 若經典紀錄字串損毀，經典成就模組會用空白資料覆寫，所以在它載入前先把原始字串另外保存。
(function guardClassic(){
 CLASSIC_JSON_KEYS.forEach(k=>{const raw=get(k);if(raw==null)return;try{JSON.parse(raw);}catch(e){backupRaw('classic-corrupt-'+k,raw);}});
 const snap={};let any=false;CLASSIC_KEYS.forEach(k=>{const v=get(k);if(v!=null){snap[k]=v;any=true;}});
 if(!any)return;
 if(get(KEY+'.classic-first')==null)set(KEY+'.classic-first',JSON.stringify({at:Date.now(),keys:snap}));
 set(KEY+'.classic-latest',JSON.stringify({at:Date.now(),keys:snap}));
})();
let saveTimer=0;
function save(){
 data.updated=Date.now();
 const ok=set(KEY,JSON.stringify(data));
 memoryOnly=!ok;return ok;
}
function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(save,60);}
// 台灣時間（UTC+8，無日光節約）的日期字串，用於每日挑戰。
function twDate(now){const d=new Date((now==null?Date.now():now)+8*3600e3);return d.toISOString().slice(0,10);}
function hash(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed>>>0;return function(){a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// 每日紀錄只保留最近 45 天，避免資料無限成長（只刪除擴充自己的舊每日資料）。
function pruneDaily(today){const keys=Object.keys(data.daily).sort();const cut=twDate(Date.parse(today+'T00:00:00+08:00')-45*864e5);keys.forEach(k=>{if(k<cut)delete data.daily[k];});}
window.FackExpStore={
 KEY,SCHEMA,CLASSIC_KEYS,
 get data(){return data;},
 get status(){return status;},
 get memoryOnly(){return memoryOnly;},
 save,saveSoon,blank,migrate,twDate,hash,rng,pruneDaily
};
})();
