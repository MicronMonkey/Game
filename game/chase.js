/* 「全民找法克」追逐小遊戲引擎（主遊戲第 5 章與獨立頁 fack.html 共用）。
   場景參考中科大型晶圓廠常見配置：無塵室廠房、辦公大樓、天橋、員工餐廳、氣體站、冷卻水塔、停車場、大門。
   人物、事件與地圖皆為虛構創作，不代表任何真實廠區的實際配置，也不描述真實人物的行為。
   用法：FackChase.mount(容器, {intro, buttons(result)})；容器需為 position:relative。 */
(function(){
'use strict';
const CSS='.cz-layer{position:absolute;inset:0;z-index:15;background:#0b1620;color:#f3eee4;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,"PingFang TC","Noto Sans TC",sans-serif}'
+'.cz-top{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#10222f;border-bottom:1px solid #35566a}'
+'.cz-top b{display:block;font-size:15px;color:#ffd98f}.cz-top small{display:block;font-size:11px;color:#a9c3cf}.cz-top>div:first-child{flex:1;min-width:0}'
+'.cz-stats{display:flex;gap:6px;font:700 13px system-ui;white-space:nowrap}.cz-stats span{background:#1d3a4c;border-radius:999px;padding:5px 9px}.cz-time.low{background:#9b2f2f!important}'
+'.cz-joy{position:absolute;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,#ffffff14 40%,#ffffff2a);border:2px solid #ffffff66;touch-action:none;z-index:2;box-shadow:0 6px 24px #0006;display:none}.cz-layer.playing .cz-joy{display:block}.cz-joy:before{content:"";position:absolute;inset:-34px;border-radius:50%}.cz-joy i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3d6,#f1d09a 60%,#c9a46a);box-shadow:0 4px 14px #0009;pointer-events:none}.cz-joy b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 11px system-ui;color:#ffffff99;pointer-events:none;letter-spacing:1px;padding-top:96px}'
+'.cz-mute{background:none;border:1px solid #58798a;color:#dfe9ee;border-radius:8px;width:34px;height:34px;font-size:15px;cursor:pointer}'
+'.cz-quit{background:none;border:1px solid #58798a;color:#dfe9ee;border-radius:8px;width:34px;height:34px;font-size:16px;cursor:pointer}'
+'.cz-cv{flex:1;min-height:0;width:100%;display:block;touch-action:none;cursor:crosshair}'
+'.cz-msg{position:absolute;left:50%;top:58px;transform:translateX(-50%);background:#f1d27a;color:#1b1b1b;font-weight:800;font-size:14px;padding:6px 14px;border-radius:999px;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}.cz-msg.on{opacity:1}'
+'.cz-card{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:22px;background:#07111bea;gap:6px;overflow-y:auto}'
+'.cz-card h2{margin:0;font:800 clamp(24px,6vw,38px) system-ui;color:#ffd98f}.cz-card p{margin:4px 0;line-height:1.7;font-size:15px;max-width:440px}'
+'.cz-card ul{text-align:left;font-size:14px;line-height:1.8;padding-left:20px;margin:6px 0 10px;max-width:440px}'
+'.cz-levels{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:440px}.cz-levels button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 8px!important}.cz-levels button b{font-size:17px}.cz-levels button small{font-size:12px;font-weight:600;opacity:.8}.cz-levels button:not(.on){background:#20394c!important;color:#f7f4ea!important;border:1px solid #8297a4!important}'
+'.cz-card .rank{font:800 20px system-ui;color:#9fe3c4;margin:4px 0}'
+'.cz-card .row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:6px}'
+'.cz-card button{border:0;border-radius:10px;background:#f1d09a;color:#102338;padding:13px 22px;font-weight:800;font-size:16px;cursor:pointer}.cz-card button.alt{background:#20394c;color:#f7f4ea;border:1px solid #8297a4}';

// ── 地圖（直式座標 760 × 1150；橫向螢幕時整張轉 90 度）──
const WW=760,WH=1150,VIEW=430,TIME=75;
// 難易度：spd 法克一般速度、spr 衝刺速度、st 衝刺秒數、tired 喘氣秒數、tsp 喘氣速度、hide 最久躲幾秒、time 限時、pick 連署書出現間隔、see 同事發現距離
const LEVELS={
 easy:{id:'easy',n:'簡單',e:'🌱',spd:116,spr:172,st:1.2,tired:2.8,tsp:55,hide:3,time:90,pick:3,see:120,candy:7,cspd:110},
 normal:{id:'normal',n:'中等',e:'🏃',spd:124,spr:186,st:1.5,tired:2.4,tsp:60,hide:4,time:80,pick:3.5,see:110,candy:5.5,cspd:130},
 hard:{id:'hard',n:'難',e:'🔥',spd:130,spr:198,st:1.8,tired:2.0,tsp:66,hide:5,time:75,pick:4.5,see:95,candy:4.5,cspd:150},
 hell:{id:'hell',n:'地獄',e:'💀',spd:150,spr:232,st:2.8,tired:1.1,tsp:95,hide:10,time:60,pick:7,see:65,candy:3.5,cspd:170}
};
const cars=[];[660,775,890].forEach((y,r)=>[0,1,2,3].forEach(i=>{if(!(r===1&&i===2))cars.push({t:'car',n:'',x:96+i*70,y,w:42,h:72,c:['#d8dde2','#5b6f86','#a33c3c','#2f3a46','#e6d7b8'][(i+r*2)%5]});}));
const SOLIDS=[
 {t:'fab',n:'FAB 無塵室廠房',x:80,y:30,w:390,h:250},
 {t:'gas',n:'氣體站',x:530,y:30,w:160,h:110},
 {t:'tower',n:'冷卻水塔',x:530,y:170,w:160,h:95},
 {t:'office',n:'辦公大樓',x:80,y:430,w:250,h:140},
 {t:'canteen',n:'員工餐廳',x:430,y:410,w:260,h:110},
 {t:'shed',n:'機車棚',x:640,y:770,w:70,h:165},
 {t:'truck',n:'消防車',x:450,y:800,w:150,h:46},
 {t:'guard',n:'警衛室',x:560,y:1050,w:130,h:62}
].concat(cars);
const TREES=[[92,612,34],[706,592,32],[470,975,38],[150,1040,40],[290,985,30],[520,555,26],[712,368,26],[500,330,22]];
const PLAZA={x:575,y:670,rx:125,ry:78};
const SHOUT=['「法克在{}！」','「往{}那邊跑了！」','「我看到他了，在{}！」','「{}！快！」'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// ── 音樂與音效：Web Audio 即時合成的原創惡搞配樂（不使用任何現成曲目）──
const Sound=(function(){
 let ctx=null,master=null,mus=null,timer=null,step=0,nextT=0,fast=false,playing=false,noiseBuf=null;
 let muted=false;try{muted=localStorage.getItem('fack-mute')==='1'}catch(e){}
 const mtof=m=>440*Math.pow(2,(m-69)/12);
 function init(){if(ctx)return true;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.55;master.connect(ctx.destination);mus=ctx.createGain();mus.gain.value=.32;mus.connect(master);}catch(e){ctx=null;return false;}return true;}
 function tone(f,t,len,type,vol,dest,slideTo,vib){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+len);
  if(vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=vib;lg.gain.value=f*.035;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+len+.05);}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+len+.05);}
 function hat(t,vol){if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate*.15,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  const b=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=7000;b.buffer=noiseBuf;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);b.connect(f);f.connect(g);g.connect(mus);b.start(t);b.stop(t+.06);}
 // 32 個八分音符（4 小節：C–F–G–C 的「嗡吧嗡吧」）；0 = 休止
 const MEL=[72,0,76,79,84,0,79,76, 77,77,0,81,0,77,76,74, 74,0,79,0,83,81,79,77, 76,74,72,0,67,0,72,0];
 const BASS=[48,55,48,55, 53,60,53,60, 55,62,55,62, 48,55,43,48];
 function schedule(){if(!playing)return;const e=60/(fast?196:152)/2;
  while(nextT<ctx.currentTime+.15){const i=step%32,m=MEL[i];
   if(m)tone(mtof(m+(fast&&i%8===3?1:0)),nextT,e*.85,'square',.1,mus,null,i%8===4?8:0);
   if(i%2===0)tone(mtof(BASS[i>>1]),nextT,e*1.7,'triangle',.32,mus);else hat(nextT,.12);
   if(i===31)tone(mtof(60),nextT,e*1.6,'sawtooth',.08,mus,mtof(72),0);
   nextT+=e;step++;}}
 const api={
  start(){if(!init())return;if(ctx.resume)ctx.resume();if(playing)return;playing=true;step=0;nextT=ctx.currentTime+.08;clearInterval(timer);timer=setInterval(schedule,25);},
  stop(){playing=false;clearInterval(timer);timer=null;},
  setFast(v){fast=!!v;},
  toggle(){muted=!muted;try{localStorage.setItem('fack-mute',muted?'1':'0')}catch(e){}if(init())master.gain.setTargetAtTime(muted?0:.55,ctx.currentTime,.05);return muted;},
  get muted(){return muted;},
  sfx(n){if(!init()||muted)return;if(ctx.resume)ctx.resume();const t=ctx.currentTime+.01;
   if(n==='siren'){tone(560,t,.55,'sawtooth',.09,master,1050);tone(1050,t+.55,.55,'sawtooth',.09,master,560);}
   else if(n==='boing'){tone(160,t,.32,'sine',.55,master,640);tone(640,t+.14,.3,'sine',.3,master,130);}
   else if(n==='slide'){tone(260,t,.7,'triangle',.4,master,1300,10);}
   else if(n==='coin'){tone(988,t,.08,'square',.16);tone(1319,t+.08,.28,'square',.16);}
   else if(n==='puff'){tone(240,t,.45,'sawtooth',.12,master,95,6);}
   else if(n==='shout'){tone(880,t,.07,'square',.08);tone(1175,t+.07,.09,'square',.08);}
   else if(n==='win'){[72,76,79,84].forEach((m,i)=>tone(mtof(m),t+i*.12,.16,'square',.17));tone(mtof(84),t+.5,.9,'square',.15,master,null,7);tone(mtof(88),t+.5,.9,'triangle',.12,master,null,7);}
   else if(n==='lose'){[67,66,65].forEach((m,i)=>tone(mtof(m),t+i*.42,.4,'sawtooth',.16,master,null,5));tone(mtof(64),t+1.26,1.3,'sawtooth',.16,master,mtof(62),6);}
  }
 };
 return api;
})();
const LDESC={easy:'法克跑得慢、常喘氣',normal:'剛剛好的追逐',hard:'跑得快、很會躲',hell:'比你還快，只能靠衝刺和堵死角'};
function rank(sec){return sec<=15?'🏆 法克剋星':sec<=30?'🥇 追緝高手':sec<=50?'🥈 連署書快遞':'🥉 有追到就是贏';}

