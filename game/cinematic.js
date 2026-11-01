/* Original illustrated visual-novel CG and transition scene.
   All depicted people, spaces, and private interactions are fictional. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent=[
'#stage{isolation:isolate;background:#020915!important;border-color:#557488!important;box-shadow:0 26px 110px #000b!important}',
'#stage:after{background:radial-gradient(ellipse at 55% 31%,transparent 42%,#020814a9 100%)!important}',
'#art svg{filter:saturate(.91) contrast(1.07)}',
'#title{background:linear-gradient(0deg,#030b15f7 8%,#0b1825a6 56%,transparent 98%)!important}',
'#title h1{color:#fff0dc;text-shadow:0 4px 20px #000,0 0 42px #d7ac7655!important}',
'#chapterRibbon{letter-spacing:2px!important;background:#081c2ae5!important;border-color:#c1a77d80!important}',
'#panel{background:linear-gradient(0deg,#020b15 7%,#041320fa 41%,#071827b9 77%,transparent)!important}',
'#nm{background:linear-gradient(110deg,#26485a,#132937)!important;color:#f9e9d0!important;border:1px solid #8aafb6a0!important;border-radius:4px!important}',
'#tx{font-weight:440;letter-spacing:.35px}',
'.ch{background:linear-gradient(112deg,#234255e9,#102536ec)!important;border:1px solid #7a9bad!important;box-shadow:0 4px 18px #0005}',
'.ch:not(:disabled):hover,.ch:focus-visible{background:#315e73!important;border-color:#edc28c!important;color:#fff!important}',
'#cinematic-layer{position:absolute;inset:0;z-index:13;display:flex;align-items:end;justify-content:center;background:#030917f7;color:#f9eddd;overflow:hidden}',
'.cin-bg{position:absolute;inset:0}.cin-bg svg{width:100%;height:100%;animation:cinPush 13s ease-out both}',
'.cin-shade{position:absolute;inset:0;background:linear-gradient(0deg,#020612fa,#041321db 43%,#05112025 90%),linear-gradient(90deg,#180e1b94,transparent 75%)}',
'.cin-content{position:relative;z-index:1;width:100%;max-width:1100px;padding:clamp(20px,5vw,65px)}',
'.cin-kicker{font:12px ui-monospace,monospace;letter-spacing:3px;color:#f1b99b}',
'.cin-content h2{font:700 clamp(30px,5.7vw,67px) Georgia,serif;line-height:1.2;margin:13px 0;color:#fff1df;text-shadow:0 4px 20px #000}',
'.cin-content p{max-width:750px;font-size:clamp(14px,2vw,20px);line-height:1.9;color:#dce8ec}',
'.cin-buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}',
'.cin-buttons button{border:0;border-radius:5px;background:#f1d09a;color:#102338;padding:12px 23px;font-weight:700;cursor:pointer}',
'.cin-buttons button.alt{background:#20394c;color:#f7f4ea;border:1px solid #8297a4}',
'.cin-count{font:11px monospace;letter-spacing:2px;color:#a7bdc7;margin-top:10px}',
'.portraitCG{filter:contrast(1.09) saturate(.94)}',
'@keyframes cinPush{from{transform:scale(1.05)}to{transform:scale(1.17)}}',
'@media(max-width:650px){.cin-content{padding:20px 18px 50px}.cin-kicker{font-size:10px;letter-spacing:1px}}',
'@media(prefers-reduced-motion:reduce){.cin-bg svg{animation:none}}'
].join('');
document.head.append(style);

/* Hall: perspective, overhead lighting, podium and audience silhouettes. */
BG.hall=function(){
return G('#122d40','#050b14')
+'<defs><linearGradient id="hallWall" x1="0" x2="1"><stop stop-color="#19394e"/><stop offset=".55" stop-color="#2b4a5b"/><stop offset="1" stop-color="#071728"/></linearGradient><linearGradient id="hallFloor" x1=".2" x2=".8" y1="0" y2="1"><stop stop-color="#55717b"/><stop offset="1" stop-color="#091522"/></linearGradient><filter id="softHall"><feGaussianBlur stdDeviation="8"/></filter></defs>'
+'<path d="M0 0H800V308L415 240L0 307Z" fill="url(#hallWall)"/><path d="M0 450L245 232H560L800 450Z" fill="url(#hallFloor)"/>'
+'<path d="M0 0L245 232L0 449ZM800 0L558 232L800 449Z" fill="#10283b"/>'
+'<path d="M0 45L245 236M800 45L558 236M245 235L85 450M558 235L718 450" stroke="#5a8ba1" stroke-width="5" opacity=".35"/>'
+[0,1,2,3,4,5].map(i=>'<path d="M'+(20+i*146)+' 0L'+(200+i*66)+' 205" stroke="#a0b9ba" opacity=".18" stroke-width="3"/>').join('')
+'<rect x="260" y="42" width="280" height="168" rx="4" fill="#0a1927" stroke="#8db5bb" stroke-width="6"/>'
+'<rect x="273" y="56" width="255" height="136" fill="#e6e5da"/>'
+'<path d="M273 56H528V94H273Z" fill="#2a526e"/>'+T(400,81,'會員說明會',18,'#fff',700)+T(400,138,'會員討論後決定',23,'#16344a',700)
+'<rect x="296" y="156" width="202" height="6" fill="#c2cac5" rx="2"/><rect x="296" y="170" width="169" height="6" fill="#c2cac5" rx="2"/>'
+'<path d="M145 218H662L702 272H105Z" fill="#294454"/><rect x="115" y="262" width="575" height="30" fill="#0e2635"/>'
+[0,1,2,3,4,5,6,7].map(i=>{let x=50+i*101;return '<circle cx="'+x+'" cy="344" r="20" fill="#071824"/><path d="M'+(x-37)+' 450Q'+(x-34)+' 369 '+x+' 365Q'+(x+33)+' 369 '+(x+38)+' 450Z" fill="'+(i%2?'#132d40':'#0b2334')+'"/>';}).join('')
+'<ellipse cx="400" cy="58" rx="220" ry="70" fill="#e4e7da" opacity=".08" filter="url(#softHall)"/>';
};

