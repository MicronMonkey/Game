/* 全民找法克・冒險模式關卡定義（四關＋每日挑戰地圖產生器）
   人物、事件與地圖皆為虛構創作。 */
(function(){
'use strict';
const A=window.FackAdv,{dist,clamp}=A.util,snd=A.util.snd,{rr,txt}=A.draw;
const segDist=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);};
const inRect=(p,r)=>p.x>r.x&&p.x<r.x+r.w&&p.y>r.y&&p.y<r.y+r.h;
const shuffle=(rng,a)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function hiddenClue(g,x,y,stage){g.addItem('diary',x,y,{icon:'📔',hiddenUntilNear:true,glow:'#c39bd355',ring:'#e3c6ff',onPick:(g)=>{g.hidden=true;snd().sfx('win');g.msg('📔 隱藏線索：「'+DIARY[stage]+'」',4);g.puff(x,y,'隱藏線索！','#e3c6ff',16);}});}
const DIARY={night:'法克的日記：今天又成功神隱了一天。',escort:'法克的便條：連署書太重了，交給會長搬就好。',tenday:'法克的行事曆：十天後再出現，大家應該都忘了吧？',boss:'法克的草稿：如果被抓到，就說「我只是路過」。'};
function exitDoor(c,e,open,now){c.fillStyle=open?'#1e6b45':'#4a2a2a';rr(c,e.x,e.y,e.w,e.h,8);c.fill();c.strokeStyle=open?'#7dffb8':'#c98b8b';c.lineWidth=3;c.stroke();txt(c,open?'🚪 出口':'🔒 出口',e.x+e.w/2,e.y+e.h/2,15,'#fff',900);
 if(open){c.globalAlpha=.35+.25*Math.sin(now*4);c.strokeStyle='#7dffb8';c.lineWidth=8;rr(c,e.x-6,e.y-6,e.w+12,e.h+12,12);c.stroke();c.globalAlpha=1;}}

// 法克的逃跑移動（冒險 Boss 與每日挑戰共用）：沿逃跑場移動，含體力／喘氣機制，保證可以追得上。
function fackStep(g,F,dt,spd){const P=g.P;F.planT=(F.planT||0)-dt;
 if(F.planT<=0||!g.fleeF){g.fleeF=g.nav.flee(g.nav.bfs(g.nav.cell(P.x,P.y)));F.planT=dist(F,P)<180?.15:.35;}
 const d=dist(F,P);
 if(F.tired>0){F.tired-=dt;spd*=.4;}
 else if(d<230){F.st-=dt;if(F.st<=0){F.st=0;F.tired=F.tiredDur||2;if(!F.quiet){g.msg('法克喘不過氣了 💦 快追！');snd().sfx('puff');}}}
 else F.st=Math.min(F.stMax||4,F.st+dt*.6);
 if(F.burst>0){F.burst-=dt;spd*=1.7;}
 let v=g.nav.dir(g.fleeF,F.x,F.y);
 if(!v){const dx=F.x-P.x,dy=F.y-P.y,l=Math.hypot(dx,dy)||1;v={x:dx/l,y:dy/l};}
 if(F.zig){const a=Math.sin(g.t*3.4)*.75,cs=Math.cos(a),sn=Math.sin(a);v={x:v.x*cs-v.y*sn,y:v.x*sn+v.y*cs};}
 const ox=F.x,oy=F.y;F.x+=v.x*spd*dt;F.y+=v.y*spd*dt;g.collide(F);F.fx=v.x;F.fy=v.y;F.mv=Math.hypot(F.x-ox,F.y-oy)>.1?1:0;F.walk=(F.walk||0)+dt*12;}
function drawFack(g,c,F,o){o=o||{};g.person(F,'#b5432e','#e2e1dd',o.name||'法克',{alpha:o.alpha});
 if(o.doc)txt(c,'📄',F.x-F.r-4,F.y+4,15,'#fff');
 if(F.tired>0)txt(c,'💦',F.x+F.r,F.y-F.r,15,'#fff');
 if(F.dizzy>0)txt(c,'💫',F.x,F.y-F.r-6,16,'#fff');
 if(F.frozen){c.strokeStyle='#9ae7ff';c.lineWidth=3;c.beginPath();c.arc(F.x,F.y,F.r+8,0,7);c.stroke();txt(c,'🧊',F.x+F.r+6,F.y-F.r-8,18,'#fff');}
 if(F.inv>0){c.globalAlpha=.5;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(F.x,F.y,F.r+5,0,7);c.stroke();c.globalAlpha=1;}}
function bubble(c,text,x,y){c.font='850 13px system-ui';const w=Math.max(110,c.measureText(text).width+24);c.fillStyle='#fff3d8';rr(c,x-w/2,y-18,w,34,12);c.fill();c.strokeStyle='#8b584b';c.lineWidth=2;c.stroke();txt(c,text,x,y-1,13,'#402b28',850);}
A.fx={fackStep,drawFack,bubble};