function mount(host,opts){
 opts=opts||{};
 if(!document.getElementById('cz-css')){const s=document.createElement('style');s.id='cz-css';s.textContent=CSS;document.head.append(s);}
 const layer=document.createElement('div');layer.className='cz-layer';
 layer.innerHTML='<div class="cz-top"><div><b>🏃 全民找法克</b><small>'+(opts.subtitle||'追上法克，把連署書交到他手上')+'</small></div><div class="cz-stats"><span class="cz-time">⏱ '+TIME+'</span><span class="cz-sheets">📦 120 份</span></div><button class="cz-mute" aria-label="音樂開關">🔊</button><button class="cz-quit" aria-label="不追了">✕</button></div><canvas class="cz-cv" role="img" aria-label="台中廠區追逐畫面"></canvas><div class="cz-msg" aria-live="polite"></div><div class="cz-joy" aria-label="移動搖桿"><i></i><b>搖桿</b></div>';
 host.append(layer);
 let game=null;
 let lv=LEVELS[opts.level]||LEVELS.normal;
 const api={layer,get level(){return lv;},close(){if(game)game.stop();game=null;Sound.stop();layer.remove();},retry(level){if(level&&LEVELS[level])lv=LEVELS[level];clearCard();game=new Chase(layer,end,lv);},state(){return game&&game.state?game.state():null;}};
 const mb=layer.querySelector('.cz-mute');mb.textContent=Sound.muted?'🔇':'🔊';mb.onclick=()=>{mb.textContent=Sound.toggle()?'🔇':'🔊';};
 layer.querySelector('.cz-quit').onclick=()=>{if(game)game.end(false,true);else if(opts.onQuit)opts.onQuit(api);};
 function clearCard(){const o=layer.querySelector('.cz-card');if(o)o.remove();}
 function card(html){clearCard();const d=document.createElement('div');d.className='cz-card';d.innerHTML=html;layer.append(d);return d;}
 function end(r){
  r.rank=r.win?rank(r.used):'';
  if(opts.onEnd)opts.onEnd(r,api);
  const d=card(r.win?'<h2>追到了！</h2><div class="rank">'+r.rank+'</div><p>難度 <b>'+r.level.e+' '+r.level.n+'</b>・花了 <b>'+r.used+'</b> 秒，手上有 <b>'+r.sheets+'</b> 份連署書。'+(r.best?'<br>'+r.best:'')+'</p><div class="row"></div>'
   :'<h2>'+(r.quit?'先不追了':'演練結束')+'</h2><p>難度 '+r.level.e+' '+r.level.n+'<br>'+(r.quit?'你停下腳步，喘了口氣。':'廣播響起，人群散去。')+'<br>法克又神隱了。</p><div class="row"></div>');
  const row=d.querySelector('.row');
  (opts.buttons?opts.buttons(r,api):[{label:'再追一次',onClick:()=>api.retry()},{label:'換難度',alt:true,onClick:()=>api.menu()}]).forEach((b,i)=>{const el=document.createElement('button');el.textContent=b.label;if(b.alt)el.className='alt';el.onclick=()=>b.onClick(r,api);row.append(el);if(i===0)setTimeout(()=>el.focus(),0);});
 }
 function menu(){
  const d=card('<h2>全民找法克</h2><p>'+(opts.intro||'你是桃園會長，抱著一箱連署書。<br>法克會逃、也會躲，追上他就算成功。')+'</p><ul><li><b>手機：</b>用右下角的 🕹️ 搖桿控制方向。</li><li><b>電腦：</b>方向鍵或 WASD（也可以用滑鼠拖搖桿）。</li><li>🍬 <b>糖糖</b>會突然橫越畫面：粉紅色的會<b>黏住你拖著走</b>，其他的會<b>擋路</b>。</li><li>法克躲進🌳樹叢就看不見；同事看到他會喊「！」，畫面邊緣的箭頭會指向他。</li><li>撿起同事遞來的 📝 連署書，會長會衝刺一下。</li><li>法克衝刺完會喘 💦，那就是你的機會。</li></ul>'+(opts.introExtra?opts.introExtra(lv):'')+'<p><b>選擇難易度</b></p><div class="cz-levels">'+Object.values(LEVELS).map(L=>'<button class="cz-start'+(L.id===lv.id?' on':'')+'" data-lv="'+L.id+'"><b>'+L.e+' '+L.n+'</b><small>'+L.time+' 秒・'+LDESC[L.id]+'</small></button>').join('')+'</div>');
  d.querySelectorAll('.cz-start').forEach(b=>b.onclick=()=>api.retry(b.dataset.lv));
  setTimeout(()=>(d.querySelector('.cz-start.on')||d.querySelector('.cz-start')).focus(),0);
 }
 api.menu=menu;menu();
 return api;
}

