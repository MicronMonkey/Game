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
+'.cz-quit{background:none;border:1px solid #58798a;color:#dfe9ee;border-radius:8px;width:34px;height:34px;font-size:16px;cursor:pointer}'
+'.cz-cv{flex:1;min-height:0;width:100%;display:block;touch-action:none;cursor:crosshair}'
+'.cz-msg{position:absolute;left:50%;top:58px;transform:translateX(-50%);background:#f1d27a;color:#1b1b1b;font-weight:800;font-size:14px;padding:6px 14px;border-radius:999px;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}.cz-msg.on{opacity:1}'
+'.cz-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:22px;background:#07111bea;gap:6px;overflow-y:auto}'
+'.cz-card h2{margin:0;font:800 clamp(24px,6vw,38px) system-ui;color:#ffd98f}.cz-card p{margin:4px 0;line-height:1.7;font-size:15px;max-width:440px}'
+'.cz-card ul{text-align:left;font-size:14px;line-height:1.8;padding-left:20px;margin:6px 0 10px;max-width:440px}'
+'.cz-card .rank{font:800 20px system-ui;color:#9fe3c4;margin:4px 0}'
+'.cz-card .row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:6px}'
+'.cz-card button{border:0;border-radius:10px;background:#f1d09a;color:#102338;padding:13px 22px;font-weight:800;font-size:16px;cursor:pointer}.cz-card button.alt{background:#20394c;color:#f7f4ea;border:1px solid #8297a4}';