/* ── 第一關：深夜追蹤｜消失的法克 ── */
const CLUE_TEXT=['法克的工作證，照片已經泛黃','一張寫著「先閃了」的便利貼','一杯還溫溫的手搖飲（半糖去冰）','打卡機紙條：只有上班、沒有下班','監視器截圖：一個背影往北邊跑'];
const night={
 id:'night',icon:'🔦',name:'深夜追蹤',full:'第一關｜深夜追蹤・消失的法克',kick:'STAGE 1 / NIGHT SHIFT',
 story:'半夜的廠區只剩巡邏員。傳說法克消失前，在廠區各處留下了五個線索……',
 goals:['🔍 找到 5 個線索，鑰匙就會出現','🔑 撿起鑰匙，前往最上方的 🚪 出口','🔋 手電筒會耗電，撿電池補充'],
 tips:['巡邏員前方的扇形是視野；被看到會追你，躲到建築物後面就能甩開','電量越低照得越近，但不會全黑','線索在黑暗中會偶爾閃光 ✦'],
 view:400,theme:{floor:'#3c4b52',wall:'#4a5862',grid:'#ffffff0b'},
 setup(g){g.W=1100;g.H=1300;g.limit=240*g.diff.time;
  const R=(x,y,w,h,label,kind)=>g.solids.push({x,y,w,h,label,kind});
  R(80,120,260,180,'廠房 A','fab');R(430,130,240,150,'廠房 B','fab');R(780,100,240,220,'倉庫','ware');
  R(100,470,220,150,'辦公室','office');R(450,450,190,80,'貨櫃','box');R(450,610,190,80,'貨櫃','box');R(760,470,260,190,'機房','ware');
  R(80,830,240,140,'宿舍','office');R(430,830,80,200,'','rack');R(600,830,80,200,'','rack');R(790,830,230,150,'機車棚','shed');
  const paths=[[{x:60,y:385},{x:1040,y:385}],[{x:385,y:60},{x:385,y:1180}],[{x:715,y:760},{x:1050,y:760},{x:1050,y:1180},{x:715,y:1180}],[{x:60,y:760},{x:715,y:760}]];
  g.patrols=paths;const segs=[];paths.forEach(p=>p.forEach((q,i)=>{if(p.length>2||i<p.length-1)segs.push([q,p[(i+1)%p.length]]);}));
  const start={x:550,y:1240};g.P.x=start.x;g.P.y=start.y;g.exit={x:495,y:10,w:110,h:48};
  for(let n=0,tries=0;n<7&&tries<400;tries++){const x=40+g.rng()*1000,y=60+g.rng()*1180,c={x:x+23,y:y+23};
   if(segs.some(s=>segDist(c,s[0],s[1])<75)||g.inRects(c.x,c.y,48)||dist(c,start)<170||dist(c,{x:550,y:34})<140)continue;R(x,y,46,46,'','crate');n++;}
  g.clues=0;g.battery=100;const spots=[];
  for(let i=0;i<5;i++){const p=g.free({far:start,farD:260,avoid:spots,gap:230,pad:26});spots.push(p);
   g.addItem('clue',p.x,p.y,{icon:'🔍',glint:true,onPick:(g,it)=>{g.clues++;snd().sfx('coin');g.puff(it.x,it.y,'線索 '+g.clues+'/5','#ffe09c',12);g.msg('🔍 線索 '+g.clues+'/5：'+CLUE_TEXT[g.clues-1],3.2);
    if(g.clues>=5){const k=g.free({far:g.P,farD:380,pad:26});g.keyItem=g.addItem('key',k.x,k.y,{glint:true});g.msg('🔑 五個線索拼起來了！鑰匙出現，跟著黃色箭頭走',3.5);}}});}
  const nooks=shuffle(g.rng,[{x:1072,y:40},{x:30,y:40},{x:30,y:1270},{x:1072,y:1270}]);const nk=nooks.find(p=>!g.inRects(p.x,p.y,16))||{x:1072,y:40};hiddenClue(g,nk.x,nk.y,'night');
  for(let i=0;i<4;i++){const p=g.free({pad:24,gap:200,avoid:spots});g.addItem('battery',p.x,p.y);}
  ['smoke','speed','radar','onigiri'].forEach(t=>{const p=g.free({pad:24,far:start,farD:200});g.addItem(t,p.x,p.y);});
  g.spawners.push({types:['battery'],every:16,max:3},{types:['smoke','speed','onigiri','freeze'],every:28,max:2});
  g.addPapers(16,{v:50});
  const n=g.diff.id==='easy'?2:g.diff.id==='normal'?3:4,order=[0,2,1,3];
  for(let i=0;i<n;i++){const p=paths[order[i]];g.addGuard(order[i]===2?p.slice(1).concat(p.slice(0,1)):p,{name:'巡邏員'});}
  g.lamps=[{x:385,y:385},{x:715,y:385},{x:385,y:760},{x:715,y:760},{x:550,y:1100}];
 },
 start(g){g.tip('🕹️ 用右下搖桿或方向鍵移動。先找 5 個 🔍 線索！',5);},
 update(g,dt){g.battery=Math.max(0,g.battery-dt*.5*(g.diff.enemy));
  if(g.battery<=0&&!g.flags.lowWarn){g.flags.lowWarn=1;g.msg('🔋 手電筒沒電了！只剩微光，快找電池');}
  if(inRect(g.P,g.exit)){if(g.hasKey)g.win();else if(!(g.lockMsg>0)){g.lockMsg=2.5;g.msg(g.clues<5?'🔒 出口鎖著，還差 '+(5-g.clues)+' 個線索':'🔒 出口鎖著，先去拿 🔑 鑰匙');}}
  g.lockMsg=(g.lockMsg||0)-dt;},
 onItem(g,t){if(t==='key'){g.msg('🔑 拿到鑰匙了！前往最上方的 🚪 出口',3);return true;}if(t==='battery'){g.msg('🔋 電量 '+Math.round(g.battery)+'%');return true;}},
 floor(g,c,now){c.fillStyle='#2f3b41';c.fillRect(0,340,g.W,90);c.fillRect(0,700,g.W,100);c.fillRect(340,0,90,g.H);c.fillRect(680,0,80,g.H);exitDoor(c,g.exit,!!g.hasKey,now);},
 under(g,c,now){const P=g.P,R=65+125*g.battery/100;g.lightR=R;
  const gr=c.createRadialGradient(P.x,P.y,R*.5,P.x,P.y,R);gr.addColorStop(0,'rgba(3,6,18,0)');gr.addColorStop(1,'rgba(3,6,18,.9)');c.fillStyle=gr;c.fillRect(g.camX-20,g.camY-20,g.VW/g.k+40,g.VH/g.k+40);
  c.globalCompositeOperation='lighter';g.lamps.forEach(l=>{const lg=c.createRadialGradient(l.x,l.y,4,l.x,l.y,70);lg.addColorStop(0,'#ffd88a40');lg.addColorStop(1,'#ffd88a00');c.fillStyle=lg;c.fillRect(l.x-70,l.y-70,140,140);});c.globalCompositeOperation='source-over';
  g.items.forEach(it=>{if(!it.glint||dist(it,P)<R*.8)return;const ph=(now*.9+it.bob*.3)%2.4;if(ph<.6){c.globalAlpha=1-ph/.6;txt(c,'✦',it.x,it.y,22+ph*20,'#fff6c8',900);c.globalAlpha=1;}});
  if(g.hasKey){c.globalAlpha=.6;exitDoor(c,g.exit,true,now);c.globalAlpha=1;}},
 hud(g){return [['🔍 '+g.clues+'/5',g.clues>=5?'ok':''],['🔋 '+Math.ceil(g.battery)+'%',g.battery<25?'warn':''],g.hasKey?['🔑 ✓','ok']:['🔑 ✗','']];},
 targets(g){const t=[];if(g.keyItem&&!g.hasKey&&g.items.includes(g.keyItem))t.push({x:g.keyItem.x,y:g.keyItem.y,label:'🔑 鑰匙'});if(g.hasKey)t.push({x:g.exit.x+g.exit.w/2,y:g.exit.y+20,label:'🚪 出口',color:'#7dffb8'});return t;},
 radar(g){return g.items.filter(i=>i.type==='clue'||i.type==='battery').map(i=>({x:i.x,y:i.y,label:i.type==='clue'?'🔍':'🔋',color:'#9ae7ff'}));},
 state(g){return {clues:g.clues,battery:g.battery,hasKey:!!g.hasKey,exit:g.exit,clueSpots:g.items.filter(i=>i.type==='clue').map(i=>({x:i.x,y:i.y}))};}
};