/* Boardroom: nine fictional silhouettes; not portraiture of real people. */
BG.boardroom=function(){
return G('#0c1c2d','#02050c')
+'<defs><linearGradient id="cinBoardWindow" x1="0" x2="1"><stop stop-color="#091a31"/><stop offset=".5" stop-color="#18435d"/><stop offset="1" stop-color="#0a1525"/></linearGradient><linearGradient id="cinBoardTable" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#836452"/><stop offset=".6" stop-color="#4b363b"/><stop offset="1" stop-color="#120e1b"/></linearGradient><filter id="cinBoardBlur"><feGaussianBlur stdDeviation="12"/></filter></defs>'
+'<rect x="80" y="0" width="640" height="240" fill="url(#cinBoardWindow)"/>'
+'<path d="M80 200H720M240 0V240M400 0V240M560 0V240" stroke="#081523" stroke-width="10"/>'
+[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>R(107+i*48,158+(i%3)*5,19,35+(i%4)*12,'#16344a',1)).join('')
+[0,1,2,3,4,5,6,7,8].map(i=>{let x=73+i*81,y=217+(i%2?17:0);return '<g opacity=".86"><ellipse cx="'+x+'" cy="'+y+'" rx="15" ry="20" fill="#06131e"/><path d="M'+(x-30)+' '+(y+29)+'Q'+x+' '+(y+7)+' '+(x+30)+' '+(y+29)+'L'+(x+35)+' 297H'+(x-35)+'Z" fill="#0a1a29"/></g>';}).join('')
+'<path d="M0 302L160 244H648L800 304V450H0Z" fill="url(#cinBoardTable)" stroke="#977966" stroke-width="2"/>'
+'<path d="M0 320H800" stroke="#c69e77" opacity=".35" stroke-width="2"/>'
+'<path d="M280 275L504 275L532 314L263 314Z" fill="#eadbc4" stroke="#9e9384" stroke-width="2"/>'
+'<path d="M329 286H471M318 296H484M344 305H461" stroke="#8e9f9e" stroke-width="2" opacity=".7"/>'
+'<path d="M510 281L561 305" stroke="#111a24" stroke-width="6" stroke-linecap="round"/>'
+'<ellipse cx="400" cy="318" rx="190" ry="24" fill="#ea7f79" opacity=".08" filter="url(#cinBoardBlur)"/>';
};
S.c4a.b='boardroom';
/* A restrained illustrated-personnel-file effect on the existing fictional SVG busts. */
const sourcePortrait=portrait;
portrait=function(k){
 const p=sourcePortrait(k);
 return p.replace('<svg viewBox="0 0 120 140"','<svg class="portraitCG" viewBox="0 0 120 140"').replace('</svg>','<rect x="4" y="4" width="112" height="132" rx="3" stroke="#dfe5e1" fill="none" opacity=".21"/><path d="M4 22V4H22M98 136H116V118" stroke="#e9c48e" fill="none" stroke-width="2"/><circle cx="103" cy="16" r="3" fill="#e5b77e"/><text x="8" y="130" font-family="monospace" font-size="6" fill="#fff0d6" opacity=".75">PERSONNEL / FICTION</text></svg>');
};
/* Director's cut: 10/21 signing → 10/22 authorization puzzle. */
const slides=[
 ['OCT 21 / THE SIGNING','簽署之夜','小說場景裡，九個身影走出會議室。協議已經簽署，完整內容尚未交到一般會員手上。','boardroom'],
 ['OCT 22 / THE AUTHORIZATION','遲到的授權','你收到一份日期為 10/22 的會員授權紀錄。這是本作虛構文件；現實授權的日期、範圍與效力仍待查證。','hall'],
 ['INVESTIGATION / 021–022','日期，不是判決','要釐清的不是誰喊得比較大聲，而是原本的授權範圍、完整協議版本，以及每一步的實際程序。','boardroom']
];
window.playSigningCutscene=function(){
 if(!st||st.fl.includes('cinematicSeen')||document.querySelector('#cinematic-layer'))return;
 let index=0;const layer=document.createElement('div');layer.id='cinematic-layer';
 function close(){if(!st.fl.includes('cinematicSeen'))st.fl.push('cinematicSeen');save();layer.remove()}
 function draw(){
  const x=slides[index];
  layer.innerHTML='<div class="cin-bg"><svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">'+BG[x[3]]()+'</svg></div><div class="cin-shade"></div><div class="cin-content"><div class="cin-kicker">'+x[0]+'</div><h2>'+x[1]+'</h2><p>'+x[2]+'</p><div class="cin-count">SCENE '+(index+1)+' / 3 • 虛構故事演出</div><div class="cin-buttons"><button id="cin-next">'+(index===2?'開始調查':'下一幕 →')+'</button><button class="alt" id="cin-skip">略過過場</button></div></div>';
  layer.querySelector('#cin-next').onclick=function(){index++;if(index===slides.length)close();else draw()};
  layer.querySelector('#cin-skip').onclick=close;
 }
 document.querySelector('#stage').append(layer);draw();
};
const title=document.querySelector('#title');
if(title){const t=document.createElement('p');t.style.cssText='font:12px ui-monospace,monospace;color:#f1c993;letter-spacing:1px';t.textContent='ORIGINAL CG CUTSCENES / 10.21 → 10.22';title.append(t)}
})();