// ── 地圖（直式座標 760 × 1150；橫向螢幕時整張轉 90 度）──
const WW=760,WH=1150,VIEW=430,TIME=75;
const cars=[];[660,775,890].forEach((y,r)=>[0,1,2,3].forEach(i=>{if(!(r===1&&i===2))cars.push({t:'car',n:'',x:44+i*76,y,w:42,h:72,c:['#d8dde2','#5b6f86','#a33c3c','#2f3a46','#e6d7b8'][(i+r*2)%5]});}));
const SOLIDS=[
 {t:'fab',n:'FAB 無塵室廠房',x:30,y:30,w:440,h:250},
 {t:'gas',n:'氣體站',x:540,y:30,w:190,h:110},
 {t:'tower',n:'冷卻水塔',x:540,y:170,w:190,h:95},
 {t:'office',n:'辦公大樓',x:30,y:430,w:300,h:140},
 {t:'canteen',n:'員工餐廳',x:430,y:410,w:300,h:110},
 {t:'shed',n:'機車棚',x:645,y:770,w:85,h:165},
 {t:'truck',n:'消防車',x:450,y:800,w:150,h:46},
 {t:'guard',n:'警衛室',x:560,y:1050,w:130,h:62}
].concat(cars);
const TREES=[[92,612,34],[706,592,32],[470,975,38],[150,1040,40],[290,985,30],[520,555,26],[712,368,26],[500,330,22]];
const PLAZA={x:575,y:670,rx:125,ry:78};
const SHOUT=['「法克在{}！」','「往{}那邊跑了！」','「我看到他了，在{}！」','「{}！快！」'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function rank(sec){return sec<=15?'🏆 法克剋星':sec<=30?'🥇 追緝高手':sec<=50?'🥈 連署書快遞':'🥉 有追到就是贏';}

function mount(host,opts){
 opts=opts||{};
 if(!document.getElementById('cz-css')){const s=document.createElement('style');s.id='cz-css';s.textContent=CSS;document.head.append(s);}
 const layer=document.createElement('div');layer.className='cz-layer';
 layer.innerHTML='<div class="cz-top"><div><b>🏃 全民找法克</b><small>'+(opts.subtitle||'追上法克，把連署書交到他手上')+'</small></div><div class="cz-stats"><span class="cz-time">⏱ '+TIME+'</span><span class="cz-sheets">📦 120 份</span></div><button class="cz-quit" aria-label="不追了">✕</button></div><canvas class="cz-cv" role="img" aria-label="台中廠區追逐畫面"></canvas><div class="cz-msg" aria-live="polite"></div>';
 host.append(layer);
 let game=null;
 const api={layer,close(){if(game)game.stop();game=null;layer.remove();},retry(){clearCard();game=new Chase(layer,end);},state(){return game&&game.state?game.state():null;}};
 layer.querySelector('.cz-quit').onclick=()=>{if(game)game.end(false,true);else if(opts.onQuit)opts.onQuit(api);};
 function clearCard(){const o=layer.querySelector('.cz-card');if(o)o.remove();}
 function card(html){clearCard();const d=document.createElement('div');d.className='cz-card';d.innerHTML=html;layer.append(d);return d;}
 function end(r){
  r.rank=r.win?rank(r.used):'';
  if(opts.onEnd)opts.onEnd(r,api);
  const d=card(r.win?'<h2>追到了！</h2><div class="rank">'+r.rank+'</div><p>花了 <b>'+r.used+'</b> 秒，手上有 <b>'+r.sheets+'</b> 份連署書。'+(r.best?'<br>'+r.best:'')+'</p><div class="row"></div>'
   :'<h2>'+(r.quit?'先不追了':'演練結束')+'</h2><p>'+(r.quit?'你停下腳步，喘了口氣。':'廣播響起，人群散去。')+'<br>法克又神隱了。</p><div class="row"></div>');
  const row=d.querySelector('.row');
  (opts.buttons?opts.buttons(r,api):[{label:'再追一次',onClick:()=>api.retry()}]).forEach((b,i)=>{const el=document.createElement('button');el.textContent=b.label;if(b.alt)el.className='alt';el.onclick=()=>b.onClick(r,api);row.append(el);if(i===0)setTimeout(()=>el.focus(),0);});
 }
 const d=card('<h2>全民找法克</h2><p>'+(opts.intro||'你是桃園會長，抱著一箱連署書。<br>法克會逃、也會躲，追上他就算成功。')+'</p><ul><li><b>手機：</b>手指點或拖曳畫面，會長就往那裡跑。</li><li><b>電腦：</b>方向鍵或 WASD。</li><li>法克躲進🌳樹叢就看不見；同事看到他會喊「！」，畫面邊緣的箭頭會指向他。</li><li>撿起同事遞來的 📝 連署書，會長會衝刺一下。</li><li>法克衝刺完會喘 💦，那就是你的機會。</li></ul>'+(opts.introExtra||'')+'<div class="row"><button class="cz-start">開始追！</button></div>');
 d.querySelector('.cz-start').onclick=()=>api.retry();
 setTimeout(()=>d.querySelector('.cz-start').focus(),0);
 return api;
}

function Chase(layer,onEnd){
 const cv=layer.querySelector('.cz-cv'),ctx=cv.getContext('2d'),self=this;
 let VW=0,VH=0,k=1,rot=false,W=WW,H=WH,camX=0,camY=0,raf=0,last=0,over=false,time=TIME,sheets=120,boost=0,msgT=0,pickT=3,shoutCD=0;
 const P={x:0,y:0,r:15},F={x:0,y:0,r:15,dx:0,dy:-1,st:2.0,tired:0,mode:'run',bush:null,seen:null,seenT:0,hideT:0,hideCD:0},target={on:false,x:0,y:0},keys={};
 let solids=[],bushes=[],crowd=[],pickups=[],plaza=null;
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
 function fleeDir(){
  const dP=dist(F,P);let best=null,bs=-1e9;
  if(F.mode==='hide'&&F.bush&&dist(F,F.bush)<F.bush.r*.35)return{x:0,y:0};
  for(let i=0;i<16;i++){
   const a=i/16*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a),cx=F.x+dx*60,cy=F.y+dy*60;
   if(cx<F.r||cy<F.r||cx>W-F.r||cy>H-F.r||inSolid(cx,cy,F.r*.8))continue;
   if(F.mode==='hide'&&F.bush){const hs=-dist({x:cx,y:cy},F.bush)*1.5+dist({x:cx,y:cy},P)*.3+Math.random()*4;if(hs>bs){bs=hs;best={x:dx,y:dy};}continue;}
   let s=dist({x:cx,y:cy},P);
   s+=Math.min(cx,W-cx,cy,H-cy,160)*1.1-Math.hypot(cx-W/2,cy-H/2)*.18;
   s+=(dx*F.dx+dy*F.dy)*14;
   if(dP<100){const tx=(P.x-F.x)/dP,ty=(P.y-F.y)/dP;s+=Math.abs(dx*ty-dy*tx)*55;}
   let open=0;for(let j=0;j<8;j++){const b=j/8*Math.PI*2,ox=cx+Math.cos(b)*55,oy=cy+Math.sin(b)*55;if(ox>F.r&&oy>F.r&&ox<W-F.r&&oy<H-F.r&&!inSolid(ox,oy,F.r*.8))open++;}
   let run=60;while(run<240){const rx=F.x+dx*(run+20),ry=F.y+dy*(run+20);if(rx<F.r||ry<F.r||rx>W-F.r||ry>H-F.r||inSolid(rx,ry,F.r*.8))break;run+=20;}
   s+=open*9+Math.min(run,160)*.25+dist({x:F.x+dx*run,y:F.y+dy*run},P)*.45+Math.random()*8;
   if(s>bs){bs=s;best={x:dx,y:dy};}
  }
  return best||{x:-F.dx,y:-F.dy};
 }
 function step(dt){
  time-=dt;if(time<=0){time=0;self.end(false);return;}
  boost=Math.max(0,boost-dt);msgT-=dt;shoutCD-=dt;
  if(msgT<=0){const m=layer.querySelector('.cz-msg');m&&m.classList.remove('on');}
  let mx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),my=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
  if(!mx&&!my&&target.on){const d=dist(target,P);if(d>4){mx=(target.x-P.x)/d;my=(target.y-P.y)/d;}else target.on=false;}
  const ml=Math.hypot(mx,my);if(ml){const sp=(boost>0?215:152)*dt;P.x+=mx/ml*sp;P.y+=my/ml*sp;}
  collide(P);
  const dP=dist(F,P);
  if(F.tired>0)F.tired-=dt;
  else if(dP<110&&F.st>0){F.st-=dt;if(F.st<=0){F.st=0;F.tired=1.8;msg('法克喘不過氣了 💦 快追！');}}
  else F.st=Math.min(2.0,F.st+dt*(F.mode==='hide'?.6:time>35?.45:.3));
  const sprint=F.tired<=0&&dP<110&&F.st>0;
  F.hideCD=Math.max(0,F.hideCD-dt);if(hidden()){F.hideT+=dt;if(F.hideT>6){F.mode='run';F.hideT=0;F.hideCD=4;msg('法克待不住，從樹叢衝出來了！');}}
  if(F.mode!=='hide'&&F.hideCD<=0&&dP>230&&!sprint){const c=bushes.filter(b=>dist(b,P)>220&&openness(b)>=7).sort((a,b)=>(dist(a,F)-dist(a,P)*.5)-(dist(b,F)-dist(b,P)*.5))[0];if(c){F.mode='hide';F.bush=c;}}
  if(F.mode==='hide'&&dP<130)F.mode='run';
  const spd=F.tired>0?70:sprint?215:150;
  const d=fleeDir();F.x+=d.x*spd*dt;F.y+=d.y*spd*dt;if(d.x||d.y){F.dx=d.x;F.dy=d.y;}
  collide(F);
  if(F.mode==='run')F.bush=null;
  const hid=hidden();
  crowd.forEach(c=>{
   c.t-=dt;if(c.t<=0){c.a+=(Math.random()-.5)*2;c.t=1+Math.random()*2;}
   const ex=c.x+Math.cos(c.a)*18*dt,ey=c.y+Math.sin(c.a)*18*dt;c.x=ex;c.y=ey;collide(c);if(Math.abs(ex-c.x)>.01||Math.abs(ey-c.y)>.01)c.a+=Math.PI;
   c.alert=Math.max(0,c.alert-dt);
   if(dist(c,F)<(hid?100:75)){c.alert=1.2;if(hid){F.seen={x:F.x,y:F.y};F.seenT=1.8;}if(shoutCD<=0&&dist(F,P)>150){shoutCD=4;msg(SHOUT[Math.floor(Math.random()*SHOUT.length)].replace('{}',nearest(F)));}}
  });
  if(!hid){F.seen={x:F.x,y:F.y};F.seenT=1.8;}else F.seenT-=dt;
  pickT-=dt;if(pickT<=0&&pickups.length<3){const q=free();if(dist(q,P)<VIEW*.9)pickups.push(Object.assign(q,{r:13}));pickT=4+Math.random()*3;}
  pickups=pickups.filter(p=>{if(dist(p,P)<P.r+p.r){sheets+=30;boost=2.6;msg('同事塞來 30 份連署書！會長衝刺 💨');return false;}return true;});
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
  pave(0,290,WW,580,'#8d9aa0');pave(20,640,330,320,'#55636b');pave(0,1000,WW,150,'#8d9aa0');
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
 function pt(e){const r=cv.getBoundingClientRect();target.x=(e.clientX-r.left)/k+camX;target.y=(e.clientY-r.top)/k+camY;target.on=true;}
 cv.onpointerdown=e=>{e.preventDefault();cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);pt(e);cv.dragging=true;};
 cv.onpointermove=e=>{if(cv.dragging)pt(e);};
 cv.onpointerup=cv.onpointercancel=()=>{cv.dragging=false;};
 const kd=e=>{const kk=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(kk)){keys[kk]=true;target.on=false;e.preventDefault();e.stopPropagation();}else if(kk===' '||kk==='Enter'||/^[1-4]$/.test(kk))e.stopPropagation();};
 const ku=e=>{const kk=e.key.length===1?e.key.toLowerCase():e.key;keys[kk]=false;};
 const rs=()=>layout();
 window.addEventListener('keydown',kd,true);window.addEventListener('keyup',ku,true);window.addEventListener('resize',rs);
 this.stop=()=>{over=true;cancelAnimationFrame(raf);window.removeEventListener('keydown',kd,true);window.removeEventListener('keyup',ku,true);window.removeEventListener('resize',rs);};
 this.end=(win,quit)=>{if(over)return;this.stop();if(!win)draw();onEnd({win,quit:!!quit,used:Math.max(1,Math.round(TIME-time)),sheets});};
 // 測試用：唯讀的位置資訊（螢幕座標與世界座標）
 this.state=()=>({px:(P.x-camX)*k,py:(P.y-camY)*k,fx:(F.x-camX)*k,fy:(F.y-camY)*k,wx:P.x,wy:P.y,time,hidden:hidden(),d:dist(P,F),mode:F.mode,tired:F.tired,st:F.st,fwx:F.x,fwy:F.y});
 raf=requestAnimationFrame(loop);
}
window.FackChase={mount,rank,TIME};
})();