/* ── 第二關：連署書保衛戰 ──
   10 箱連署書放在推車上，推車會沿著你走過的路慢慢跟上（比你慢），
   所以要先幫推車看好閘門時機、避開堆高機，並擋住想搶連署書的法克。 */
const escort={
 id:'escort',icon:'📦',name:'連署書保衛戰',full:'第二關｜連署書保衛戰',kick:'STAGE 2 / ESCORT',
 story:'10 箱連署書裝上推車，要送到最上方的收件處！推車會沿著你走過的路線跟上來，但它比你慢——輸送帶、堆高機、會關閉的閘門……還有想搶連署書的法克。',
 goals:['🛒 帶領推車抵達最上方的 🏛️ 收件處','💥 推車被撞到或被法克碰到，會掉 1 箱','⭐ 送達越多箱，評價越高（10 箱＝三星）'],
 tips:['推車會走「你走過的路」：先停下來看清楚再帶它過去','閘門：綠色＝開、黃色閃爍＝即將關閉、紅色＝關閉','走太遠推車會停下來等你；🧊 讓法克與堆高機停住，🛡️ 護盾保護推車'],
 view:430,noHearts:true,carry:'',theme:{floor:'#5d6a70',wall:'#46545e',grid:'#ffffff0e'},
 setup(g){g.W=800;g.H=2600;g.limit=200*g.diff.time;
  const W=(x,y,w,h,kind,label)=>g.solids.push({x,y,w,h,kind:kind||'wall',label});
  [[0,150],[270,260],[650,150]].forEach(a=>W(a[0],1650,a[1],36));
  [[0,60],[180,160],[460,160],[740,60]].forEach(a=>W(a[0],400,a[1],36));
  [[150,1150,80,80],[570,1150,80,80],[360,1300,80,80],[150,1430,80,60],[570,1430,80,60]].forEach(a=>W(a[0],a[1],a[2],a[3],'pillar'));
  [[2380,-1,110],[2270,1,130],[2160,-1,150]].forEach(b=>{g.belts.push({x:60,y:b[0],w:680,h:50,dx:b[1],dy:0,spd:b[2]});
   const left=b[1]<0;g.zones.push({x:left?0:740,y:b[0],w:60,h:50,name:'碎紙機',label:'碎紙機',push:{x:left?70:-70,y:-60}});});
  const e=g.diff.enemy;
  [[2040,3.4,0],[1940,2.8,.5],[1840,2.3,.25]].forEach(h=>g.hazards.push({ax:0,bx:710,ay:h[0],by:h[0],x:0,y:h[0],w:90,h:46,period:h[1]/e,ph:h[2],name:'堆高機',icon:'🚜'}));
  g.gates.push({x:150,y:1650,w:120,h:36,period:8,open:4.2,warn:1.2,off:0},{x:530,y:1650,w:120,h:36,period:8,open:4.2,warn:1.2,off:4});
  g.belts.push({x:0,y:640,w:260,h:340,dx:0,dy:1,spd:70},{x:540,y:640,w:260,h:340,dx:0,dy:1,spd:70});
  [[720,3.6/e,0],[880,4.2/e,.5]].forEach(h=>g.hazards.push({ax:265,bx:475,ay:h[0],by:h[0],x:265,y:h[0],w:60,h:56,period:h[1],ph:h[2],name:'清潔車',icon:'🧹',color:'#8e44ad'}));
  g.gates.push({x:60,y:400,w:120,h:36,period:8,open:4,warn:1.2,off:0},{x:340,y:400,w:120,h:36,period:8,open:4,warn:1.2,off:2.7},{x:620,y:400,w:120,h:36,period:8,open:4,warn:1.2,off:5.4});
  g.P.x=400;g.P.y=2470;g.goal={x:250,y:18,w:300,h:80};
  g.cart={x:400,y:2540,r:14,dr:20,stuckT:0,boxes:10,inv:0,trail:[],wait:false,mv:0,fx:0,fy:-1};g.lastTrail={x:g.P.x,y:g.P.y};
  const slots=[[400,2125],[700,1760],[100,1760],[400,1590],[400,1010],[680,590],[120,590],[400,300]],pool=shuffle(g.rng,['shield','speed','freeze','freeze','shield','speed','magnet','freeze']);
  slots.forEach((s,i)=>g.addItem(pool[i],s[0],s[1]));
  g.spawners.push({types:['shield','freeze','speed'],every:20,max:2,opt:{area:{x:0,y:450,w:800,h:1700}}});
  g.addPapers(20,{v:60,area:{x:0,y:120,w:800,h:2380}});
  hiddenClue(g,36,1610,'escort');
  g.fack={x:400,y:1100,r:16,state:'wait',t:0,zone:[1000,1640],fx:0,fy:1,mv:0,walk:0,moved:false};
 },
 start(g){g.tip('🛒 推車會沿著你走過的路跟上來，先觀察輸送帶和堆高機再帶它過去',6);},
 cartHit(g,src){const C=g.cart;if(C.inv>0||g.celebrate>0)return;
  if(g.eff.shield>0){C.inv=.8;g.msg('🛡️ 護盾保護了推車！');snd().sfx('boing');return;}
  if(g.shieldCharges>0){g.shieldCharges--;C.inv=1.3;g.msg('🛡️ 緊急護盾保護推車一次！');snd().sfx('boing');g.puff(C.x,C.y,null,'#9ae7ff',12);return;}
  C.boxes--;C.inv=1.4;g.damage++;g.shake=.25;snd().sfx('puff');g.puff(C.x,C.y,'-1 📦','#ff8a7a',12);
  if(C.boxes<=0)g.fail('連署書全部被弄丟了');else g.msg('💥 '+src+'！推車上剩 '+C.boxes+' 箱');},
 update(g,dt){const F=g.fack,P=g.P,C=g.cart;F.frozen=g.eff.freeze>0;F.walk+=dt*12;C.inv=Math.max(0,C.inv-dt);
  // 推車沿著玩家的足跡移動
  if(dist(P,g.lastTrail)>14){C.trail.push({x:P.x,y:P.y});g.lastTrail={x:P.x,y:P.y};if(C.trail.length>600)C.trail.shift();}
  const far=dist(C,P)>230;if(far&&!C.wait){C.wait=true;g.msg('🛒 推車：等等我！別走太遠');}else if(!far)C.wait=false;
  C.mv=0;const ox=C.x,oy=C.y;let tried=false;if(!C.wait&&C.trail.length&&dist(C,P)>48){const t=C.trail[0],d=dist(C,t);if(d<6)C.trail.shift();else{tried=true;const s=Math.min(d,105*dt);C.x+=(t.x-C.x)/d*s;C.y+=(t.y-C.y)/d*s;C.fx=(t.x-C.x)/d;C.fy=(t.y-C.y)/d;C.mv=1;}}
  g.belts.forEach(b=>{if(C.x>b.x&&C.x<b.x+b.w&&C.y>b.y&&C.y<b.y+b.h){const f=g.eff.freeze>0?.25:1;C.x+=b.dx*b.spd*.6*f*dt;C.y+=b.dy*b.spd*.6*f*dt;}});
  g.collide(C);
  // 卡住保護：0.8 秒沒前進就跳過這個足跡點
  if(tried&&Math.hypot(C.x-ox,C.y-oy)<105*dt*.3){C.stuckT+=dt;if(C.stuckT>.8){C.trail.shift();C.stuckT=0;}}else C.stuckT=0;
  g.hazards.forEach(h=>{const cx=clamp(C.x,h.x,h.x+h.w),cy=clamp(C.y,h.y,h.y+h.h);if(Math.hypot(C.x-cx,C.y-cy)<C.r-2){escort.cartHit(g,h.name+'撞到推車');const dy=C.y-(h.y+h.h/2)||1;C.y+=Math.sign(dy)*(C.r+h.h/2+4-Math.abs(dy));g.collide(C);}});
  g.zones.forEach(z=>{if(C.x>z.x-C.r*.5&&C.x<z.x+z.w+C.r*.5&&C.y>z.y&&C.y<z.y+z.h){escort.cartHit(g,'推車滑進碎紙機');C.x+=z.push.x;C.y+=z.push.y;C.trail=[];g.collide(C);}});
  // 法克：鎖定推車
  if(!F.moved&&C.y<1000){F.moved=true;F.x=400;F.y=210;F.zone=[90,640];F.state='wait';g.msg('🗣️ 法克：我抄捷徑，先到前面等你！',3);}
  const act=C.y>F.zone[0]-40&&C.y<F.zone[1];
  if(F.frozen){F.mv=0;}
  else if(F.state==='flee'){F.t-=dt;const dx=F.x-C.x,dy=F.y-C.y,l=Math.hypot(dx,dy)||1;F.x+=dx/l*150*dt;F.y+=dy/l*150*dt;F.fx=dx/l;F.fy=dy/l;F.mv=1;g.collide(F);if(F.t<=0)F.state='wait';}
  else if(act){if(F.state!=='chase'){F.state='chase';g.msg('🗣️ 法克：推車上的連署書交給我保管就好啦～');}g.moveTo(F,C.x,C.y,96*g.diff.enemy,dt);F.fx=Math.cos(F.ang||0);F.fy=Math.sin(F.ang||0);}
  else{F.state='wait';F.mv=0;}
  F.y=clamp(F.y,F.zone[0]-60,F.zone[1]);
  // 會長擋住法克：把他推開、讓他暈一下
  if(!F.frozen&&F.state==='chase'&&dist(F,P)<F.r+P.r){F.state='flee';F.t=1.6;g.puff(F.x,F.y,'被會長擋住了！','#ffe09c',6);snd().sfx('boing');}
  if(!F.frozen&&F.state==='chase'&&dist(F,C)<F.r+C.r){escort.cartHit(g,'法克搶走連署書');F.state='flee';F.t=2.5;}
  if(inRect(C,g.goal))g.win();
  else if(inRect(P,g.goal)&&!(g.goalMsg>0)){g.goalMsg=3;g.msg('🛒 推車還沒到！回頭把推車帶過來');}g.goalMsg=(g.goalMsg||0)-dt;},
 onHurt(g,src){g.P.slow=.8;g.msg('💥 被'+src.replace('撞到障礙','障礙')+'撞到，腳步變慢了！');g.puff(g.P.x,g.P.y,'💫','#ffe09c',6);return true;},
 floor(g,c,now){const G=g.goal;c.fillStyle='#1e6b45';rr(c,G.x,G.y,G.w,G.h,10);c.fill();c.strokeStyle='#7dffb8';c.lineWidth=3;c.stroke();txt(c,'🏛️ 連署書收件處',G.x+G.w/2,G.y+G.h/2,18,'#fff',900);
  [[2500,'START'],[2140,'⚠ 堆高機區'],[1720,'⚠ 閘門'],[1600,'⚠ 法克出沒'],[1000,'⚠ 逆向輸送帶'],[460,'⚠ 最後閘門']].forEach(a=>txt(c,a[1],400,a[0],12,'#ffffff66',900));
  const T=g.cart.trail;if(T.length>1){c.strokeStyle='#f1d09a44';c.lineWidth=3;c.setLineDash([3,7]);c.beginPath();c.moveTo(g.cart.x,g.cart.y);T.forEach(p=>c.lineTo(p.x,p.y));c.stroke();c.setLineDash([]);}},
 actors(g,c,now){const F=g.fack,C=g.cart;
  if(!(C.inv>0&&((now*12|0)%2===0))){c.fillStyle='#0006';rr(c,C.x-C.dr+3,C.y-C.dr*.7+5,C.dr*2,C.dr*1.4,6);c.fill();c.fillStyle='#8a5a2b';rr(c,C.x-C.dr,C.y-C.dr*.7,C.dr*2,C.dr*1.4,6);c.fill();c.strokeStyle='#e3c27a';c.lineWidth=2;c.stroke();
   for(let i=0;i<Math.min(4,Math.ceil(C.boxes/3));i++)txt(c,'📦',C.x-9+(i%2)*18,C.y-4-Math.floor(i/2)*10,15,'#fff');
   rr(c,C.x-22,C.y+C.dr*.7+3,44,16,8);c.fillStyle=C.boxes<=3?'#9b2f2fdd':'#0b1620cc';c.fill();txt(c,'📦×'+C.boxes,C.x,C.y+C.dr*.7+11,11,'#fff',900);
   if(C.wait)txt(c,'💬 等我！',C.x,C.y-C.dr-14,12,'#ffe09c',900);
   if(g.eff.shield>0){c.strokeStyle='#9ae7ff';c.lineWidth=3;c.beginPath();c.arc(C.x,C.y,C.dr+8,0,7);c.stroke();}}
  drawFack(g,c,F);if(F.state==='chase'&&!F.frozen)txt(c,'💢',F.x+16,F.y-34,16,'#fff');},
 hud(g){const b=g.cart.boxes;return [['📦 推車 '+b+'/10 箱',b<=3?'warn':b===10?'ok':''],['🏁 '+Math.max(0,Math.round((g.cart.y-100)/10))+' m','']];},
 targets(g){return [{x:g.cart.x,y:g.cart.y,label:'🛒 推車',color:'#f1d09a'},{x:400,y:60,label:'🏛️ 收件處',color:'#7dffb8'}];},
 radar(g){return g.items.map(i=>({x:i.x,y:i.y,label:i.icon||A.ITEMS[i.type].icon,color:'#9ae7ff'}));},
 stars(g){const b=g.cart.boxes;return b>=10?3:b>=6?2:1;},
 result(g,r){r.extra.bundles=g.cart.boxes;r.flags.perfect=g.cart.boxes>=10;if(r.win)r.score+=g.cart.boxes*150;},
 state(g){return {bundles:g.cart.boxes,cart:{x:g.cart.x,y:g.cart.y,wait:g.cart.wait},fack:{x:g.fack.x,y:g.fack.y,state:g.fack.state},goal:g.goal};}
};