function Chase(layer,onEnd,LV){
 LV=LV||LEVELS.normal;
 const cv=layer.querySelector('.cz-cv'),ctx=cv.getContext('2d'),self=this;
 let VW=0,VH=0,k=1,rot=false,W=WW,H=WH,camX=0,camY=0,raf=0,last=0,over=false,time=LV.time,sheets=120,boost=0,msgT=0,pickT=3,shoutCD=0,candyT=2.5;
 const P={x:0,y:0,r:15},F={x:0,y:0,r:15,dx:0,dy:-1,st:LV.st,tired:0,mode:'run',bush:null,seen:null,seenT:0,hideT:0,hideCD:0},target={on:false,x:0,y:0},keys={};
 let solids=[],bushes=[],crowd=[],pickups=[],candies=[],plaza=null;
 const stick={x:0,y:0,on:false},drag={vx:0,vy:0,t:0};
 // 直式座標 → 目前世界座標
 const L=(x,y)=>rot?{x:y,y:WW-x}:{x,y};
 function build(){
  rot=VW>VH;W=rot?WH:WW;H=rot?WW:WH;
  solids=SOLIDS.map(o=>{const a=L(o.x,o.y),b=L(o.x+o.w,o.y+o.h);return Object.assign({},o,{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y),v:rot});});
  bushes=TREES.map(t=>Object.assign(L(t[0],t[1]),{r:t[2]}));
  const c=L(PLAZA.x,PLAZA.y);plaza={x:c.x,y:c.y,rx:rot?PLAZA.ry:PLAZA.rx,ry:rot?PLAZA.rx:PLAZA.ry};
 }
 function layout(){
  const r=cv.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  VW=Math.max(200,r.width);VH=Math.max(200,r.height);cv.width=VW*dpr;cv.height=VH*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  k=Math.min(VW,VH)/VIEW;
  const nowRot=VW>VH;if(!solids.length||nowRot!==rot){const had=solids.length;build();if(had){[P,F,target,...crowd,...pickups].forEach(e=>{const q=rot?{x:e.y,y:WW-e.x}:{x:WW-e.y,y:e.x};e.x=q.x;e.y=q.y;});F.bush=null;F.mode='run';}}
 }
 layout();
 Object.assign(P,L(385,1120));Object.assign(F,L(PLAZA.x,PLAZA.y));
 for(let i=0;i<28;i++){const p=free();crowd.push({x:p.x,y:p.y,r:7,a:Math.random()*6.28,t:0,alert:0,c:['#e8edf0','#f1d36b','#9cc0cf'][i%3]});}
 function inSolid(x,y,pad){return solids.some(s=>x>s.x-pad&&x<s.x+s.w+pad&&y>s.y-pad&&y<s.y+s.h+pad);}
 function free(){for(let n=0;n<80;n++){const x=W*(.04+Math.random()*.92),y=H*(.04+Math.random()*.92);if(!inSolid(x,y,20)&&dist({x,y},P)>80)return{x,y};}return{x:plaza.x,y:plaza.y};}
 function collide(e){
  e.x=Math.max(e.r,Math.min(W-e.r,e.x));e.y=Math.max(e.r,Math.min(H-e.r,e.y));
  for(const s of solids){const cx=Math.max(s.x,Math.min(e.x,s.x+s.w)),cy=Math.max(s.y,Math.min(e.y,s.y+s.h)),dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy);
   if(d<e.r){if(d>0.01){e.x=cx+dx/d*e.r;e.y=cy+dy/d*e.r;}else{const l=e.x-s.x,r=s.x+s.w-e.x,t=e.y-s.y,b=s.y+s.h-e.y,m=Math.min(l,r,t,b);if(m===l)e.x=s.x-e.r;else if(m===r)e.x=s.x+s.w+e.r;else if(m===t)e.y=s.y-e.r;else e.y=s.y+s.h+e.r;}}}
 }
 function openness(b){if(b.open!=null)return b.open;let n=0;for(let j=0;j<8;j++){const t=j/8*Math.PI*2,x=b.x+Math.cos(t)*(b.r+70),y=b.y+Math.sin(t)*(b.r+70);if(x>30&&y>30&&x<W-30&&y<H-30&&!inSolid(x,y,18))n++;}return b.open=n;}
 function hidden(){return !!(F.bush&&dist(F,F.bush)<F.bush.r*.75);}
 function nearest(p){let best='集合點',bd=dist(p,plaza)-60;solids.forEach(s=>{const d=dist(p,{x:s.x+s.w/2,y:s.y+s.h/2})-Math.max(s.w,s.h)/2;if(d<bd){bd=d;best=s.t==='car'?'停車場':s.n}});bushes.forEach(b=>{const d=dist(p,b)-b.r;if(d<bd){bd=d;best='樹叢'}});return best;}
 function msg(t){const m=layer.querySelector('.cz-msg');if(!m)return;m.textContent=t;m.classList.add('on');msgT=2.2;}
 // 法克的逃跑 AI：16 個方向中挑「離會長遠、四周開闊、不撞牆」的路線；甩開了就找樹叢躲。
 // ── 法克的逃跑 AI：格子尋路 ──
 // 地圖切成 20×20 的格子；每格記錄「離障礙物多遠」(clear)。
 // 每隔一下算出法克與會長走到每格要幾步，挑「法克明顯先到、四周開闊、離會長遠」的格子當目標，沿著路徑跑，不會鑽進死巷。
 const CS=20,N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 let GW=0,GH=0,blocked=null,clear=null,dT=null,planT=0,goal=-1,gridRot=null;
 function buildGrid(){
  GW=Math.ceil(W/CS);GH=Math.ceil(H/CS);blocked=new Uint8Array(GW*GH);clear=new Float32Array(GW*GH);const q=[];
  for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const x=i*CS+CS/2,y=j*CS+CS/2,id=j*GW+i;if(x<14||y<14||x>W-14||y>H-14||inSolid(x,y,12)){blocked[id]=1;clear[id]=0;q.push(id);}else clear[id]=1e9;}
  for(let h=0;h<q.length;h++){const id=q[h],i=id%GW,j=(id/GW)|0;for(let k=0;k<4;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=GW||b>=GH)continue;const n=b*GW+a;if(clear[n]>clear[id]+1){clear[n]=clear[id]+1;q.push(n);}}}
  dT=null;goal=-1;
 }
 function cellOf(x,y){const i=Math.max(0,Math.min(GW-1,Math.floor(x/CS))),j=Math.max(0,Math.min(GH-1,Math.floor(y/CS)));let id=j*GW+i;if(!blocked[id])return id;
  for(let r=1;r<4;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const a=i+di,b=j+dj;if(a<0||b<0||a>=GW||b>=GH)continue;const n=b*GW+a;if(!blocked[n])return n;}return id;}
 function bfs(src){const d=new Float32Array(GW*GH).fill(1e9),q=[src];d[src]=0;
  for(let h=0;h<q.length;h++){const id=q[h],i=id%GW,j=(id/GW)|0;for(let k=0;k<8;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=GW||b>=GH)continue;const n=b*GW+a;if(blocked[n])continue;
   if(k>=4&&(blocked[j*GW+a]||blocked[b*GW+i]))continue;const c=d[id]+(k>=4?1.41:1);if(c<d[n]){d[n]=c;q.push(n);}}}
  return d;}
 function plan(){
  if(F.mode==='hide'&&F.bush){goal=cellOf(F.bush.x,F.bush.y);dT=bfs(goal);return;}
  // 逃跑地圖：先給每格「−1.2 × 離會長步數 − 開闊加分」，再沿著可走路徑擴散（Dijkstra 鬆弛），法克往數值最低的鄰格走。
  const dP=bfs(cellOf(P.x,P.y)),N=GW*GH,S=new Float32Array(N);
  for(let id=0;id<N;id++)S[id]=blocked[id]?1e9:-1.2*Math.min(dP[id],70)-2.2*Math.min(clear[id],4)+(dP[id]<3?6:0);
  for(let pass=0;pass<24;pass++){let ch=false;
   for(let dir=0;dir<2;dir++){
    for(let t=0;t<N;t++){const id=dir?N-1-t:t;if(blocked[id])continue;const i=id%GW,j=(id/GW)|0;let v=S[id];
     for(let k=0;k<8;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=GW||b>=GH)continue;const n=b*GW+a;if(blocked[n])continue;if(k>=4&&(blocked[j*GW+a]||blocked[b*GW+i]))continue;const c=S[n]+(k>=4?1.41:1);if(c<v)v=c;}
     if(v<S[id]-1e-3){S[id]=v;ch=true;}}}
   if(!ch)break;}
  dT=S;
 }
 function fleeDir(){
  if(F.mode==='hide'&&F.bush&&dist(F,F.bush)<F.bush.r*.35)return{x:0,y:0};
  if(!dT)return{x:0,y:0};
  const c=cellOf(F.x,F.y),i=c%GW,j=(c/GW)|0;let best=c,bd=dT[c];
  for(let k=0;k<8;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=GW||b>=GH)continue;const n=b*GW+a;if(!blocked[n]&&dT[n]<bd){bd=dT[n];best=n;}}
  let tx=(best%GW)*CS+CS/2,ty=((best/GW)|0)*CS+CS/2;
  if(best===c){if(F.mode==='hide'&&F.bush){tx=F.bush.x;ty=F.bush.y;}else return{x:0,y:0};}
  const dx=tx-F.x,dy=ty-F.y,l=Math.hypot(dx,dy);if(l<1)return{x:0,y:0};
  return{x:dx/l,y:dy/l};
 }
 function spawnCandy(){
  const vw=VW/k,vh=VH/k,x0=camX,y0=camY,side=Math.floor(Math.random()*4),m=40;
  const edge=(sd,u)=>sd===0?{x:x0+u*vw,y:y0-m}:sd===1?{x:x0+vw+m,y:y0+u*vh}:sd===2?{x:x0+u*vw,y:y0+vh+m}:{x:x0-m,y:y0+u*vh};
  const a=edge(side,.1+Math.random()*.8),b=edge((side+2)%4,.1+Math.random()*.8),l=dist(a,b)||1,sp=LV.cspd*(.85+Math.random()*.35);
  candies.push({x:a.x,y:a.y,vx:(b.x-a.x)/l*sp,vy:(b.y-a.y)/l*sp,r:24,sticky:Math.random()<.5,rot:0,life:0,cd:0});
  if(candies.length===1||Math.random()<.4)msg(Math.random()<.5?'🍬 糖糖來亂了！':'小心！糖糖衝過來了 🍬');
 }
 function step(dt){
  time-=dt;if(time<=0){time=0;self.end(false);return;}
  Sound.setFast(time<15);
  boost=Math.max(0,boost-dt);msgT-=dt;shoutCD-=dt;
  if(msgT<=0){const m=layer.querySelector('.cz-msg');m&&m.classList.remove('on');}
  let mx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),my=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
  if(!mx&&!my&&target.on){const d=dist(target,P);if(d>4){mx=(target.x-P.x)/d;my=(target.y-P.y)/d;}else target.on=false;}
  let mag=1;if(!mx&&!my&&stick.on){const m=Math.hypot(stick.x,stick.y);if(m>.18){mx=stick.x;my=stick.y;mag=Math.min(1,m*1.25);}}
  const ml=Math.hypot(mx,my);if(ml){const sp=(boost>0?215:152)*mag*(drag.t>0?.35:1)*dt;P.x+=mx/ml*sp;P.y+=my/ml*sp;}
  if(drag.t>0){drag.t-=dt;P.x+=drag.vx*dt;P.y+=drag.vy*dt;}
  collide(P);
  const dP=dist(F,P);
  if(F.tired>0)F.tired-=dt;
  else if(dP<110&&F.st>0){F.st-=dt;if(F.st<=0){F.st=0;F.tired=LV.tired;msg('法克喘不過氣了 💦 快追！');Sound.sfx('puff');}}
  else F.st=Math.min(LV.st,F.st+dt*(F.mode==='hide'?.6:time>35?.45:.3));
  const sprint=F.tired<=0&&dP<110&&F.st>0;
  F.hideCD=Math.max(0,F.hideCD-dt);if(hidden()){F.hideT+=dt;if(F.hideT>LV.hide){F.mode='run';F.hideT=0;F.hideCD=4;msg('法克待不住，從樹叢衝出來了！');}}
  if(F.mode!=='hide'&&F.hideCD<=0&&dP>230&&!sprint){const c=bushes.filter(b=>dist(b,P)>220&&openness(b)>=7).sort((a,b)=>(dist(a,F)-dist(a,P)*.5)-(dist(b,F)-dist(b,P)*.5))[0];if(c){F.mode='hide';F.bush=c;}}
  if(F.mode==='hide'&&dP<130)F.mode='run';
  const spd=F.tired>0?LV.tsp:sprint?LV.spr:LV.spd;
  if(!blocked||gridRot!==rot||GW!==Math.ceil(W/CS)){buildGrid();gridRot=rot;}
  planT-=dt;if(planT<=0||!dT){plan();planT=dP<160?.15:.35;}
  const d=fleeDir();F.x+=d.x*spd*dt;F.y+=d.y*spd*dt;if(d.x||d.y){F.dx=d.x;F.dy=d.y;}
  collide(F);
  if(F.mode==='run')F.bush=null;
  const hid=hidden();
  crowd.forEach(c=>{
   c.t-=dt;if(c.t<=0){c.a+=(Math.random()-.5)*2;c.t=1+Math.random()*2;}
   const ex=c.x+Math.cos(c.a)*18*dt,ey=c.y+Math.sin(c.a)*18*dt;c.x=ex;c.y=ey;collide(c);if(Math.abs(ex-c.x)>.01||Math.abs(ey-c.y)>.01)c.a+=Math.PI;
   c.alert=Math.max(0,c.alert-dt);
   if(dist(c,F)<(hid?LV.see:LV.see*.75)){c.alert=1.2;if(hid){F.seen={x:F.x,y:F.y};F.seenT=1.8;}if(shoutCD<=0&&dist(F,P)>150){shoutCD=4;Sound.sfx('shout');msg(SHOUT[Math.floor(Math.random()*SHOUT.length)].replace('{}',nearest(F)));}}
  });
  if(!hid){F.seen={x:F.x,y:F.y};F.seenT=1.8;}else F.seenT-=dt;
  pickT-=dt;if(pickT<=0&&pickups.length<3){const q=free();if(dist(q,P)<VIEW*.9)pickups.push(Object.assign(q,{r:13}));pickT=LV.pick+Math.random()*3;}
  pickups=pickups.filter(p=>{if(dist(p,P)<P.r+p.r){sheets+=30;boost=2.6;msg('同事塞來 30 份連署書！會長衝刺 💨');Sound.sfx('coin');return false;}return true;});
  // 🍬 糖糖：從畫面某一邊冒出來，沿固定直線橫越畫面，直到離開畫面
  candyT-=dt;if(candyT<=0){candyT=LV.candy*(.7+Math.random()*.6);spawnCandy();}
  const vx0=camX,vy0=camY,vw=VW/k,vh=VH/k;
  candies=candies.filter(c=>{c.x+=c.vx*dt;c.y+=c.vy*dt;c.rot+=dt*5;c.life+=dt;c.cd=Math.max(0,c.cd-dt);
   const out=c.x<vx0-90||c.y<vy0-90||c.x>vx0+vw+90||c.y>vy0+vh+90;if(c.life>1.2&&out||c.life>14)return false;
   const d=dist(c,P);if(d<c.r+P.r){const nx=(P.x-c.x)/(d||1),ny=(P.y-c.y)/(d||1);P.x=c.x+nx*(c.r+P.r+.5);P.y=c.y+ny*(c.r+P.r+.5);
    if(c.sticky){drag.vx=c.vx;drag.vy=c.vy;drag.t=1.1;if(c.cd<=0){msg('被糖糖黏住，拖著走！🍬');Sound.sfx('slide');}}
    else if(c.cd<=0){msg('糖糖擋路！🍬');Sound.sfx('boing');}
    c.cd=1.2;collide(P);}
   return true;});
  if(dist(P,F)<P.r+F.r*.95)self.end(true);
 }
 // ── 繪圖 ──
 function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
 function text(t,x,y,size,color,weight){ctx.font=(weight||700)+' '+size+'px system-ui,"PingFang TC","Noto Sans TC",sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y);}
 function label(s,color,bg){const cx=s.x+s.w/2,cy=s.y+s.h/2,size=Math.min(17,Math.max(11,Math.min(s.w,s.h)/4.2));ctx.font='800 '+size+'px system-ui,"PingFang TC",sans-serif';const tw=ctx.measureText(s.n).width;rr(cx-tw/2-8,cy-size*.8,tw+16,size*1.6,6);ctx.fillStyle=bg||'#0b1620b0';ctx.fill();text(s.n,cx,cy,size,color||'#fff',800);}
 function building(s){
  ctx.fillStyle='#0006';rr(s.x+4,s.y+6,s.w,s.h,6);ctx.fill();
  if(s.t==='fab'){
   ctx.fillStyle='#e9eef1';rr(s.x,s.y,s.w,s.h,6);ctx.fill();
   ctx.fillStyle='#cfd8de';const n=Math.floor((s.v?s.h:s.w)/58);for(let i=0;i<n;i++){if(s.v)ctx.fillRect(s.x+8,s.y+12+i*58,s.w-16,26);else ctx.fillRect(s.x+12+i*58,s.y+8,26,s.h-16);}
   ctx.fillStyle='#2f6fa8';if(s.v)ctx.fillRect(s.x+s.w-22,s.y,10,s.h);else ctx.fillRect(s.x,s.y+s.h-22,s.w,10);
   label(s,'#1d3c55','#ffffffd0');return;}
  if(s.t==='office'){
   const g=ctx.createLinearGradient(s.x,s.y,s.x+s.w,s.y+s.h);g.addColorStop(0,'#3f7fae');g.addColorStop(1,'#1d4566');ctx.fillStyle=g;rr(s.x,s.y,s.w,s.h,6);ctx.fill();
   ctx.strokeStyle='#bfe3f566';ctx.lineWidth=1;for(let x=s.x+14;x<s.x+s.w;x+=18){ctx.beginPath();ctx.moveTo(x,s.y+6);ctx.lineTo(x,s.y+s.h-6);ctx.stroke();}for(let y=s.y+14;y<s.y+s.h;y+=18){ctx.beginPath();ctx.moveTo(s.x+6,y);ctx.lineTo(s.x+s.w-6,y);ctx.stroke();}
   label(s);return;}
  if(s.t==='canteen'){ctx.fillStyle='#b9825a';rr(s.x,s.y,s.w,s.h,6);ctx.fill();ctx.fillStyle='#d9a578';rr(s.x+8,s.y+8,s.w-16,s.h-16,4);ctx.fill();label(s,'#fff','#5a3a22c0');return;}
  if(s.t==='gas'){ctx.fillStyle='#7c8a94';rr(s.x,s.y,s.w,s.h,6);ctx.fill();ctx.fillStyle='#c9d3d9';const n=4;for(let i=0;i<n;i++){const cx=s.v?s.x+s.w/2:s.x+s.w*(i+.5)/n,cy=s.v?s.y+s.h*(i+.5)/n:s.y+s.h/2;ctx.beginPath();ctx.arc(cx,cy,Math.min(s.w,s.h)/(s.v?2.6:2.8)/ (s.v?1:1),0,7);ctx.fill();}label(s);return;}
  if(s.t==='tower'){ctx.fillStyle='#5f7480';rr(s.x,s.y,s.w,s.h,6);ctx.fill();const r=Math.min(s.w,s.h)*.36;[[.28,.5],[.72,.5]].forEach(o=>{const cx=s.x+(s.v?.5:o[0])*s.w,cy=s.y+(s.v?o[0]:.5)*s.h;ctx.fillStyle='#9fb2bb';ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();ctx.fillStyle='#43555e';ctx.beginPath();ctx.arc(cx,cy,r*.55,0,7);ctx.fill();});label(s);return;}
  if(s.t==='car'){ctx.fillStyle=s.c;rr(s.x,s.y,s.w,s.h,8);ctx.fill();ctx.fillStyle='#1b2a35aa';if(s.v)rr(s.x+s.w*.22,s.y+5,s.w*.3,s.h-10,4);else rr(s.x+5,s.y+s.h*.22,s.w-10,s.h*.3,4);ctx.fill();return;}
  if(s.t==='truck'){ctx.fillStyle='#c7372c';rr(s.x,s.y,s.w,s.h,8);ctx.fill();ctx.fillStyle='#e4e8ea';if(s.v)ctx.fillRect(s.x+s.w/2-3,s.y+8,6,s.h-16);else ctx.fillRect(s.x+8,s.y+s.h/2-3,s.w-16,6);const t=performance.now()/250|0;ctx.fillStyle=t%2?'#ff5b4d':'#4da3ff';ctx.beginPath();ctx.arc(s.x+8,s.y+8,5,0,7);ctx.fill();label(s);return;}
  if(s.t==='shed'){ctx.fillStyle='#5a6b52';rr(s.x,s.y,s.w,s.h,6);ctx.fill();ctx.strokeStyle='#8fa186';ctx.lineWidth=2;for(let i=1;i<6;i++){ctx.beginPath();if(s.v){ctx.moveTo(s.x+s.w*i/6,s.y+4);ctx.lineTo(s.x+s.w*i/6,s.y+s.h-4);}else{ctx.moveTo(s.x+4,s.y+s.h*i/6);ctx.lineTo(s.x+s.w-4,s.y+s.h*i/6);}ctx.stroke();}label(s);return;}
  if(s.t==='guard'){ctx.fillStyle='#d9dde0';rr(s.x,s.y,s.w,s.h,6);ctx.fill();ctx.fillStyle='#2f6fa8';rr(s.x+6,s.y+6,s.w-12,s.h*.35,4);ctx.fill();label(s,'#1d3c55','#ffffffc0');return;}
 }
 function road(x,y,w,h){const a=L(x,y),b=L(x+w,y+h);const rx=Math.min(a.x,b.x),ry=Math.min(a.y,b.y),rw=Math.abs(b.x-a.x),rh=Math.abs(b.y-a.y);ctx.fillStyle='#4a5a64';ctx.fillRect(rx,ry,rw,rh);ctx.setLineDash([18,14]);ctx.strokeStyle='#f3f0d8aa';ctx.lineWidth=3;ctx.beginPath();if(rw>rh){ctx.moveTo(rx,ry+rh/2);ctx.lineTo(rx+rw,ry+rh/2);}else{ctx.moveTo(rx+rw/2,ry);ctx.lineTo(rx+rw/2,ry+rh);}ctx.stroke();ctx.setLineDash([]);}
 function person(e,body,hair,name,alpha){
  ctx.globalAlpha=alpha;ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.9,e.r,e.r*.4,0,0,7);ctx.fill();
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();
  ctx.fillStyle='#f1c9a5';ctx.beginPath();ctx.arc(e.x,e.y-e.r*.15,e.r*.55,0,7);ctx.fill();
  ctx.fillStyle=hair;ctx.beginPath();ctx.arc(e.x,e.y-e.r*.35,e.r*.58,Math.PI,0);ctx.fill();
  ctx.globalAlpha=1;rr(e.x-23,e.y-e.r-27,46,18,9);ctx.fillStyle='#0b1620cc';ctx.fill();text(name,e.x,e.y-e.r-18,12,'#fff');
 }
 function arrow(p,name,color){
  const sx=(p.x-camX)*k,sy=(p.y-camY)*k,m=26;if(sx>0&&sy>0&&sx<VW&&sy<VH)return;
  const cx=VW/2,cy=VH/2,a=Math.atan2(sy-cy,sx-cx),t=Math.min((VW/2-m)/Math.abs(Math.cos(a)||1e-6),(VH/2-m)/Math.abs(Math.sin(a)||1e-6)),ax=cx+Math.cos(a)*t,ay=cy+Math.sin(a)*t;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-8,-11);ctx.lineTo(-8,11);ctx.closePath();ctx.fill();ctx.restore();
  rr(ax-Math.cos(a)*30-24,ay-Math.sin(a)*30-11,48,22,11);ctx.fillStyle='#0b1620dd';ctx.fill();text(name,ax-Math.cos(a)*30,ay-Math.sin(a)*30,12,color);
 }
 function draw(){
  camX=Math.max(0,Math.min(W-VW/k,P.x-VW/k/2));camY=Math.max(0,Math.min(H-VH/k,P.y-VH/k/2));
  if(W<VW/k)camX=(W-VW/k)/2;if(H<VH/k)camY=(H-VH/k)/2;
  ctx.fillStyle='#22313a';ctx.fillRect(0,0,VW,VH);
  ctx.save();ctx.scale(k,k);ctx.translate(-camX,-camY);
  ctx.fillStyle='#6f8a6a';ctx.fillRect(0,0,W,H);
  // 鋪面、道路、停車格
  const pave=(x,y,w,h,c)=>{const a=L(x,y),b=L(x+w,y+h);ctx.fillStyle=c;ctx.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));};
  pave(0,290,WW,580,'#8d9aa0');pave(70,640,290,320,'#55636b');pave(0,1000,WW,150,'#8d9aa0');
  road(0,300,WW,60);road(360,360,52,790);road(0,1090,WW,52);
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;cars.forEach(c=>{const a=L(c.x-8,c.y-6),b=L(c.x+c.w+8,c.y+c.h+6);ctx.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));});
  ctx.setLineDash([14,10]);ctx.strokeStyle='#f1d27acc';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(plaza.x,plaza.y,plaza.rx,plaza.ry,0,0,7);ctx.stroke();ctx.setLineDash([]);text('集合點 A',plaza.x,plaza.y,20,'#fff3c4',800);
  const g1=L(300,1112),g2=L(560,1112);ctx.strokeStyle='#e8c34a';ctx.lineWidth=6;ctx.setLineDash([16,10]);ctx.beginPath();ctx.moveTo(g1.x,g1.y);ctx.lineTo(g2.x,g2.y);ctx.stroke();ctx.setLineDash([]);
  const gt=L(150,1125);text('大門 GATE',gt.x,gt.y,14,'#fff',800);
  solids.forEach(building);
  pickups.forEach(p=>{ctx.fillStyle='#fff8';ctx.beginPath();ctx.arc(p.x,p.y,p.r*1.3,0,7);ctx.fill();text('📝',p.x,p.y,19,'#fff');});
  crowd.forEach(c=>{ctx.fillStyle='#16242e';ctx.beginPath();ctx.arc(c.x,c.y+2,c.r,0,7);ctx.fill();ctx.fillStyle=c.c;ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,7);ctx.fill();if(c.alert>0)text('！',c.x,c.y-17,17,'#ffd23f',900);});
  const hid=hidden(),near=dist(P,F)<100;
  if(!hid||near)person(F,'#b5432e','#e2e1dd','法克',hid?.55:1);
  else if(F.seenT>0&&F.seen){ctx.globalAlpha=Math.min(1,F.seenT);ctx.strokeStyle='#ffd23f';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(F.seen.x,F.seen.y,F.r*1.6,0,7);ctx.stroke();ctx.setLineDash([]);text('？',F.seen.x,F.seen.y,16,'#ffd23f');ctx.globalAlpha=1;}
  if(F.tired>0&&(!hid||near))text('💦',F.x+F.r,F.y-F.r,16,'#fff');
  person(P,boost>0?'#4f8fd6':'#3d6fa8','#1d1a17','會長',1);text('📦',P.x+P.r*.9,P.y+P.r*.2,16,'#fff');
  if(drag.t>0)text('🍯',P.x-P.r,P.y-P.r,14,'#fff');
  candies.forEach(c=>{const sp=Math.hypot(c.vx,c.vy)||1;ctx.strokeStyle=c.sticky?'#ff7ac699':'#ffffff55';ctx.lineWidth=6;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x-c.vx/sp*70,c.y-c.vy/sp*70);ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle=c.sticky?'#ff5fb855':'#ffffff30';ctx.beginPath();ctx.arc(c.x,c.y,c.r+4,0,7);ctx.fill();
   ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rot);text('🍬',0,0,40,'#fff');ctx.restore();
   rr(c.x-24,c.y+c.r+2,48,17,8);ctx.fillStyle=c.sticky?'#b0306fdd':'#0b1620cc';ctx.fill();text(c.sticky?'黏黏糖':'糖糖',c.x,c.y+c.r+10.5,11,'#fff');});
  // 樹叢與天橋畫在人物上方，才有「躲起來／走到天橋下」的效果
  bushes.forEach(b=>{ctx.fillStyle='#2f6b3d';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();ctx.fillStyle='#3f8a4f';[[-.35,-.3],[.3,-.25],[0,.25],[-.3,.3],[.35,.3]].forEach(o=>{ctx.beginPath();ctx.arc(b.x+o[0]*b.r,b.y+o[1]*b.r,b.r*.45,0,7);ctx.fill();});});
  if(hid&&F.seenT>0){const t=performance.now()/120;ctx.strokeStyle='#ffd23f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(F.bush.x+Math.sin(t)*3,F.bush.y,F.bush.r*.6,0,7);ctx.stroke();}
  const b1=L(205,280),b2=L(255,432);ctx.fillStyle='#cfe6f2bb';ctx.fillRect(Math.min(b1.x,b2.x),Math.min(b1.y,b2.y),Math.abs(b2.x-b1.x),Math.abs(b2.y-b1.y));const bm=L(230,370);ctx.save();ctx.translate(bm.x,bm.y);if(!rot)ctx.rotate(-Math.PI/2);text('天橋',0,0,12,'#1d3c55',800);ctx.restore();
  if(target.on){ctx.strokeStyle='#ffffffcc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(target.x,target.y,9,0,7);ctx.stroke();}
  ctx.restore();
  if(!hid)arrow(F,'法克','#ff8a7a');else if(F.seenT>0&&F.seen)arrow(F.seen,'目擊？','#ffd23f');
  const te=layer.querySelector('.cz-time');te.textContent='⏱ '+Math.ceil(time);te.classList.toggle('low',time<15);layer.querySelector('.cz-sheets').textContent='📦 '+sheets+' 份';
 }
 function loop(t){if(over)return;const dt=Math.min(.05,(t-(last||t))/1000);last=t;step(dt);if(!over)draw();raf=requestAnimationFrame(loop);}
 // 右下角搖桿：按住拖曳，方向與力道決定會長怎麼跑
 const joy=layer.querySelector('.cz-joy'),knob=joy.querySelector('i');
 function joyMove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;let dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}stick.x=dx;stick.y=dy;stick.on=true;knob.style.transform='translate('+(dx*R*.6)+'px,'+(dy*R*.6)+'px)';}
 function joyEnd(){stick.on=false;stick.x=stick.y=0;knob.style.transform='';joy.dragging=false;}
 joy.onpointerdown=e=>{e.preventDefault();joy.setPointerCapture&&joy.setPointerCapture(e.pointerId);joy.dragging=true;joyMove(e);};
 joy.onpointermove=e=>{if(joy.dragging)joyMove(e);};
 joy.onpointerup=joy.onpointercancel=joy.onlostpointercapture=joyEnd;
 cv.onpointerdown=e=>e.preventDefault();
 joyEnd();
 const kd=e=>{const kk=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(kk)){keys[kk]=true;target.on=false;e.preventDefault();e.stopPropagation();}else if(kk===' '||kk==='Enter'||/^[1-4]$/.test(kk))e.stopPropagation();};
 const ku=e=>{const kk=e.key.length===1?e.key.toLowerCase():e.key;keys[kk]=false;};
 const rs=()=>layout();
 window.addEventListener('keydown',kd,true);window.addEventListener('keyup',ku,true);window.addEventListener('resize',rs);
 this.stop=()=>{over=true;Sound.stop();joyEnd();layer.classList.remove('playing');cancelAnimationFrame(raf);window.removeEventListener('keydown',kd,true);window.removeEventListener('keyup',ku,true);window.removeEventListener('resize',rs);};
 this.end=(win,quit)=>{if(over)return;this.stop();Sound.sfx(win?'win':'lose');if(!win)draw();onEnd({win,quit:!!quit,used:Math.max(1,Math.round(LV.time-time)),sheets,level:LV});};
 // 測試用：唯讀的位置資訊（螢幕座標與世界座標）
 this.state=()=>({px:(P.x-camX)*k,py:(P.y-camY)*k,fx:(F.x-camX)*k,fy:(F.y-camY)*k,wx:P.x,wy:P.y,time,hidden:hidden(),d:dist(P,F),mode:F.mode,tired:F.tired,st:F.st,fwx:F.x,fwy:F.y});
 layer.classList.add('playing');Sound.start();Sound.sfx('siren');msg('🚨 疏散演練開始！找到法克！');
 raf=requestAnimationFrame(loop);
}
window.FackChase={mount,rank,TIME,LEVELS,Sound};
})();
