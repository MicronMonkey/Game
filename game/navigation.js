/* Exploration UI: persistent visited places / NPC conversations; no scene teleport or bypass. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent=[
'#locbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;margin:0 8px 9px;background:linear-gradient(100deg,#162f42,#152431);border:1px solid #537689;border-left:3px solid #e3bb7b;border-radius:7px;color:#f2e2c7;font-size:12px}',
'#locbar b{font-size:15px;color:#f9e8c9}#locbar .ls{font:10px monospace;letter-spacing:1px;color:#a8cad7}#locbar button{margin-left:auto;background:#203e50;color:#f6eacb;border:1px solid #8faab6;border-radius:5px;padding:7px 12px;cursor:pointer}',
'#hsl .hs.done,#hsl .hs:disabled{opacity:.65!important;background:#1b3d38!important;color:#b8eddf!important;border-color:#8fb2a2!important;animation:none!important;cursor:not-allowed}#hsl .hs.newdialog{border-color:#d8b987!important}',
'#stage-place{position:absolute;right:14px;top:14px;z-index:3;padding:6px 10px;border-radius:3px;background:#061828c9;border:1px solid #80aab47d;color:#e8c99d;font:11px monospace;pointer-events:none}',
'.map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}.map-site{background:#20394a;border:1px solid #536b7b;padding:11px;border-radius:8px}.map-site.done{background:#20423e;border-color:#8ac7aa}.map-site b{display:block}.map-site small{font-size:11px;display:block;color:#bed0da;margin-top:5px}.map-site .mark{font-size:11px;color:#afc9d2}.map-site.done .mark{color:#a3e6c5}.map-section{color:#efc991;border-bottom:1px solid #506e7d;margin-top:15px;padding:5px;font-size:14px}',
'#flash-chapter{position:absolute;inset:0;z-index:9;pointer-events:none;background:linear-gradient(#081622e8,#102f40e6);display:flex;justify-content:center;align-items:center;text-align:center;animation:flashcut 1.5s ease-out forwards}#flash-chapter h2{font:700 clamp(25px,5vw,50px) Georgia,serif;color:#f4dfbd}#flash-chapter small{font:12px monospace;color:#b8d1d8;letter-spacing:3px}',
'@keyframes flashcut{0%{opacity:0}15%{opacity:1}70%{opacity:1}100%{opacity:0}}',
'@media(max-width:650px){#locbar{margin-bottom:5px;gap:5px;padding:7px;font-size:11px}#locbar b{font-size:12px}#locbar button{font-size:11px;padding:5px}#stage-place{top:38px;font-size:9px;right:8px}.map-grid{gap:5px}.map-site{padding:7px}.map-site b{font-size:12px}.map-site small{font-size:10px}#stage{height:calc(100dvh - 370px)!important;min-height:395px!important}}',
'@media(prefers-reduced-motion:reduce){#flash-chapter{animation:none}}'
].join('');
document.head.append(style);
const bar=document.createElement('div');bar.id='locbar';
bar.innerHTML='<span class="ls">LOCATION /</span><b id="where-now">尚未開始</b><span id="where-status">○ 尚未探索</span><button id="map-button">☰ 場景地圖</button>';
(document.querySelector('#optools')||document.querySelector('#ops')).after(bar);
const tag=document.createElement('div');tag.id='stage-place';tag.textContent='AREA / —';document.querySelector('#stage').append(tag);
const atlas=[
[7,[['lounge','廠區夜班休息室'],['locker','離職員工置物區'],['chairs','班別聯絡小組']]],
[1,[['seat','大會會場・座位區'],['aisle','大會會場・側邊走道'],['desk','大會會場・服務台'],['door','大會會場・門口']]],
[2,[['corr','廠區通道'],['hall','人資說明會'],['docs','文件比對桌']]],
[3,[['rest','廠區夜班休息室'],['board','公告欄'],['office','工會辦公室'],['gate','會議室門口'],['hall','公開核對會']]],
[4,[['boardroom','10/21 私下簽署現場（小說）'],['stage','10/22 說明會・台前'],['left','說明會・左側'],['back','說明會・後排'],['exit','說明會・出口']]],
[5,[['plan','跨廠協作辦公室'],['night','夜班工作區'],['day','日班交接處'],['other','另一個廠區'],['drill','11/3 疏散演練集合區']]],
[6,[['table','協商會議室'],['floor','會員表決現場']]],
[8,[['pay','薪資核對處'],['dawn','結局・清晨']]]
];
const fallback={hall:'大會會場',corr:'廠區通道',docs:'文件核對桌',lounge:'夜班休息室',locker:'員工置物區',chairs:'班別聯絡小組',chairs2:'班別聯絡小組',night:'廠區夜班',dawn:'清晨廠區',door:'會場門口',desk:'工會辦公室',boardroom:'私下簽署現場',sign:'協商桌',vote:'會員表決現場',pay:'薪資核對處',pay1:'薪資核對處',pay0:'薪資核對處',drill:'疏散演練集合區'};
function state(){return typeof st==='object'&&st&&Array.isArray(st.ev)?st:null}
function init(){
 const s=state();if(!s)return null;
 if(!Array.isArray(s.visitedAreas))s.visitedAreas=[];
 if(!s.visitedTalks||typeof s.visitedTalks!=='object')s.visitedTalks={};
 return s;
}
function scene(){
 const s=state();if(!s||!cur)return null;
 const ch=s.ch||1,sc=s.sc,bg=cur.b||'corr';
 const scUsed=cur.qs||cur===S.qd;
 let p;
 if(ch===1&&['seat','aisle','desk','door'].includes(sc))p=sc;
 else if(ch===3&&scUsed&&['rest','board','office','gate'].includes(sc))p=sc;
 else if(ch===4&&scUsed&&['stage','left','back','exit'].includes(sc))p=sc;
 else if(ch===5&&cur.qs)p='plan';
 else if(ch===6&&scUsed&&['floor','table'].includes(sc))p=sc;
 else if(ch===7)p=bg==='chairs2'?'chairs':bg;
 else if(ch===4&&bg==='boardroom')p='boardroom';
 else if(ch===5)p=bg==='desk'?'plan':bg==='night'?'night':bg==='dayShift'?'day':bg==='otherFab'?'other':bg;
 else if(ch===8)p=bg==='dawn'?'dawn':'pay';
 else p=bg;
 const matches=(atlas.find(x=>x[0]===ch)||[0,[]])[1];
 const mapped=matches.find(x=>x[0]===p);
 return {key:ch+':'+p,label:mapped?mapped[1]:fallback[bg]||'調查現場'};
}
function decorate(){
 const s=init(),a=scene();if(!s||!a)return;
 if(!s.visitedAreas.includes(a.key))s.visitedAreas.push(a.key);
 document.querySelector('#where-now').textContent=a.label;
 document.querySelector('#where-status').textContent='✓ 已抵達';
 document.querySelector('#stage-place').textContent='AREA / '+a.label;
 for(let i=0;i<4;i++){const m=document.querySelector('#om'+i),v=document.querySelector('#ov'+i);if(m&&v){m.setAttribute('role','progressbar');m.setAttribute('aria-label',['信任度','支持度','證據完整度','曝光風險'][i]);m.setAttribute('aria-valuemin','0');m.setAttribute('aria-valuemax','5');m.setAttribute('aria-valuenow',v.textContent.split('/')[0])}}
 save();
}
function map(){
 const s=init();if(!s)return;
 const total=atlas.reduce((a,x)=>a+x[1].length,0);
 let html='<h3>◈ 廠區探索地圖</h3><p style="font-size:13px;color:#b8cfdb">已造訪 '+s.visitedAreas.filter(x=>atlas.some(a=>a[1].some(p=>a[0]+':'+p[0]===x))).length+' / '+total+' 個場景 · 已認識 '+(s.met||[]).length+' 人 · 已完成 '+Object.keys(s.visitedTalks).length+' 次對話</p>';
 html+='<p style="font-size:12px;color:#b6d0d8">去過的地方會標記 ✓；同一人物若沒有新對話，原熱點會顯示「已交談」且無法重複點擊。移動按鈕仍可使用，不會直接跳章。</p>';
 atlas.forEach(a=>{
 const name=a[0]===7?'序章':a[0]===8?'終章':'第 '+a[0]+' 章';
 html+='<div class="map-section">'+name+'</div><div class="map-grid">'+a[1].map(p=>{const ok=s.visitedAreas.includes(a[0]+':'+p[0]);return '<div class="map-site '+(ok?'done':'')+'"><span class="mark">'+(ok?'✓ 已去過':'○ 未探索')+'</span><b>'+p[1]+'</b><small>'+(ok?'可由劇情中的移動箭頭返回':'跟隨章節進度開啟')+'</small></div>'}).join('')+'</div>';
 });
 modal(html);
}
document.querySelector('#map-button').onclick=map;
function fingerprint(id){
 const s=state();if(!s||!QN[id])return null;
 try{const n=QN[id](s),t=typeof n.t==='function'?n.t(s):n.t,c=typeof n.c==='function'?n.c(s):n.c||[];
 return s.ch+'|'+id+'|'+String(t).slice(0,350)+'|'+c.map(x=>x.t).join('|').slice(0,460);}
 catch(e){return s.ch+'|'+id}
}
const oldPick=pick;
pick=function(o){
 const s=init(),key=o&&o.visitId?fingerprint(o.visitId):null;
 if(s&&key)s.visitedTalks[key]=true;
 oldPick(o);
 if(s){save();decorate()}
};
const oldQhs=qhs;
qhs=function(){
 oldQhs();
 const root=document.querySelector('#hsl'),s=init();if(!root||!s)return;
 const actions=qActs(),buttons=root.querySelectorAll('button.hs');
 buttons.forEach((b,i)=>{const a=actions[i];if(!a)return;
 if(a.visitId){const key=fingerprint(a.visitId),seen=s.visitedTalks[key],was=Object.keys(s.visitedTalks).some(k=>k.split('|')[1]===a.visitId);
 if(seen){b.disabled=true;b.textContent='✓ 已交談 '+a.t;b.classList.add('done');b.setAttribute('aria-label',a.t+'已交談，無新內容')}
 else if(was){b.textContent='✦ 新對話 '+a.t;b.classList.add('newdialog')}}
 else if(a.moveTo&&s.visitedAreas.includes(s.ch+':'+a.moveTo)){b.textContent='✓ '+a.t+'（已去過）'}
 });
};
const oldShow=show;let lastChapter=null;
show=function(id){
 oldShow(id);const s=init();if(!s)return;
 decorate();
 if(lastChapter===null){lastChapter=s.ch;return}
 if(lastChapter!==s.ch){lastChapter=s.ch;
 if(id!=='c4a'&&id!=='failedCase'){
 const old=document.querySelector('#flash-chapter');if(old)old.remove();
 const f=document.createElement('div');f.id='flash-chapter';f.innerHTML='<div><small>THE SILICON SILENCE</small><h2>'+(s.ch===7?'序章':s.ch===8?'終章':'第 '+s.ch+' 章')+' · '+CT[s.ch]+'</h2><small>新的調查場所已開放</small></div>';
 document.querySelector('#stage').append(f);setTimeout(()=>f.remove(),1550)
 }
 }
};
})();