/* ── 第三關：十日倒數｜突破封鎖 ── */
const tenday={
 id:'tenday',icon:'📅',name:'十日倒數',full:'第三關｜十日倒數・突破封鎖',kick:'STAGE 3 / TEN DAYS',
 story:'離最後期限只剩十天！要在倒數結束前蓋到 4 枚核准印章，才能突破封鎖線。三條路線各有 2 枚印章，難度不同——至少要跑兩條路線。',
 goals:['🟥 收集 4 枚核准印章（三條路線各有 2 枚）','🚧 回到最上方的 🚪 封鎖線出口','⏳ 沙漏可以延長半天'],
 tips:['左路：繞遠但安全｜中路：最短，但有限時閘門與巡邏｜右路：逆向輸送帶與清潔車','遊戲內每「天」約 24 秒，不用等真實日期','左路好像有一面牆怪怪的……試著一直推它'],
 view:430,customTime:true,theme:{floor:'#6d7a6a',wall:'#4f5d55',grid:'#ffffff10'},
 setup(g){g.W=1400;g.H=1500;g.dayLen=24*g.diff.time;g.limit=g.dayLen*10;g.hourglass=g.dayLen/2;g.stamps=0;
  const W=(x,y,w,h,kind)=>g.solids.push({x,y,w,h,kind:kind||'wall'});
  W(440,240,40,1040);W(920,240,40,1040);
  W(0,1090,340,28);W(100,900,340,28);W(0,710,180,28);W(260,710,80,28);W(100,520,340,28);W(0,330,340,28);
  g.secrets.push({x:180,y:710,w:80,h:28,onOpen:g=>{g.flags.shortcut=true;g.msg('🕳️ 發現隱藏捷徑！好像還藏著什麼……',3);hiddenClue(g,220,672,'tenday');}});
  W(480,1000,140,28);W(780,1000,140,28);W(480,600,140,28);W(780,600,140,28);
  g.gates.push({x:620,y:1000,w:160,h:28,period:14,open:7,warn:1.2,off:0},{x:620,y:600,w:160,h:28,period:14,open:7,warn:1.2,off:5});
  W(960,240,380,28);
  g.belts.push({x:960,y:300,w:440,h:240,dx:0,dy:1,spd:75},{x:960,y:760,w:440,h:240,dx:0,dy:1,spd:95});
  const e=g.diff.enemy;g.hazards.push({ax:965,bx:1330,ay:620,by:620,x:965,y:620,w:70,h:50,period:2.6/e,ph:0,name:'清潔車',icon:'🧹',color:'#8e44ad'},{ax:965,bx:1330,ay:1100,by:1100,x:965,y:1100,w:70,h:50,period:3/e,ph:.5,name:'清潔車',icon:'🧹',color:'#8e44ad'});
  g.addGuard([{x:505,y:800},{x:895,y:800}],{name:'糾察員',spd:80});g.addGuard([{x:895,y:420},{x:505,y:420}],{name:'糾察員',spd:80});
  if(g.diff.id==='hard'||g.diff.id==='hell')g.addGuard([{x:700,y:1240},{x:700,y:660}],{name:'糾察員',spd:70});
  g.P.x=700;g.P.y=1440;g.exit={x:640,y:16,w:120,h:56};
  const stamp=(x,y,route)=>g.addItem('stamp',x,y,{icon:'🟥',route,glow:'#ff6b5e44',ring:'#ff9b8f',onPick:(g,it)=>{g.stamps++;snd().sfx('coin');g.puff(it.x,it.y,'核准！'+g.stamps+'/4','#ffb3a8',14);g.msg(g.stamps>=4?'🟥 4 枚印章到手！快去最上方的封鎖線出口':'🟥 拿到印章 '+g.stamps+'/4（'+it.route+'）',3);}});
  stamp(220,800,'左路');stamp(220,420,'左路');stamp(560,700,'中路');stamp(840,480,'中路');stamp(1180,712,'右路');stamp(1180,1210,'右路');
  g.addItem('hourglass',60,610);g.addItem('hourglass',380,440);g.addItem('hourglass',700,300);g.addItem('hourglass',1180,1240);g.addItem('pass',1000,1400);
  g.spawners.push({types:['speed','freeze','onigiri','smoke'],every:22,max:2,opt:{area:{x:0,y:250,w:1400,h:1050}}},{types:['hourglass'],every:45,max:1});
  g.addPapers(22,{v:50});
  g.lastDay=10;
 },
 start(g){g.tip('📅 倒數十天！三條路線各有 2 枚 🟥 印章，蒐集 4 枚',5);},
 update(g,dt){const day=Math.max(1,Math.ceil(g.time/g.dayLen));if(day<g.lastDay){g.lastDay=day;g.msg(day===1?'⚠️ 最後一天了！':'📅 倒數第 '+day+' 天',2);snd().sfx('shout');}
  if(inRect(g.P,g.exit)){if(g.stamps>=4)g.win();else if(!(g.lockMsg>0)){g.lockMsg=2.5;g.msg('🚧 封鎖線：還需要 '+(4-g.stamps)+' 枚印章');}}g.lockMsg=(g.lockMsg||0)-dt;},
 floor(g,c,now){exitDoor(c,g.exit,g.stamps>=4,now);txt(c,'← 左路（安全・繞遠）',220,1240,13,'#ffffff77',900);txt(c,'中路（最短・限時閘門）',700,1225,13,'#ffffff77',900);txt(c,'右路（輸送帶）→',1180,1240,13,'#ffffff77',900);},
 hud(g){const day=Math.max(1,Math.ceil(g.time/g.dayLen)),hr=Math.floor((g.time%g.dayLen)/g.dayLen*24);return [['📅 倒數 '+day+' 天 '+String(hr).padStart(2,'0')+'時',day<=2?'warn':''],['🟥 印章 '+g.stamps+'/4',g.stamps>=4?'ok':'']];},
 targets(g){return g.stamps>=4?[{x:700,y:40,label:'🚪 出口',color:'#7dffb8'}]:[];},
 radar(g){return g.items.filter(i=>i.type==='stamp'||i.type==='hourglass').map(i=>({x:i.x,y:i.y,label:i.icon||'⏳',color:'#9ae7ff'}));},
 state(g){return {stamps:g.stamps,day:Math.ceil(g.time/g.dayLen),exit:g.exit,stampSpots:g.items.filter(i=>i.type==='stamp').map(i=>({x:i.x,y:i.y})),shortcut:!!g.flags.shortcut};}
};

