/* 11/3 疏散演練＋「全民找法克」追逐小遊戲。
   小說情節：角色、事件與結果皆為虛構，不描述任何真實人物的行為。 */
(function(){
'use strict';

// ── 角色、證物、場景 ──
C.ty=['桃園會長','本段可操作角色','#3d6fa8','#1d1a17'];
PERSON_NOTES.ty='桃園廠區的會長，11/3 抱著整箱連署書去找法克。';
E.petitionF={n:'11/3 連署書交付紀錄',src:'小說事件：疏散演練集合區',h:'第 5 章：11/3 疏散演練',yes:'連署書在集合區眾人見證下，親手交到法克手上；時間與在場人數都有人記下。',no:'交到手上不代表對方同意任何訴求，之後的回覆還要繼續追蹤。',ch:5};
DOCUMENTS.petitionF=['連署書交付紀錄','11 / 3 親手交付','小說虛構・集合區見證'];

BG.drill=function(){
 return G('#6f8fa8','#203646')
 +R(0,70,800,190,'#2c4659',0)
 +[0,1,2,3,4,5,6,7,8].map(i=>R(30+i*86,100,58,34,i%3?'#9cc0cf':'#f0d9a8',3,.55)+R(30+i*86,160,58,34,'#9cc0cf',3,.4)).join('')
 +R(0,255,800,195,'#3c505d',0)
 +[0,1,2,3,4,5,6].map(i=>'<path d="M'+(40+i*120)+' 270V330" stroke="#d9dccf" stroke-width="3" opacity=".35"/>').join('')
 +'<ellipse cx="400" cy="372" rx="190" ry="44" fill="none" stroke="#f1d27a" stroke-width="5" stroke-dasharray="18 12" opacity=".75"/>'+T(400,380,'集合點 A',20,'#f6e3a6',700)
 +R(560,214,200,70,'#c7372c',8)+R(575,196,120,22,'#9aa7ad',3)+'<path d="M580 207H690" stroke="#e7ecee" stroke-width="3"/><circle cx="600" cy="290" r="15" fill="#151b22"/><circle cx="725" cy="290" r="15" fill="#151b22"/>'+T(660,256,'消防車',18,'#fff',700)
 +'<circle cx="720" cy="198" r="10" fill="#ff5b4d"/><circle cx="720" cy="198" r="26" fill="#ff5b4d" opacity=".25"/>'
 +'<path d="M120 380V196" stroke="#d6dbd8" stroke-width="5"/><path d="M122 198H200L186 214L200 230H122Z" fill="#e2b04c"/>'+T(160,219,'集合',13,'#1f2a33',700)
 +[0,1,2,3,4,5,6,7,8,9,10].map(i=>{const x=60+i*68,y=318+(i%3)*16;return '<circle cx="'+x+'" cy="'+(y-20)+'" r="11" fill="'+(i%2?'#f1d36b':'#e8edf0')+'"/><path d="M'+(x-17)+' '+(y+26)+'Q'+x+' '+(y-12)+' '+(x+17)+' '+(y+26)+'Z" fill="'+(i%2?'#20384b':'#2e4a5e')+'"/>';}).join('')
 +R(220,22,360,38,'#0e2434',4)+T(400,48,'11/3 廠區疏散演練',21,'#ffe3b0',700);
};

// ── 劇情節點（第 5 章結尾 → 第 6 章前）──
S.c5b.n='c5drill';
S.c5drill={b:'drill',sp:'旁白',t:'【11/3・廠區疏散演練】警報響起，全廠照著路線往集合區移動。點名點到一半，人群突然一陣騷動——神隱很久的法克，竟然出現在集合區的另一頭。手機群組瞬間炸開：「法克出現了！」「在消防車旁邊！」',n:'c5drill2'};
S.c5drill2={b:'drill',l:'ty',r:'fk',sp:'ty',t:'這一段，你換成桃園會長的視角。懷裡正好抱著一整箱會員連署書。「這次一定要親手交給他。」——全民找法克，開始。',
 c:()=>[
  {t:'抱起連署書箱，去追法克（小遊戲）',g:'c5drill2',do:()=>setTimeout(launch,60)},
  {t:'不追了，把連署書交給大家公開保存（略過小遊戲）',g:'c5drillSkip',fx:{flag:'fk_skip'}}
 ]};
S.c5drillWin={b:'drill',l:'ty',r:'fk',sp:'fk',t:'你在集合點旁追上法克，把整箱連署書放進他手裡。周圍的同事舉起手機，不是起鬨，而是把這一刻記下來：11/3，連署書已親手交付。法克沉默了很久，只說了一句：「……我會看。」',n:'c6a'};
S.c5drillLose={b:'drill',l:'ty',sp:'ty',t:'「演練結束，請各單位回到工作崗位。」廣播響起，法克消失在散去的人群裡，又神隱了。連署書沒交出去，可是這一路上，有幾十個人幫你指路、幫你扶箱子——大家都看見了。',n:'c6a'};
S.c5drillSkip={b:'drill',sp:'旁白',t:'你沒有去追。連署書由各班代表一起清點、拍照、公開保存，等下一次正式場合再交。法克在演練結束前就不見了。',n:'c6a'};

// ── 小遊戲 ──
const CSS='#chase-layer{position:absolute;inset:0;z-index:15;background:#0b1620;color:#f3eee4;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none}'
+'.cz-top{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#10222f;border-bottom:1px solid #35566a}'
+'.cz-top b{display:block;font-size:15px;color:#ffd98f}.cz-top small{display:block;font-size:11px;color:#a9c3cf}.cz-top>div:first-child{flex:1;min-width:0}'
+'.cz-stats{display:flex;gap:6px;font:700 13px system-ui;white-space:nowrap}.cz-stats span{background:#1d3a4c;border-radius:999px;padding:5px 9px}#cz-time.low{background:#9b2f2f}'
+'#cz-quit{background:none;border:1px solid #58798a;color:#dfe9ee;border-radius:8px;width:34px;height:34px;font-size:16px}'
+'#cz-cv{flex:1;min-height:0;width:100%;display:block;touch-action:none;cursor:crosshair}'
+'#cz-msg{position:absolute;left:50%;top:58px;transform:translateX(-50%);background:#f1d27a;color:#1b1b1b;font-weight:800;font-size:14px;padding:6px 14px;border-radius:999px;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}#cz-msg.on{opacity:1}'
+'.cz-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:22px;background:#07111bea;gap:6px}'
+'.cz-card h2{margin:0;font:800 clamp(24px,6vw,38px) system-ui;color:#ffd98f}.cz-card p{margin:4px 0;line-height:1.7;font-size:15px;max-width:440px}'
+'.cz-card ul{text-align:left;font-size:14px;line-height:1.8;padding-left:20px;margin:6px 0 10px;max-width:440px}'
+'.cz-card button{border:0;border-radius:10px;background:#f1d09a;color:#102338;padding:13px 26px;font-weight:800;font-size:16px;margin:4px;cursor:pointer}.cz-card button.alt{background:#20394c;color:#f7f4ea;border:1px solid #8297a4}';

let layer=null;
function launch(){
 if(layer||!document.querySelector('#stage'))return;
 if(!document.querySelector('#chase-css')){const s=document.createElement('style');s.id='chase-css';s.textContent=CSS;document.head.append(s);}
 layer=document.createElement('div');layer.id='chase-layer';
 layer.innerHTML='<div class="cz-top"><div><b>🏃 全民找法克</b><small>追上法克，把連署書交到他手上</small></div><div class="cz-stats"><span id="cz-time">⏱ 75</span><span id="cz-sheets">📦 120 份</span></div><button id="cz-quit" aria-label="不追了">✕</button></div><canvas id="cz-cv" role="img" aria-label="集合區追逐畫面"></canvas><div id="cz-msg" aria-live="polite"></div>';
 document.querySelector('#stage').append(layer);
 layer.querySelector('#cz-quit').onclick=()=>game&&game.end(false,true);
 intro();
}
function card(html){const old=layer.querySelector('.cz-card');if(old)old.remove();const d=document.createElement('div');d.className='cz-card';d.innerHTML=html;layer.append(d);return d;}
function intro(){
 const d=card('<h2>全民找法克</h2><p>你是桃園會長，抱著一箱連署書。<br>法克會逃、也會躲，追上他就算成功。</p><ul><li><b>手機：</b>手指點或拖曳畫面，會長就往那裡跑。</li><li><b>電腦：</b>方向鍵或 WASD。</li><li>法克躲進🌳花圃後會看不見；同事看到他會喊「！」幫你指路。</li><li>撿起同事遞來的 📝 連署書，會長會衝刺一下。</li><li>法克衝刺完會喘 💦，那就是你的機會。</li></ul><button id="cz-start">開始追！</button>');
 d.querySelector('#cz-start').onclick=()=>{d.remove();game=new Chase();};
 d.querySelector('#cz-start').focus();
}
let game=null;
function close(){if(game)game.stop();game=null;if(layer){layer.remove();layer=null;}}
function finish(win){
 close();
 if(win)pick({t:'追上法克，親手交出連署書',g:'c5drillWin',fx:{sup:1,trust:1,ev:'petitionF',flag:'fk_caught'}});
 else pick({t:'法克又神隱了',g:'c5drillLose',fx:{flag:'fk_escaped'}});
}

// 地圖以「直式」座標設計（寬 760 × 高 1150），橫向螢幕時整張轉 90 度。
const LAND=[
 {n:'B 棟門口',x:.05,y:.08,w:.30,h:.07,c:'#3e5a6e'},
 {n:'警衛室',x:.70,y:.05,w:.16,h:.06,c:'#55636e'},
 {n:'消防車',x:.56,y:.20,w:.32,h:.06,c:'#c7372c'},
 {n:'救護車',x:.10,y:.33,w:.22,h:.05,c:'#e8ecef',tc:'#a3302a'},
 {n:'交通車',x:.44,y:.62,w:.26,h:.06,c:'#d9a640',tc:'#2a1e0a'},
 {n:'機車棚',x:.80,y:.50,w:.10,h:.16,c:'#5a6b52'},
 {n:'貨櫃',x:.08,y:.64,w:.12,h:.12,c:'#2f6f8f'},
 {n:'C 棟側門',x:.60,y:.88,w:.32,h:.07,c:'#3e5a6e'}
];
const BUSH=[{x:.84,y:.36,r:.06},{x:.22,y:.22,r:.055},{x:.40,y:.79,r:.06},{x:.88,y:.76,r:.05},{x:.12,y:.88,r:.06},{x:.30,y:.50,r:.05},{x:.62,y:.40,r:.045},{x:.18,y:.05,r:.04}];
const SHOUT=['「法克在{}！」','「往{}那邊跑了！」','「我看到他了，在{}！」','「{}！快！」'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const WW=760,WH=1150,VIEW=430;

function Chase(){
 const cv=layer.querySelector('#cz-cv'),ctx=cv.getContext('2d'),self=this;
 let VW=0,VH=0,k=1,rot=false,W=WW,H=WH,camX=0,camY=0,raf=0,last=0,over=false,time=75,sheets=120,boost=0,msgT=0,pickT=3,shoutCD=0;
 const P={x:0,y:0,r:15},F={x:0,y:0,r:15,dx:0,dy:-1,st:2.0,tired:0,mode:'run',bush:null,seen:null,seenT:0},target={on:false,x:0,y:0},keys={};
 let solids=[],bushes=[],crowd=[],pickups=[];
 // 世界座標 W×H；橫向螢幕就把直式地圖轉成橫式
 const L=(x,y)=>rot?{x:y*W,y:(1-x)*H}:{x:x*W,y:y*H};
 function build(){
  rot=VW>VH;W=rot?WH:WW;H=rot?WW:WH;
  solids=LAND.map(o=>{const a=L(o.x,o.y),b=L(o.x+o.w,o.y+o.h);return{n:o.n,c:o.c,tc:o.tc,x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};});
  bushes=BUSH.map(b=>Object.assign(L(b.x,b.y),{r:b.r*WW*1.1}));
 }
 function layout(){
  const r=cv.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  VW=Math.max(200,r.width);VH=Math.max(200,r.height);cv.width=VW*dpr;cv.height=VH*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  k=Math.min(VW,VH)/VIEW;
  const wasRot=rot;if(!solids.length||(VW>VH)!==wasRot){const ow=W,oh=H;build();if(P.x){[P,F,target,...crowd,...pickups].forEach(e=>{const nx=e.x/ow,ny=e.y/oh;const q=rot?{x:ny*W,y:(1-nx)*H}:{x:(1-ny)*W,y:nx*H};e.x=q.x;e.y=q.y;});F.bush=null;F.mode='run';}}
 }
 layout();
 Object.assign(P,L(.5,.97));Object.assign(F,L(.5,.70));
 for(let i=0;i<26;i++){const p=free();crowd.push({x:p.x,y:p.y,r:7,a:Math.random()*6.28,t:0,alert:0,c:['#e8edf0','#f1d36b','#9cc0cf'][i%3]});}
 function inSolid(x,y,pad){return solids.some(s=>x>s.x-pad&&x<s.x+s.w+pad&&y>s.y-pad&&y<s.y+s.h+pad);}
 function free(){for(let n=0;n<80;n++){const x=W*(.05+Math.random()*.9),y=H*(.05+Math.random()*.9);if(!inSolid(x,y,20)&&dist({x,y},P)>80)return{x,y};}return{x:W/2,y:H/2};}
 function collide(e){
  e.x=Math.max(e.r,Math.min(W-e.r,e.x));e.y=Math.max(e.r,Math.min(H-e.r,e.y));
  for(const s of solids){const cx=Math.max(s.x,Math.min(e.x,s.x+s.w)),cy=Math.max(s.y,Math.min(e.y,s.y+s.h)),dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy);
   if(d<e.r){if(d>0.01){e.x=cx+dx/d*e.r;e.y=cy+dy/d*e.r;}else{const l=e.x-s.x,r=s.x+s.w-e.x,t=e.y-s.y,b=s.y+s.h-e.y,m=Math.min(l,r,t,b);if(m===l)e.x=s.x-e.r;else if(m===r)e.x=s.x+s.w+e.r;else if(m===t)e.y=s.y-e.r;else e.y=s.y+s.h+e.r;}}}
 }
 function hidden(){return !!(F.bush&&dist(F,F.bush)<F.bush.r*.75);}
 function nearest(p){let best='集合點',bd=1e9;solids.forEach(s=>{const d=dist(p,{x:s.x+s.w/2,y:s.y+s.h/2});if(d<bd){bd=d;best=s.n}});bushes.forEach(b=>{const d=dist(p,b);if(d<bd){bd=d;best='花圃'}});return best;}
 function msg(t){const m=layer&&layer.querySelector('#cz-msg');if(!m)return;m.textContent=t;m.classList.add('on');msgT=2.2;}
 // 法克的逃跑 AI：16 個方向中挑「離會長遠、四周開闊、不撞牆」的路線；甩開了就找花圃躲。
 function fleeDir(){
  const dP=dist(F,P);let best=null,bs=-1e9;
  if(F.mode==='hide'&&F.bush&&dist(F,F.bush)<F.bush.r*.35)return{x:0,y:0};
  for(let i=0;i<16;i++){
   const a=i/16*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a),cx=F.x+dx*60,cy=F.y+dy*60;
   if(cx<F.r||cy<F.r||cx>W-F.r||cy>H-F.r||inSolid(cx,cy,F.r*.8))continue;
   let s=F.mode==='hide'&&F.bush?-dist({x:cx,y:cy},F.bush)*1.4+dist({x:cx,y:cy},P)*.4:dist({x:cx,y:cy},P);
   s+=Math.min(cx,W-cx,cy,H-cy,110)*.9;
   s+=(dx*F.dx+dy*F.dy)*14;
   if(dP<100){const tx=(P.x-F.x)/dP,ty=(P.y-F.y)/dP;s+=Math.abs(dx*ty-dy*tx)*55;}
   let open=0;for(let j=0;j<8;j++){const b=j/8*Math.PI*2,ox=cx+Math.cos(b)*55,oy=cy+Math.sin(b)*55;if(ox>F.r&&oy>F.r&&ox<W-F.r&&oy<H-F.r&&!inSolid(ox,oy,F.r*.8))open++;}
   s+=open*9+Math.random()*8;
   if(s>bs){bs=s;best={x:dx,y:dy};}
  }
  return best||{x:-F.dx,y:-F.dy};
 }
 function step(dt){
  time-=dt;if(time<=0){time=0;self.end(false);return;}
  boost=Math.max(0,boost-dt);msgT-=dt;shoutCD-=dt;
  if(msgT<=0){const m=layer.querySelector('#cz-msg');m&&m.classList.remove('on');}
  // 會長移動（鍵盤方向依螢幕，不受地圖旋轉影響）
  let mx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),my=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
  if(!mx&&!my&&target.on){const d=dist(target,P);if(d>4){mx=(target.x-P.x)/d;my=(target.y-P.y)/d;}else target.on=false;}
  const ml=Math.hypot(mx,my);if(ml){const sp=(boost>0?215:152)*dt;P.x+=mx/ml*sp;P.y+=my/ml*sp;}
  collide(P);
  // 法克：被追近就衝刺，衝完會喘；甩開後找花圃躲
  const dP=dist(F,P);
  if(F.tired>0)F.tired-=dt;
  else if(dP<135&&F.st>0){F.st-=dt;if(F.st<=0){F.st=0;F.tired=1.8;msg('法克喘不過氣了 💦 快追！');}}
  else F.st=Math.min(2.0,F.st+dt*(F.mode==='hide'?.6:time>35?.4:.28));
  const sprint=F.tired<=0&&dP<135&&F.st>0;
  if(F.mode!=='hide'&&dP>230&&!sprint){const c=bushes.filter(b=>dist(b,P)>220).sort((a,b)=>(dist(a,F)-dist(a,P)*.5)-(dist(b,F)-dist(b,P)*.5))[0];if(c){F.mode='hide';F.bush=c;}}
  if(F.mode==='hide'&&dP<130)F.mode='run';
  const spd=F.tired>0?72:sprint?210:F.mode==='hide'?145:132;
  const d=fleeDir();F.x+=d.x*spd*dt;F.y+=d.y*spd*dt;if(d.x||d.y){F.dx=d.x;F.dy=d.y;}
  collide(F);
  if(F.mode==='run')F.bush=null;
  // 群眾：看到法克就喊並指路
  const hid=hidden();
  crowd.forEach(c=>{
   c.t-=dt;if(c.t<=0){c.a+=(Math.random()-.5)*2;c.t=1+Math.random()*2;}
   const bx=c.x,by=c.y;c.x+=Math.cos(c.a)*18*dt;c.y+=Math.sin(c.a)*18*dt;collide(c);if(Math.abs(bx+Math.cos(c.a)*18*dt-c.x)>.01||Math.abs(by+Math.sin(c.a)*18*dt-c.y)>.01)c.a+=Math.PI;
   c.alert=Math.max(0,c.alert-dt);
   if(dist(c,F)<(hid?100:75)){c.alert=1.2;if(hid){F.seen={x:F.x,y:F.y};F.seenT=1.8;}if(shoutCD<=0&&dist(F,P)>150){shoutCD=4;msg(SHOUT[Math.floor(Math.random()*SHOUT.length)].replace('{}',nearest(F)));}}
  });
  if(!hid){F.seen={x:F.x,y:F.y};F.seenT=1.8;}else F.seenT-=dt;
  // 同事遞來的連署書
  pickT-=dt;if(pickT<=0&&pickups.length<3){const q=free();if(dist(q,P)<VIEW*.9)pickups.push(Object.assign(q,{r:13}));pickT=4+Math.random()*3;}
  pickups=pickups.filter(p=>{if(dist(p,P)<P.r+p.r){sheets+=30;boost=2.6;msg('同事塞來 30 份連署書！會長衝刺 💨');return false;}return true;});
  if(dist(P,F)<P.r+F.r*.95)self.end(true);
 }
 function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
 function text(t,x,y,size,color,weight){ctx.font=(weight||700)+' '+size+'px system-ui,"PingFang TC","Noto Sans TC",sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y);}
 function person(e,body,hair,label,alpha){
  ctx.globalAlpha=alpha;ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(e.x,e.y+e.r*.9,e.r,e.r*.4,0,0,7);ctx.fill();
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();
  ctx.fillStyle='#f1c9a5';ctx.beginPath();ctx.arc(e.x,e.y-e.r*.15,e.r*.55,0,7);ctx.fill();
  ctx.fillStyle=hair;ctx.beginPath();ctx.arc(e.x,e.y-e.r*.35,e.r*.58,Math.PI,0);ctx.fill();
  ctx.globalAlpha=1;rr(e.x-23,e.y-e.r-27,46,18,9);ctx.fillStyle='#0b1620cc';ctx.fill();text(label,e.x,e.y-e.r-18,12,'#fff');
 }
 function arrow(p,label,color){
  // 畫在螢幕座標：目標在畫面外時，邊緣顯示方向箭頭
  const sx=(p.x-camX)*k,sy=(p.y-camY)*k,m=26;if(sx>0&&sy>0&&sx<VW&&sy<VH)return;
  const cx=VW/2,cy=VH/2,a=Math.atan2(sy-cy,sx-cx),t=Math.min((VW/2-m)/Math.abs(Math.cos(a)||1e-6),(VH/2-m)/Math.abs(Math.sin(a)||1e-6)),ax=cx+Math.cos(a)*t,ay=cy+Math.sin(a)*t;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-8,-11);ctx.lineTo(-8,11);ctx.closePath();ctx.fill();ctx.restore();
  rr(ax-Math.cos(a)*30-24,ay-Math.sin(a)*30-11,48,22,11);ctx.fillStyle='#0b1620dd';ctx.fill();text(label,ax-Math.cos(a)*30,ay-Math.sin(a)*30,12,color);
 }
 function draw(){
  camX=Math.max(0,Math.min(W-VW/k,P.x-VW/k/2));camY=Math.max(0,Math.min(H-VH/k,P.y-VH/k/2));
  if(W<VW/k)camX=(W-VW/k)/2;if(H<VH/k)camY=(H-VH/k)/2;
  ctx.fillStyle='#22313a';ctx.fillRect(0,0,VW,VH);
  ctx.save();ctx.scale(k,k);ctx.translate(-camX,-camY);
  ctx.fillStyle='#3c505d';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#d9dccf2a';ctx.lineWidth=2;for(let x=40;x<W;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  ctx.strokeStyle='#ffffff18';ctx.lineWidth=4;ctx.strokeRect(2,2,W-4,H-4);
  const A=L(.5,.5);ctx.setLineDash([14,10]);ctx.strokeStyle='#f1d27a99';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(A.x,A.y,rot?120:150,rot?150:120,0,0,7);ctx.stroke();ctx.setLineDash([]);text('集合點 A',A.x,A.y,18,'#f6e3a6aa');
  solids.forEach(s=>{ctx.fillStyle='#0005';rr(s.x+3,s.y+5,s.w,s.h,6);ctx.fill();ctx.fillStyle=s.c;rr(s.x,s.y,s.w,s.h,6);ctx.fill();text(s.n,s.x+s.w/2,s.y+s.h/2,Math.min(15,s.w/4),s.tc||'#fff');});
  pickups.forEach(p=>{ctx.fillStyle='#fff6';ctx.beginPath();ctx.arc(p.x,p.y,p.r*1.3,0,7);ctx.fill();text('📝',p.x,p.y,19,'#fff');});
  crowd.forEach(c=>{ctx.fillStyle='#16242e';ctx.beginPath();ctx.arc(c.x,c.y+2,c.r,0,7);ctx.fill();ctx.fillStyle=c.c;ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,7);ctx.fill();if(c.alert>0)text('！',c.x,c.y-17,17,'#ffd23f',900);});
  const hid=hidden(),near=dist(P,F)<100;
  if(!hid||near)person(F,'#b5432e','#e2e1dd','法克',hid?.55:1);
  else if(F.seenT>0&&F.seen){ctx.globalAlpha=Math.min(1,F.seenT);ctx.strokeStyle='#ffd23f';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(F.seen.x,F.seen.y,F.r*1.6,0,7);ctx.stroke();ctx.setLineDash([]);text('？',F.seen.x,F.seen.y,16,'#ffd23f');ctx.globalAlpha=1;}
  if(F.tired>0&&(!hid||near))text('💦',F.x+F.r,F.y-F.r,16,'#fff');
  bushes.forEach(b=>{ctx.fillStyle='#2f6b3d';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();ctx.fillStyle='#3f8a4f';[[-.35,-.3],[.3,-.25],[0,.25],[-.3,.3],[.35,.3]].forEach(o=>{ctx.beginPath();ctx.arc(b.x+o[0]*b.r,b.y+o[1]*b.r,b.r*.45,0,7);ctx.fill();});});
  if(hid&&F.seenT>0){const t=performance.now()/120;ctx.strokeStyle='#ffd23f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(F.bush.x+Math.sin(t)*3,F.bush.y,F.bush.r*.6,0,7);ctx.stroke();}
  if(target.on){ctx.strokeStyle='#ffffffaa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(target.x,target.y,9,0,7);ctx.stroke();}
  person(P,boost>0?'#4f8fd6':'#3d6fa8','#1d1a17','會長',1);text('📦',P.x+P.r*.9,P.y+P.r*.2,16,'#fff');
  ctx.restore();
  if(!hid)arrow(F,'法克','#ff8a7a');else if(F.seenT>0&&F.seen)arrow(F.seen,'目擊？','#ffd23f');
  const te=layer.querySelector('#cz-time');te.textContent='⏱ '+Math.ceil(time);te.classList.toggle('low',time<15);layer.querySelector('#cz-sheets').textContent='📦 '+sheets+' 份';
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
 this.end=(win,quit)=>{
  if(over)return;this.stop();if(!win)draw();
  const used=Math.round(75-time);
  const d=win?card('<h2>追到了！</h2><p>你在集合區追上法克，<br>花了 <b>'+used+'</b> 秒，手上有 <b>'+sheets+'</b> 份連署書。</p><button id="cz-done">把連署書交給法克 →</button>')
   :card('<h2>'+(quit?'先不追了':'演練結束')+'</h2><p>'+(quit?'你停下腳步，喘了口氣。':'廣播響起，人群散去。')+'<br>法克又神隱了。</p><button id="cz-retry">再追一次</button><button class="alt" id="cz-done">接受結果，繼續故事</button>');
  d.querySelector('#cz-done').onclick=()=>finish(win);
  const r=d.querySelector('#cz-retry');if(r)r.onclick=()=>{d.remove();game=new Chase();};
  (r||d.querySelector('#cz-done')).focus();
 };
 // 測試用：只讀取目前位置（螢幕座標）
 this.state=()=>({px:(P.x-camX)*k,py:(P.y-camY)*k,fx:(F.x-camX)*k,fy:(F.y-camY)*k,time,wx:P.x,wy:P.y,hidden:hidden(),d:dist(P,F),mode:F.mode,tired:F.tired,st:F.st});
 raf=requestAnimationFrame(loop);
}
window.launchFackChase=launch;
window.fackChaseState=()=>game&&game.state?game.state():null;
})();
