/* 測試用自動玩家：只在測試時注入頁面（不在遊戲頁面中載入）。
   透過 debug.setInput 模擬搖桿方向，以固定 1/30 秒步進執行真實遊戲邏輯，不修改任何遊戲規則。 */
(function(){
'use strict';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function goal(g){const id=g.def.id,P=g.P,near=list=>list.slice().sort((a,b)=>dist(a,P)-dist(b,P))[0];
 if(id==='night'){if(g.hasKey)return{x:g.exit.x+g.exit.w/2,y:g.exit.y+g.exit.h/2};const k=g.items.find(i=>i.type==='key');if(k)return k;
  if(g.battery<25){const b=near(g.items.filter(i=>i.type==='battery'));if(b&&dist(b,P)<400)return b;}return near(g.items.filter(i=>i.type==='clue'));}
 if(id==='escort'){const C=g.cart,F=g.fack;
  // 法克靠近推車：先去擋他
  if(F.state==='chase'&&!F.frozen&&dist(F,C)<170)return F;
  // 推車前方的足跡會碰到移動障礙物 → 站到推車旁讓它停下
  const ahead=C.trail.slice(0,8);let risk=false;
  for(const h of g.hazards){if(g.eff.freeze>0)break;for(let k=0;k<=6&&!risk;k++){const tt=k*.15,ph=h.ph+tt/h.period*(window.FackAdv.HAZARD_SPEED||1),s2=(Math.sin(ph*Math.PI*2)+1)/2,hx=h.ax+(h.bx-h.ax)*s2,hy=h.ay+(h.by-h.ay)*s2;
   const pt=ahead[Math.min(ahead.length-1,Math.floor(k*105*.15/14))]||C;if(pt.x>hx-26&&pt.x<hx+h.w+26&&pt.y>hy-26&&pt.y<hy+h.h+26)risk=true;}}
  const inLane=g.hazards.some(h=>C.x>Math.min(h.ax,h.bx)-24&&C.x<Math.max(h.ax,h.bx)+h.w+24&&C.y>Math.min(h.ay,h.by)-24&&C.y<Math.max(h.ay,h.by)+h.h+24);
  if(risk&&!inLane)return dist(C,P)<40?{x:C.x,y:C.y,hold:true}:{x:C.x,y:C.y};
  if(dist(C,P)>110||C.wait)return {x:C.x,y:C.y,hold:dist(C,P)<150};return{x:400,y:50};}
 if(id==='tenday'){if(g.stamps>=4)return{x:700,y:44};
  // 偏好同一路線：中路＋左路
  const st=g.items.filter(i=>i.type==='stamp');const pref=st.filter(s=>window.__botAvoidMiddle?s.route!=='中路':s.route!=='右路');return near(pref.length?pref:st);}
 if(id==='boss'){const F=g.F;if(F.phase===3&&!F.frozen){const fr=g.items.find(i=>i.type==='freeze');if(fr)return fr;}
  if(F.phase===2&&g.clones.length){/* 只追有 📄 的真法克 */}return F;}
 if(id==='daily'){if(g.F)return g.F;if(g.target)return near(g.papers)||P;const tk=g.items.filter(i=>i.type==='ticket');if(tk.length)return near(tk);return{x:g.exit.x+40,y:g.exit.y+30};}
 return P;}
function danger(g,nx,ny){const t=.45;return g.hazards.some(h=>{if(g.eff.freeze>0)return false;const ph=h.ph+t/h.period*(window.FackAdv.HAZARD_SPEED||1),s=(Math.sin(ph*Math.PI*2)+1)/2,x=h.ax+(h.bx-h.ax)*s,y=h.ay+(h.by-h.ay)*s;
  const now=nx>h.x-22&&nx<h.x+h.w+22&&ny>h.y-22&&ny<h.y+h.h+22,fut=nx>x-22&&nx<x+h.w+22&&ny>y-22&&ny<y+h.h+22;return now||fut;})
  ||g.teles.some(o=>o.kind==='circle'?Math.hypot(nx-o.x,ny-o.y)<o.r+20:false);}
window.__advBot=function(maxSec,opts){opts=opts||{};const g=window.fackAdvGame;if(!g||!g.debug)throw new Error('debug game missing');
 const dt=1/30;let t=0,field=null,fieldKey='',fieldT=0,stuck=0,last={x:g.P.x,y:g.P.y},wiggle=0;
 while(!g.over&&t<maxSec){
  if(g.paused)g.resume();
  const tg=goal(g)||g.P,P=g.P;let v=null;
  if(tg.hold){g.debug.setInput(null);g.step(dt);t+=dt;continue;}
  if(g.los(P,tg)){const dx=tg.x-P.x,dy=tg.y-P.y,l=Math.hypot(dx,dy);if(l>2)v={x:dx/l,y:dy/l};}
  else{const key=Math.round(tg.x/25)+','+Math.round(tg.y/25);fieldT-=dt;if(key!==fieldKey||fieldT<=0){field=g.nav.bfs(g.nav.cell(tg.x,tg.y));fieldKey=key;fieldT=.5;}v=g.nav.dir(field,P.x,P.y);}
  // 攻擊預告（直線衝刺）中就往側面閃
  const line=g.teles.find(o=>o.kind==='line')||(g.F&&g.F.state==='dash'?{x:g.F.x,y:g.F.y,a:Math.atan2(g.F.dy,g.F.dx),len:g.F.left+40,w:48}:null);
  if(line){const ca=Math.cos(line.a),sa=Math.sin(line.a),rx=P.x-line.x,ry=P.y-line.y,along=rx*ca+ry*sa,side=-rx*sa+ry*ca;if(along>-40&&along<line.len+40){if(Math.abs(side)<line.w/2+50){const s=side>=0?1:-1;v={x:-sa*s,y:ca*s};}else if(v){const nx=P.x+v.x*30-line.x,ny=P.y+v.y*30-line.y;if(Math.abs(-nx*sa+ny*ca)<line.w/2+50)v=null;}}}
  if(v&&!opts.reckless&&danger(g,P.x+v.x*24,P.y+v.y*24)&&!danger(g,P.x,P.y))v=null;
  if(wiggle>0){wiggle-=dt;v={x:Math.cos(t*7),y:Math.sin(t*7)};}
  g.debug.setInput(v?{x:v.x,y:v.y,m:1}:null);
  g.step(dt);t+=dt;
  if(Math.floor(t*2)!==Math.floor((t-dt)*2)){if(dist(last,g.P)<3&&v){stuck++;if(stuck>3){wiggle=.6;stuck=0;}}else stuck=0;last={x:g.P.x,y:g.P.y};}
 }
 g.debug.setInput(undefined);
 if(!g.over&&!opts.keep){g.render();}
 return {over:g.over,t:Math.round(t),state:g.state()};
};
})();