/* ── 最終關：法克的最後反擊（三階段 Boss） ── */
const NEED=[0,3,3,2];
const boss={
 id:'boss',icon:'👑',name:'法克的最後反擊',full:'最終關｜法克的最後反擊',kick:'FINAL STAGE / BOSS',boss:true,
 story:'終於把法克逼到集合區中央！但他準備了一連串的「反擊」……',
 goals:['第一階段：追上逃跑的法克 3 次（小心他丟下的 🚧）','第二階段：認出真正的法克（手上拿著 📄）並抓到 3 次','第三階段：用 🧊 定身貼打破「法務護盾」，再抓到 2 次'],
 tips:['紅色區域是攻擊預告，看到就閃開','法克衝刺撞牆後會頭暈 💫，這時最好抓','分身會閃爍，而且手上沒有 📄'],
 view:430,celebrate:3.6,theme:{floor:'#4f5f57',wall:'#5d6d78',grid:'#ffffff10'},
 setup(g){g.W=1000;g.H=1000;g.limit=240*g.diff.time;
  [[200,200],[710,200],[200,710],[710,710],[455,455]].forEach(a=>g.solids.push({x:a[0],y:a[1],w:90,h:90,kind:'pillar'}));
  g.P.x=500;g.P.y=900;g.F={x:500,y:110,r:17,phase:1,tags:0,inv:0,st:4,stMax:4,tired:0,coneT:2.5,dashT:4,dizzy:0,fx:0,fy:1,mv:0,walk:0,burst:0};
  g.clones=[];g.flags.clones=0;
  g.addItem('speed',150,500);g.addItem('shield',850,500);
  g.spawners.push({types:['speed','onigiri','shield'],every:20,max:1});
  g.addPapers(14,{v:50});
  hiddenClue(g,30,30,'boss');
 },
 start(g){g.tip('👑 第一階段：追上法克 3 次！',4);},
 lockStep(g,dt){},
 phaseUp(g){const F=g.F;F.phase++;F.tags=0;F.inv=1.5;g.lock=2;g.teles=[];g.dyn.forEach(d=>d.gone=true);snd().sfx('siren');
  if(F.phase===2){g.banner='第二階段：分身與反擊！';g.tip('真正的法克手上拿著 📄，分身會閃爍',5);boss.makeClones(g);F.dashT=3;}
  if(F.phase===3){g.banner='第三階段：法務護盾！';g.clones=[];F.zig=true;F.barT=3.5;g.tip('撿 🧊 定身貼打破護盾，再抓住法克！',5);
   g.spawners.push({types:['freeze'],every:5,max:1});const p=g.free({far:F,farD:200});g.addItem('freeze',p.x,p.y);}},
 makeClones(g){const F=g.F;while(g.clones.length<3){const p=g.free({pad:30,far:g.P,farD:200});g.clones.push({quiet:true,x:p.x,y:p.y,r:17,st:9,stMax:9,tired:0,fx:0,fy:1,mv:1,walk:g.rng()*6,wob:g.rng()*6});}},
 update(g,dt){const F=g.F,P=g.P,e=g.diff.enemy;F.inv=Math.max(0,F.inv-dt);F.frozen=g.eff.freeze>0;F.walk+=dt*12;
  g.dyn.forEach(d=>{if(d.life!=null){d.life-=dt;if(d.life<=0)d.gone=true;}});g.dyn=g.dyn.filter(d=>!d.gone);
  if(F.frozen){F.mv=0;}
  else if(F.dizzy>0){F.dizzy-=dt;F.mv=0;}
  else if(F.state==='aim'){F.mv=0;}
  else if(F.state==='dash'){const s=560*dt;F.x+=F.dx*s;F.y+=F.dy*s;F.left-=s;const ox=F.x,oy=F.y;g.collide(F);const hit=Math.hypot(F.x-ox,F.y-oy)>.5;
   if(dist(F,P)<F.r+P.r+4)g.hurt('被法克衝撞');
   if(F.left<=0||hit){F.state='';F.dizzy=1.8;g.puff(F.x,F.y,'💫 頭暈了！','#ffe09c',8);snd().sfx('boing');}}
  else{fackStep(g,F,dt,(F.phase===3?158:F.phase===2?148:150)*e);}
  // 第一階段：丟三角錐擋路
  if(F.phase===1&&!F.frozen){F.coneT-=dt;if(F.coneT<=0&&dist(F,P)<320){F.coneT=2.6/e;const cx=F.x-F.fx*34,cy=F.y-F.fy*34;if(dist({x:cx,y:cy},P)>45&&g.dyn.length<6&&!g.inRects(cx,cy,16,g.solids)){g.dyn.push({x:cx-14,y:cy-14,w:28,h:28,kind:'cone',life:7});g.msg('🗣️ 法克：送你三角錐！');}}}
  // 第二階段：分身＋可預判的衝刺
  if(F.phase===2){
   if(!F.frozen&&!F.state&&F.dizzy<=0){F.dashT-=dt;if(F.dashT<=0&&dist(F,P)<420){F.dashT=5.5/e;F.state='aim';const a=Math.atan2(P.y-F.y,P.x-F.x);F.dx=Math.cos(a);F.dy=Math.sin(a);F.left=360;F.fx=F.dx;F.fy=F.dy;
    g.tele({kind:'line',x:F.x,y:F.y,a,len:360,w:48,dur:1.1/Math.sqrt(e),done:()=>{if(F.state==='aim')F.state='dash';}});g.msg('⚠️ 法克要衝刺了！閃開紅色區域');}}
   g.clones=g.clones.filter(cl=>{cl.walk+=dt*12;if(!F.frozen){const sv=g.fleeF;fackStep(g,cl,dt,120*e);g.fleeF=sv;cl.wob+=dt;}
    if(dist(cl,P)<cl.r+P.r){g.flags.clones++;P.slow=.7;g.puff(cl.x,cl.y,'💨 是假的！','#ccc',14);snd().sfx('puff');return false;}return true;});}
  // 第三階段：糖糖彈幕（預告 1.3 秒）
  if(F.phase===3&&!F.frozen){F.barT-=dt;if(F.barT<=0){F.barT=6.5/e;g.msg('🍬 糖糖彈幕來了！看紅圈閃開');
   const pts=[{x:P.x,y:P.y}];for(let i=0;i<3;i++){const a=g.rng()*6.28,d=70+g.rng()*110;pts.push({x:clamp(P.x+Math.cos(a)*d,30,970),y:clamp(P.y+Math.sin(a)*d,30,970)});}
   pts.forEach(p=>g.tele({kind:'circle',x:p.x,y:p.y,r:48,dur:1.3,icon:'🍬',done:(g,o)=>{g.puff(o.x,o.y,null,'#ff7ac6',10);if(dist(g.P,o)<o.r+g.P.r*.4)g.hurt('被糖糖砸到');}}));}}
  // 抓到法克
  if(dist(F,P)<F.r+P.r&&F.inv<=0){
   if(F.phase===3&&!F.frozen){if(!(g.shieldMsg>0)){g.shieldMsg=2;g.msg('🛡️ 法務護盾彈開你！先撿 🧊 定身貼');snd().sfx('boing');}const dx=P.x-F.x,dy=P.y-F.y,l=Math.hypot(dx,dy)||1;P.x+=dx/l*30;P.y+=dy/l*30;g.collide(P);}
   else{F.tags++;F.inv=2;F.burst=1;F.dizzy=0;F.state='';F.tired=0;F.st=F.stMax;g.teles=g.teles.filter(t=>t.kind!=='line');g.eff.freeze=0;snd().sfx('coin');g.puff(F.x,F.y,'抓到了！'+F.tags+'/'+NEED[F.phase],'#ffe09c',16);
    if(F.tags>=NEED[F.phase]){if(F.phase<3)boss.phaseUp(g);else g.win();}
    else{if(F.phase===2)boss.makeClones(g);g.msg(['','🗣️ 法克：哎呀！再來啊！','🗣️ 法克：你抓到的說不定是分身喔～','🗣️ 法克：護盾快修好了！'][F.phase]);}}}
  g.shieldMsg=(g.shieldMsg||0)-dt;},
 onHurt(g){if(g.F.phase===3)g.flags.p3hit=true;return false;},
 onWin(g){g.F.frozen=false;g.clones=[];g.teles=[];},
 celebrateStep(g,dt){if(g.rng()<.7){const x=g.camX+g.rng()*g.VW/g.k;g.fx.push({x,y:g.camY-10,vx:(g.rng()-.5)*30,vy:120+g.rng()*80,life:2.5,max:2.5,text:g.rng()<.5?'📝':'🎉',c:'#fff'});}},
 actors(g,c,now){const F=g.F;
  g.clones.forEach(cl=>{drawFack(g,c,cl,{alpha:.62+.3*Math.sin(now*9+cl.wob)});});
  drawFack(g,c,F,{doc:F.phase===2});
  if(F.phase===3&&!F.frozen&&g.celebrate<=0){c.strokeStyle='#ffd23f';c.lineWidth=3;c.globalAlpha=.6+.3*Math.sin(now*6);c.beginPath();c.arc(F.x,F.y,F.r+10,0,7);c.stroke();c.globalAlpha=1;txt(c,'🛡️',F.x-F.r-8,F.y-F.r-6,15,'#fff');}
  if(g.celebrate>0)bubble(c,'好啦好啦……我簽就是了！',F.x,F.y-62);
  else if(F.state==='aim')bubble(c,'看招！',F.x,F.y-58);},
 screen(g,c){const F=g.F,w=Math.min(300,g.VW-24),x=(g.VW-w)/2;rr(c,x,40,w,30,10);c.fillStyle='#200c0cdd';c.fill();c.strokeStyle='#ff8a7a';c.lineWidth=1.5;c.stroke();
  const pips=[1,2,3].map(p=>p<F.phase?'●●●'.slice(0,NEED[p]):p===F.phase?'●'.repeat(F.tags)+'○'.repeat(NEED[p]-F.tags):'○'.repeat(NEED[p])).join(' │ ');
  txt(c,'👑 法克 第'+F.phase+'階段　'+pips,g.VW/2,55,13,'#ffd3c7',900);
  if(g.lock>0&&g.banner){c.globalAlpha=Math.min(1,g.lock*1.5);rr(c,12,g.VH/2-38,g.VW-24,76,16);c.fillStyle='#3a0d0dee';c.fill();txt(c,g.banner,g.VW/2,g.VH/2,Math.min(28,g.VW/14),'#ffdf8f',900);c.globalAlpha=1;}},
 hud(g){return [['👑 第 '+g.F.phase+'/3 階段','']];},
 targets(g){return [{x:g.F.x,y:g.F.y,label:'法克',color:'#ff8a7a'}];},
 radar(g){return g.items.map(i=>({x:i.x,y:i.y,label:i.icon||A.ITEMS[i.type].icon,color:'#9ae7ff'}));},
 result(g,r){r.flags.p3flawless=r.win&&!g.flags.p3hit;r.extra.clones=g.flags.clones;},
 state(g){const F=g.F;return {phase:F.phase,tags:F.tags,fx:F.x,fy:F.y,inv:F.inv,state:F.state,frozen:F.frozen,clones:g.clones.length,dizzy:F.dizzy};}
};
A.STAGES=[night,escort,tenday,boss];
A.stageById=id=>A.STAGES.find(s=>s.id===id);

