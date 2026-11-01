/* Director's Cut: original SVG environments, discovered scenes, nonrepeating NPC interactions. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent='#areaBar{margin:0 8px 8px;padding:9px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid #55778a;border-left:3px solid #ebc187;background:#173244;color:#e7eef2;border-radius:8px;font-size:12px}#areaBar b{color:#f3d6a8;font-size:14px}#areaBar button{margin-left:auto;background:#2a4c5d;color:#fff;border:1px solid #7b9bad;border-radius:6px;padding:7px 12px;cursor:pointer}#areaTag{position:absolute;top:44px;right:12px;z-index:3;font:10px monospace;background:#071826cf;color:#f1d2a1;border:1px solid #6993a5;padding:7px;pointer-events:none}.hs.met-npc{background:#163c35!important;border-color:#80b6a1!important;animation:none!important;opacity:.72;cursor:not-allowed}.atlas-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.atlas-item{border:1px solid #557286;border-radius:8px;background:#243f50;padding:10px}.atlas-item.seen{border-color:#86bba6;background:#21423d}.atlas-item b{display:block;font-size:13px;color:#f0d7b4}.atlas-item small{font-size:11px;color:#bdd0d6}.atlas-heading{color:#e7c798;border-bottom:1px solid #58758a;padding:12px 0 6px}.ch-card{display:block;color:#d3e9ec;font-size:12px}@media(max-width:650px){#areaBar{padding:6px;gap:4px;font-size:11px}#areaBar b{font-size:12px}#areaBar button{padding:5px;font-size:11px}#stage{height:calc(100dvh - 365px)!important;min-height:380px!important}#areaTag{font-size:9px;top:37px}.atlas-list{gap:5px}.atlas-item{padding:7px}.atlas-item b{font-size:11px}}';
document.head.append(style);
const area=document.createElement('div');area.id='areaBar';area.innerHTML='<span>◉ CURRENT LOCATION</span><b id="areaName">尚未開始</b><span id="areaState">○ 未探索</span><button type="button" id="areaMap">☰ 場景地圖</button>';
(document.querySelector('#optools')||document.querySelector('#ops')).after(area);
const areaTag=document.createElement('div');areaTag.id='areaTag';areaTag.textContent='AREA / UNKNOWN';document.querySelector('#stage').append(areaTag);
const areas={
7:{lounge:'夜班休息室',locker:'離職員工置物櫃',chairs:'班別聯絡小組'},
1:{seat:'大會會場・座位區',aisle:'大會會場・走道',desk:'大會會場・服務台',door:'大會會場・門口'},
2:{corr:'廠區走廊',hall:'人資說明會',docs:'文件核對桌'},
3:{rest:'廠區夜班休息室',board:'公告欄',office:'工會辦公室',gate:'會議室門口',hall:'公開核對會'},
4:{boardroom:'10/21 私下簽署（小說）',stage:'10/22 說明會・台前',left:'10/22 說明會・左側',back:'10/22 說明會・後排',exit:'10/22 說明會・門口'},
5:{plan:'跨廠協作辦公室',night:'夜班聯絡點',day:'日班交接處',other:'另一廠區'},
6:{table:'協商室',floor:'會員表決會場'},
8:{pay:'薪資文件核對處',dawn:'終章・清晨'}
};
function ensure(){
if(typeof st==='undefined'||!st||!Array.isArray(st.ev))return null;
if(!Array.isArray(st.areaVisits))st.areaVisits=[];
if(!st.talkVisits||typeof st.talkVisits!=='object')st.talkVisits={};
return st;
}
function location(){
const s=ensure();if(!s||!cur)return null;
const ch=s.ch||1,b=cur.b||'corr',sc=s.sc;
let key;
if(cur.qs&&[1,3,4,6].includes(ch)&&areas[ch][sc])key=sc;
else if(cur.qs&&ch===5)key='plan';
else key=ch===7&&b==='chairs2'?'chairs':ch===5&&b==='desk'?'plan':ch===8&&b!=='dawn'?'pay':b;
return {id:ch+':'+key,label:areas[ch]?.[key]||({'lounge':'夜班休息室','sign':'簽署室','desk':'工會辦公室','corr':'廠區走廊','hall':'大會會場','night':'夜班廠區','door':'會議室門口','vote':'表決現場'})[b]||'調查現場'};
}
function refreshArea(){
const s=ensure(),p=location();if(!s||!p)return;
if(!s.areaVisits.includes(p.id))s.areaVisits.push(p.id);
document.querySelector('#areaName').textContent=p.label;
document.querySelector('#areaState').textContent='✓ 已抵達';
areaTag.textContent='AREA / '+p.label;save();
}
document.querySelector('#areaMap').onclick=function(){
const s=ensure();if(!s)return;
let html='<h3>◈ 場景地圖</h3><p class="ch-card">已探索 '+s.areaVisits.length+' 處｜已完成 '+Object.keys(s.talkVisits).length+' 段互動。✓ 表示去過或交談過；有新台詞才能再次對話。</p>';
Object.keys(areas).forEach(ch=>{
html+='<h4 class="atlas-heading">'+(ch==='7'?'序章':ch==='8'?'終章':'第'+ch+'章')+'</h4><div class="atlas-list">';
Object.entries(areas[ch]).forEach(([key,name])=>{
const seen=s.areaVisits.includes(ch+':'+key);
const delegated=ch==='5'&&s.a5&&s.a5[key];
html+='<div class="atlas-item '+(seen||delegated?'seen':'')+'"><b>'+(seen?'✓ 已探索':delegated?'✓ 已安排':'○ 未到訪')+'　'+name+'</b><small>'+(seen?'已實際到訪':delegated?'已交給同伴負責':'隨劇情解鎖，不提供跳關')+'</small></div>';
});
html+='</div>';
});
modal(html);
};
function fingerprint(id){
const s=ensure();if(!s||!QN[id])return '';
try{
const n=QN[id](s),choices=typeof n.c==='function'?n.c(s):n.c||[];
return s.ch+'|'+id+'|'+String(typeof n.t==='function'?n.t(s):n.t||'').slice(0,240)+'|'+choices.map(x=>x.t).join(',').slice(0,320);
}catch(e){return s.ch+'|'+id;}
}
const originalPick=pick;
pick=function(o){
const s=ensure(),id=o&&o.visitId;
if(s&&id){const fp=fingerprint(id);if(fp)s.talkVisits[fp]=true;}
originalPick(o);
if(s){refreshArea();save();}
};
const originalHotspots=qhs;
qhs=function(){
originalHotspots();
const s=ensure(),root=document.querySelector('#hsl');
if(!s||!root||!cur?.qs)return;
const actions=qActs(),buttons=[...root.querySelectorAll('button.hs')];
buttons.forEach((b,i)=>{
const a=actions[i];if(!a)return;
if(a.visitId){
const fp=fingerprint(a.visitId);
if(s.talkVisits[fp]){b.textContent='✓ '+a.t+'（已交談）';b.disabled=true;b.classList.add('met-npc');}
else if(Object.keys(s.talkVisits).some(k=>k.split('|')[1]===a.visitId))b.textContent='✦ '+a.t+'（新對話）';
}else if(a.moveTo&&s.areaVisits.includes(s.ch+':'+a.moveTo))b.textContent='✓ '+a.t+'（已去過）';
});
};
const originalShow=show;
show=function(id){originalShow(id);refreshArea();};
BG.lounge=function(){return G('#213b51','#0c1929')+R(0,0,800,342,'#294457')+R(0,342,800,108,'#142636')+
[0,1,2,3,4,5,6,7].map(i=>R(17+i*98,60,85,260,'#3b596b',4)+R(27+i*98,74,66,164,'#1a2f40',3)+R(48+i*98,247,30,5,'#9fb0b8',2)).join('')+
R(432,278,348,18,'#a48a74')+R(461,297,12,80,'#324655')+R(739,297,12,80,'#324655')+R(490,245,75,32,'#e5e7df',6)+R(585,251,59,23,'#e6e0d5',4)+R(630,24,154,43,'#0c2539',4)+T(707,52,'02:17 / NIGHT',18,'#a1e5d0',700);};
BG.corr=function(){return G('#285067','#091827')+'<path d="M0 0H800L552 240H248Z" fill="#2a5469"/><path d="M0 0L248 240L0 450Z" fill="#16394d"/><path d="M800 0L552 240L800 450Z" fill="#103147"/><path d="M248 240H552L800 450H0Z" fill="#305569"/>'+
R(339,74,122,169,'#102c3d')+R(361,99,80,115,'#0b1d2b')+[0,1,2,3].map(i=>'<path d="M'+(i*75)+' 450L'+(248+i*20)+' 240M'+(800-i*75)+' 450L'+(552-i*20)+' 240" stroke="#9ebfc7" opacity=".18" stroke-width="3"/>').join('')+
R(27,53,207,57,'#183e51')+T(130,80,'FAB / HALLWAY',16,'#d4e4e6',700)+T(130,101,'廠區日班・夜班',14,'#e9d1a9',600)+
R(569,86,195,127,'#18394d')+T(667,134,'DAY SHIFT',21,'#cfebd9',700)+T(667,177,'NIGHT SHIFT',20,'#eccb98',700);};
BG.desk=function(){return G('#223a4c','#0e1b2b')+R(45,35,709,239,'#304e60',5)+R(65,55,671,199,'#1a3445')+
[0,1,2,3].map(i=>R(83+i*164,79,128,147,'#2b5265',3)+[0,1,2,3].map(j=>R(97+i*164,96+j*27,88-(j%2)*14,5,'#b3c3c4',2,.52)).join('')).join('')+
'<path d="M0 277H800V450H0Z" fill="#45342f"/><path d="M36 277H762L800 360H0Z" fill="#735340"/>'+
[0,1,2,3,4].map(i=>'<g transform="translate('+(77+i*149)+' '+(289-(i%2)*16)+')"><rect width="108" height="69" fill="#e6decb"/><path d="M12 19H94M12 34H82M12 48H89" stroke="#a2b3b2" stroke-width="3"/></g>').join('')+
R(249,131,302,42,'#102c3e')+T(400,161,'工會辦公室 / RECORDS',18,'#f0debb',700);};
const oldAuth=S.c4auth.c;
S.c4auth.c=function(s){return oldAuth(s).map(o=>o.g==='c4b'?Object.assign({},o,{g:'c4shadow'}):o);};
S.c4shadow={b:'boardroom',sp:'旁白',t:s=>s.fl.includes('secret2')?'【虛構懸疑支線】你看見糖果、法克與公司幕僚高興的文件修訂時間高度一致。他們在小說裡協調過說詞，真正的協議授權範圍仍待調查。':'【虛構懸疑支線】你找到兩份相同措辭的回覆：一份來自糖果與法克，另一份來自公司窗口。這是否代表有更深的合作？你需要保留原件。',
c:[{t:'把修訂紀錄留作證物，前往隔日說明會',g:'c4b',fx:{sup:1,flag:'shadow_record'}},{t:'保護來源，整理授權疑點再前往會場',g:'c4b',fx:{trust:1,flag:'shadow_protect'}}]};
if(S.win)S.win.c=[{t:'進入已發生的 10/21 簽署',g:'c4a'},{t:'查看證據筆記',g:'NB'}];
})();