/* ── 每日挑戰：依台灣日期種子產生固定的任務與地圖 ── */
const DAILY_TYPES=[
 {id:'catch3',name:'限時三分鐘捕捉法克',desc:'180 秒內抓到法克 5 次（每次被抓他都會瞬間神隱到別處）',time:180,goal:'catch',items:['speed','freeze','shield','magnet']},
 {id:'nofreeze',name:'禁用定身挑戰',desc:'今天不會出現 🧊 定身貼！160 秒內抓到法克 5 次',time:160,goal:'catch',items:['speed','shield','magnet']},
 {id:'speedonly',name:'只靠疾速鞋',desc:'只會出現 ⚡ 疾速鞋，160 秒內抓到法克 5 次',time:160,goal:'catch',items:['speed']},
 {id:'collect',name:'連署書大搜集',desc:'120 秒內收集 4,000 份連署書，小心巡邏糖糖',time:120,goal:'collect',items:['magnet','speed','shield']},
 {id:'flawless',name:'無傷特殊地圖',desc:'無傷蒐集 4 張 🎟️ 通行章再抵達右上角出口，被撞到一次就失敗',time:150,goal:'exit',items:['speed','freeze']}
];
A.DAILY_TYPES=DAILY_TYPES;
A.dailyInfo=function(date){const seed=FackExpStore.hash('fack-daily|'+date),type=DAILY_TYPES[seed%DAILY_TYPES.length];return {date,seed,type};};
A.dailyDef=function(date){const info=A.dailyInfo(date),T=info.type;
 return {id:'daily',daily:true,icon:'📅',name:'每日挑戰・'+T.name,full:'每日挑戰｜'+date,kick:'DAILY / '+date,story:T.desc,goals:[T.desc,'今天全世界的玩家都是同一張地圖'],tips:['每日挑戰固定使用「中等」難度，不套用冒險 Buff','可以重複挑戰，紀錄最佳成績'],
  view:430,theme:{floor:'#56657a',wall:'#4b5870',grid:'#ffffff10'},
  setup(g){g.W=1000;g.H=1000;g.limit=T.time;
   const start=T.goal==='exit'?{x:60,y:940}:{x:500,y:920};g.P.x=start.x;g.P.y=start.y;g.exit={x:900,y:16,w:84,h:60};
   for(let n=0,tries=0;n<10&&tries<300;tries++){const w=50+Math.floor(g.rng()*100),h=50+Math.floor(g.rng()*100),x=60+g.rng()*(880-w),y=90+g.rng()*(780-h),r={x,y,w,h,kind:g.rng()<.5?'pillar':'crate'};
    const cx=x+w/2,cy=y+h/2;if(dist({x:cx,y:cy},start)<160||dist({x:cx,y:cy},{x:940,y:46})<150||g.solids.some(s=>x<s.x+s.w+70&&x+w+70>s.x&&y<s.y+s.h+70&&y+h+70>s.y))continue;g.solids.push(r);n++;}
   if(T.goal!=='catch'){const nh=T.goal==='exit'?5:3;for(let i=0;i<nh;i++){const hz=g.rng()<.5,len=260+g.rng()*300,p=g.free({pad:40,far:start,farD:220});
    const ax=hz?clamp(p.x-len/2,20,940):p.x,ay=hz?p.y:clamp(p.y-len/2,100,900);g.hazards.push({ax,ay,bx:hz?Math.min(960,ax+len):ax,by:hz?ay:Math.min(940,ay+len),x:ax,y:ay,w:46,h:46,period:2.2+g.rng()*1.6,ph:g.rng(),name:'巡邏糖糖',icon:'🍬',color:'#c2185b'});}}
   if(T.goal==='exit'){g.maxHearts=g.hearts=1;g.belts.push({x:300,y:420,w:400,h:70,dx:g.rng()<.5?1:-1,dy:0,spd:120});g.ticks=0;const cps=[];const sweep=(p)=>g.hazards.some(h=>p.x>Math.min(h.ax,h.bx)-34&&p.x<Math.max(h.ax,h.bx)+h.w+34&&p.y>Math.min(h.ay,h.by)-34&&p.y<Math.max(h.ay,h.by)+h.h+34);
   for(let i=0;i<4;i++){let p=null;for(let k=0;k<30;k++){p=g.free({pad:30,far:start,farD:220,avoid:cps,gap:k<15?260:160});if(!sweep(p))break;}cps.push(p);g.addItem('ticket',p.x,p.y,{icon:'🎟️',onPick:(g,it)=>{g.ticks++;snd().sfx('coin');g.puff(it.x,it.y,'通行章 '+g.ticks+'/4','#ffe09c',12);g.msg(g.ticks>=4?'🎟️ 集滿了！前往右上角出口':'🎟️ 通行章 '+g.ticks+'/4');}});}}
   if(T.goal==='catch'){g.F={x:500,y:120,r:17,st:4,stMax:4,tired:0,tiredDur:2.2,fx:0,fy:1,mv:0,walk:0,burst:0,inv:0};g.tags=0;}
   if(T.goal==='collect'){g.target=4000;for(let i=0;i<16;i++){const p=g.free({pad:22,gap:60,avoid:g.papers});g.papers.push({x:p.x,y:p.y,r:12,v:[100,150,200][Math.floor(g.rng()*3)]});}}
   else g.addPapers(10,{v:50});
   g.spawners.push({types:T.items,every:9,max:2});const p=g.free({pad:24,far:start,farD:150});g.addItem(T.items[0],p.x,p.y);
  },
  start(g){g.tip('📅 '+T.desc,5);},
  update(g,dt){
   if(T.goal==='catch'){const F=g.F;F.frozen=g.eff.freeze>0;F.inv=Math.max(0,F.inv-dt);F.walk+=dt*12;if(!F.frozen)fackStep(g,F,dt,156);else F.mv=0;
    if(dist(F,g.P)<F.r+g.P.r&&F.inv<=0){g.tags++;F.inv=1.5;F.tired=0;F.st=F.stMax;g.eff.freeze=0;snd().sfx('coin');g.puff(F.x,F.y,'抓到了！'+g.tags+'/5','#ffe09c',14);if(g.tags>=5)g.win();else{const q=g.free({pad:30,far:g.P,farD:450});F.x=q.x;F.y=q.y;g.fleeF=null;g.puff(F.x,F.y,'💨','#ccc',10);g.msg('🗣️ 法克：抓不到～我瞬間神隱！（'+g.tags+'/5）');}}}
   if(T.goal==='collect'){if(g.paperScore>=g.target)g.win();if(g.papers.length<12){const p=g.free({pad:22,far:g.P,farD:150,gap:60,avoid:g.papers});g.papers.push({x:p.x,y:p.y,r:12,v:[100,150,200][Math.floor(g.rng()*3)]});}}
   if(T.goal==='exit'&&inRect(g.P,g.exit)){if(g.ticks>=4)g.win();else if(!(g.lockMsg>0)){g.lockMsg=2.5;g.msg('🎟️ 還差 '+(4-g.ticks)+' 張通行章');}}g.lockMsg=(g.lockMsg||0)-dt;},
  floor(g,c,now){if(T.goal==='exit')exitDoor(c,g.exit,g.ticks>=4,now);},
  actors(g,c){if(g.F)drawFack(g,c,g.F);},
  hud(g){return T.goal==='catch'?[['🖐️ 抓到 '+g.tags+'/5','']]:T.goal==='collect'?[['📝 '+g.paperScore+'/'+g.target,g.paperScore>=g.target?'ok':'']]:[['🎟️ '+g.ticks+'/4',g.ticks>=4?'ok':'']];},
  targets(g){return T.goal==='catch'?[{x:g.F.x,y:g.F.y,label:'法克',color:'#ff8a7a'}]:T.goal==='exit'&&g.ticks>=4?[{x:940,y:46,label:'🚪 出口',color:'#7dffb8'}]:[];},
  radar(g){return g.items.map(i=>({x:i.x,y:i.y,label:i.icon||A.ITEMS[i.type].icon,color:'#9ae7ff'}));},
  stars(g,r){return 1+(g.damage===0?1:0)+(r.remaining>=g.limit*.35?1:0);},
  state(g){return {type:T.id,tags:g.tags,papers:g.paperScore,fack:g.F?{x:g.F.x,y:g.F.y}:null,solids:g.solids.map(s=>[Math.round(s.x),Math.round(s.y),s.w,s.h])};}
 };};
})();
