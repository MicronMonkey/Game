/* 全民找法克・冒險模式引擎核心
   與經典模式（game/chase_v2.js）完全分離：不改動 FackChase，只借用它的 Web Audio 音效（FackChase.Sound）。
   提供：畫布與鏡頭、搖桿／鍵盤操作、碰撞、格子尋路、巡邏員、道具、愛心與受傷、預警提示、粒子特效。
   每一關的內容定義在 game/fack_adv_stages.js。 */
(function(){
'use strict';
const A=window.FackAdv=window.FackAdv||{};
const NOSND={start(){},stop(){},setFast(){},sfx(){},toggle(){return true;},muted:true};
const snd=()=>(window.FackChase&&window.FackChase.Sound)||NOSND;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
A.util={dist,clamp,lerp,snd};

A.DIFFS={
 easy:{id:'easy',e:'🌱',n:'簡單',enemy:.82,guard:.899,time:1.25,hearts:4,desc:'巡邏員慢、時間多、4 顆愛心'},
 normal:{id:'normal',e:'🏃',n:'中等',enemy:1,guard:.962,time:1,hearts:3,desc:'剛剛好的冒險'},
 hard:{id:'hard',e:'🔥',n:'難',enemy:1.1,guard:1.024,time:.9,hearts:3,desc:'敵人更快、時間更緊'},
 hell:{id:'hell',e:'💀',n:'地獄',enemy:1.2,guard:1.087,time:.82,hearts:2,desc:'只有 2 顆愛心，失誤代價很高'}
};
A.ITEMS={
 speed:{icon:'⚡',name:'疾速鞋',desc:'3 秒內大幅加速'},
 freeze:{icon:'🧊',name:'定身貼',desc:'讓法克與移動障礙停住約 3 秒'},
 shield:{icon:'🛡️',name:'防糖護盾',desc:'8 秒內不受傷害'},
 magnet:{icon:'🧲',name:'吸紙磁鐵',desc:'8 秒內吸附附近連署書'},
 battery:{icon:'🔋',name:'手電筒電池',desc:'手電筒電量 +40'},
 hourglass:{icon:'⏳',name:'延時沙漏',desc:'剩餘時間 +半天'},
 radar:{icon:'📡',name:'偵查雷達',desc:'8 秒內顯示重要目標方向'},
 onigiri:{icon:'🍙',name:'元氣飯糰',desc:'恢復 1 顆愛心'},
 smoke:{icon:'💨',name:'煙霧彈',desc:'4 秒內巡邏員看不見你'},
 key:{icon:'🔑',name:'出口鑰匙',desc:'打開出口大門'},
 pass:{icon:'🎫',name:'臨時通行證',desc:'所有閘門保持開啟 10 秒'}
};
// 冒險模式專用 Buff。max = 可疊加上限，避免無限疊加破壞平衡。
A.BUFFS={
 swift:{icon:'👟',name:'疾風步伐',max:2,desc:'本次冒險移動速度 +10%',lv:n=>'移動速度 +'+(n*10)+'%'},
 extend:{icon:'⏱️',name:'時間延長',max:2,desc:'定身效果延長 20%',lv:n=>'定身時間 +'+(n*20)+'%'},
 magnet:{icon:'🧲',name:'連署磁鐵',max:2,desc:'擴大連署書收集範圍',lv:n=>'收集範圍 +'+(n*35)},
 shield:{icon:'🛡️',name:'緊急護盾',max:2,desc:'每關自動抵擋 1 次傷害',lv:n=>'每關抵擋 '+n+' 次'},
 dash:{icon:'💨',name:'瞬間衝刺',max:2,desc:'解鎖衝刺鍵：0.5 秒內速度 ×1.8',lv:n=>'冷卻 '+(n>1?6:9)+' 秒'},
 radar:{icon:'📡',name:'偵查雷達',max:2,desc:'定期顯示附近重要道具與目標方向 4 秒',lv:n=>'每 '+(n>1?12:18)+' 秒一次'},
 lucky:{icon:'🍀',name:'幸運補給',max:2,desc:'道具出現速度 +25%',lv:n=>'道具重生 +'+(n*25)+'%'},
 double:{icon:'✖️',name:'雙倍效率',max:2,desc:'每關開始的一段時間內，連署書獲得量 ×2',lv:n=>'前 '+(n>1?40:25)+' 秒 ×2'}
};
// 移動障礙物整體速度（相對原始設計）；難度差異另由各關的 enemy 係數決定。
A.HAZARD_SPEED=.7;
A.buffLv=(buffs,id)=>clamp((buffs&&buffs[id])|0,0,A.BUFFS[id].max);

// ── 格子尋路（與經典模式同概念，獨立實作）──
function Nav(W,H,rects,cs){
 this.cs=cs;this.gw=Math.ceil(W/cs);this.gh=Math.ceil(H/cs);const N=this.gw*this.gh;
 this.blk=new Uint8Array(N);this.clr=new Float32Array(N);const q=[];
 for(let j=0;j<this.gh;j++)for(let i=0;i<this.gw;i++){const x=i*cs+cs/2,y=j*cs+cs/2,id=j*this.gw+i;
  const b=x<12||y<12||x>W-12||y>H-12||rects.some(s=>x>s.x-12&&x<s.x+s.w+12&&y>s.y-12&&y<s.y+s.h+12);
  this.blk[id]=b?1:0;this.clr[id]=b?0:1e9;if(b)q.push(id);}
 for(let h=0;h<q.length;h++){const id=q[h],i=id%this.gw,j=(id/this.gw)|0;for(let k=0;k<4;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=this.gw||b>=this.gh)continue;const n=b*this.gw+a;if(this.clr[n]>this.clr[id]+1){this.clr[n]=this.clr[id]+1;q.push(n);}}}
}
const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
Nav.prototype.cell=function(x,y){const gw=this.gw,gh=this.gh,i=clamp(Math.floor(x/this.cs),0,gw-1),j=clamp(Math.floor(y/this.cs),0,gh-1);let id=j*gw+i;if(!this.blk[id])return id;
 for(let r=1;r<5;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const a=i+di,b=j+dj;if(a<0||b<0||a>=gw||b>=gh)continue;const n=b*gw+a;if(!this.blk[n])return n;}return id;};
Nav.prototype.bfs=function(src){const gw=this.gw,gh=this.gh,d=new Float32Array(gw*gh).fill(1e9),q=[src];d[src]=0;
 for(let h=0;h<q.length;h++){const id=q[h],i=id%gw,j=(id/gw)|0;for(let k=0;k<8;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=gw||b>=gh)continue;const n=b*gw+a;if(this.blk[n])continue;
  if(k>=4&&(this.blk[j*gw+a]||this.blk[b*gw+i]))continue;const c=d[id]+(k>=4?1.41:1);if(c<d[n]){d[n]=c;q.push(n);}}}return d;};
// 逃跑場：離玩家越遠、越開闊越好，再沿可走路徑鬆弛，避免鑽進死巷。
Nav.prototype.flee=function(dP){const gw=this.gw,gh=this.gh,N=gw*gh,S=new Float32Array(N);
 for(let id=0;id<N;id++)S[id]=this.blk[id]?1e9:-1.2*Math.min(dP[id],60)-2.2*Math.min(this.clr[id],4)+(dP[id]<3?6:0);
 for(let pass=0;pass<20;pass++){let ch=false;for(let dir=0;dir<2;dir++)for(let t=0;t<N;t++){const id=dir?N-1-t:t;if(this.blk[id])continue;const i=id%gw,j=(id/gw)|0;let v=S[id];
  for(let k=0;k<8;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=gw||b>=gh)continue;const n=b*gw+a;if(this.blk[n])continue;if(k>=4&&(this.blk[j*gw+a]||this.blk[b*gw+i]))continue;const c=S[n]+(k>=4?1.41:1);if(c<v)v=c;}
  if(v<S[id]-1e-3){S[id]=v;ch=true;}}if(!ch)break;}return S;};
// 沿場往數值最低的鄰格前進，回傳單位向量。
Nav.prototype.dir=function(F,x,y){const gw=this.gw,gh=this.gh,c=this.cell(x,y),i=c%gw,j=(c/gw)|0;let best=c,bd=F[c];
 for(let k=0;k<8;k++){const a=i+N8[k][0],b=j+N8[k][1];if(a<0||b<0||a>=gw||b>=gh)continue;const n=b*gw+a;if(this.blk[n])continue;if(k>=4&&(this.blk[j*gw+a]||this.blk[b*gw+i]))continue;if(F[n]<bd){bd=F[n];best=n;}}
 if(best===c)return null;const tx=(best%gw)*this.cs+this.cs/2,ty=((best/gw)|0)*this.cs+this.cs/2,dx=tx-x,dy=ty-y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l};};
A.Nav=Nav;

const CSS=[
'.ax-layer{position:absolute;inset:0;z-index:16;background:#0b1620;color:#f3eee4;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,"PingFang TC","Noto Sans TC",sans-serif;overflow:hidden}',
'.ax-top{display:flex;align-items:center;gap:8px;padding:7px 9px;background:#10222f;border-bottom:1px solid #35566a;flex-shrink:0}',
'.ax-top .ax-name{flex:1;min-width:0;font:800 14px system-ui;color:#ffd98f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.ax-top button{background:none;border:1px solid #58798a;color:#dfe9ee;border-radius:8px;width:34px;height:34px;font-size:15px;cursor:pointer;flex-shrink:0}',
'.ax-chips{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;padding:5px 8px;background:#0d1c27;border-bottom:1px solid #26404f;font:800 12px system-ui;flex-shrink:0;min-height:31px}',
'.ax-chips span{background:#1d3a4c;border-radius:999px;padding:4px 9px;white-space:nowrap}.ax-chips .warn{background:#9b2f2f}.ax-chips .ok{background:#126848;color:#d7ffe7}',
'.ax-cv{flex:1;min-height:0;width:100%;display:block;touch-action:none}',
'.ax-msg{position:absolute;left:50%;top:84px;transform:translateX(-50%);background:#f1d27a;color:#1b1b1b;font-weight:800;font-size:14px;padding:6px 14px;border-radius:999px;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;z-index:3}.ax-msg.on{opacity:1}',
'.ax-buffs{position:absolute;left:8px;top:84px;display:flex;flex-direction:column;gap:3px;pointer-events:none;z-index:2}.ax-buffs span{background:#102638d0;border:1px solid #a4b9bb66;border-radius:7px;padding:3px 7px;font:800 11px system-ui}.ax-buffs:empty{display:none}',
'.ax-joy{position:absolute;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:128px;height:128px;border-radius:50%;background:radial-gradient(circle,#ffffff14 40%,#ffffff2a);border:2px solid #ffffff66;touch-action:none;z-index:4;display:none}',
'.ax-layer.playing .ax-joy{display:block}.ax-joy:before{content:"";position:absolute;inset:-30px;border-radius:50%}.ax-joy i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3d6,#f1d09a 60%,#c9a46a);box-shadow:0 4px 14px #0009;pointer-events:none}',
'.ax-dash{position:absolute;left:calc(18px + env(safe-area-inset-left,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px));width:76px;height:76px;border-radius:50%;border:2px solid #ffffff88;background:radial-gradient(circle at 35% 30%,#bfe8ff,#4f8fd6);color:#0b1620;font:900 13px system-ui;z-index:4;display:none;touch-action:none}',
'.ax-layer.playing.has-dash .ax-dash{display:block}.ax-dash.cd{filter:grayscale(1) brightness(.6)}',
'.ax-card{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;text-align:center;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));background:#07111bf0;gap:6px;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}',
'.ax-card>*:first-child{margin-top:auto}.ax-card>*:last-child{margin-bottom:auto}',
'.ax-card h2{margin:0;font:900 clamp(22px,6vw,34px) system-ui;color:#ffd98f}.ax-card h3{margin:6px 0 2px;font:800 15px system-ui;color:#ffe2a6}',
'.ax-card p{margin:3px 0;line-height:1.7;font-size:14px;max-width:460px}.ax-card ul{text-align:left;font-size:13px;line-height:1.75;padding-left:20px;margin:4px 0 8px;max-width:460px}',
'.ax-card button{border:0;border-radius:10px;background:#f1d09a;color:#102338;padding:12px 20px;font-weight:800;font-size:15px;cursor:pointer;min-height:44px}.ax-card button.alt{background:#20394c;color:#f7f4ea;border:1px solid #8297a4}',
'.ax-card button:disabled{opacity:.45;cursor:default}.ax-row{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:6px}',
'.ax-small{font-size:12px!important;color:#b6cdd4}.ax-kick{font:12px ui-monospace,monospace;letter-spacing:3px;color:#f1b99b}',
'.ax-stars{font-size:34px;letter-spacing:6px;min-height:44px}.ax-stars i{font-style:normal;display:inline-block;opacity:.18;transform:scale(.4);transition:opacity .3s,transform .35s cubic-bezier(.3,1.6,.5,1)}.ax-stars i.on{opacity:1;transform:scale(1)}',
'.ax-stats{width:min(100%,380px);background:#112f3de8;border:1px solid #a88f52;border-radius:12px;padding:8px 12px;margin:4px auto;font-size:13px;text-align:left}.ax-stats div{display:flex;justify-content:space-between;padding:3px 0}.ax-stats b{color:#a7ffd6}',
'.ax-buffpick{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;width:min(100%,620px);margin:8px 0}@media(max-width:560px){.ax-buffpick{grid-template-columns:1fr}}',
'.ax-buffpick button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px;background:linear-gradient(160deg,#284a5e,#152a3a);color:#f7f4ea;border:2px solid #d9b875;border-radius:14px;animation:axFlip .45s both}.ax-buffpick button:nth-child(2){animation-delay:.1s}.ax-buffpick button:nth-child(3){animation-delay:.2s}',
'.ax-buffpick button b{font-size:17px;color:#ffe1a3}.ax-buffpick button .ic{font-size:34px}.ax-buffpick button small{font-size:12px;line-height:1.5;color:#cfe0e6}.ax-buffpick button.picked{animation:axPick .5s both;border-color:#9fe3c4}',
'@keyframes axFlip{from{transform:rotateY(90deg) scale(.8);opacity:0}to{transform:none;opacity:1}}@keyframes axPick{50%{transform:scale(1.08);box-shadow:0 0 30px #ffe1a3}to{transform:scale(1)}}',
'.ax-stages{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(100%,560px)}@media(max-width:420px){.ax-stages{grid-template-columns:1fr}}',
'.ax-stage{background:#162938;border:1px solid #7899a14d;border-radius:12px;padding:10px;text-align:left;font-size:12px;line-height:1.55}.ax-stage b{font-size:14px;color:#ffe1a3;display:block}.ax-stage.locked{opacity:.5}.ax-stage.cur{border-color:#f1d09a;box-shadow:0 0 0 1px #f1d09a}.ax-stage button{margin-top:6px;padding:8px 12px;font-size:13px;min-height:38px;width:100%}',
'.ax-diffs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:min(100%,520px)}@media(max-width:420px){.ax-diffs{grid-template-columns:1fr 1fr}}.ax-diffs button{padding:9px 4px;font-size:13px;background:#20394c;color:#f7f4ea;border:1px solid #8297a4}.ax-diffs button.on{background:#f1d09a;color:#102338;border-color:#f1d09a}.ax-diffs small{display:block;font-size:10px;font-weight:600;opacity:.8}',
'.ax-boss{position:absolute;inset:0;z-index:7;background:radial-gradient(circle,#4a1010,#07040a 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;overflow:hidden}',
'.ax-boss .bf{font-size:90px;animation:axBossIn 1s cubic-bezier(.2,1.4,.4,1) both}.ax-boss h2{margin:0;font:900 clamp(30px,9vw,54px) system-ui;color:#ffdf8f;letter-spacing:4px;text-shadow:0 0 24px #f33;animation:axSlam .5s .7s both}.ax-boss p{margin:0;color:#ffd3c7;font-weight:800;animation:axFade .4s 1.1s both}',
'.ax-boss .bar{position:absolute;left:0;right:0;height:46px;background:repeating-linear-gradient(45deg,#ffd23f 0 22px,#111 22px 44px);opacity:.85}.ax-boss .bar.t{top:0;animation:axBarT .5s both}.ax-boss .bar.b{bottom:0;animation:axBarB .5s both}',
'@keyframes axBossIn{from{transform:translateX(120vw) rotate(40deg)}to{transform:none}}@keyframes axSlam{from{transform:scale(3);opacity:0}to{transform:none;opacity:1}}@keyframes axFade{from{opacity:0}to{opacity:1}}@keyframes axBarT{from{transform:translateY(-100%)}}@keyframes axBarB{from{transform:translateY(100%)}}',
'.ax-toast{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);z-index:10001;transform:translateX(-50%);background:linear-gradient(135deg,#ffe8a8,#f1b95a);color:#2b1a05;border-radius:14px;padding:10px 16px;font:900 14px system-ui;box-shadow:0 10px 40px #000a;display:flex;align-items:center;gap:10px;pointer-events:none;animation:axToast 3.2s both;max-width:92vw;overflow:hidden}',
'.ax-toast .ic{font-size:28px;animation:axSpin .8s .2s both}.ax-toast small{display:block;font-size:11px;font-weight:700;opacity:.8}.ax-toast:after{content:"";position:absolute;top:0;bottom:0;width:40px;background:#fff8;transform:skewX(-20deg);animation:axShine 1.2s .3s both}',
'@keyframes axToast{0%{transform:translate(-50%,-140%)}12%{transform:translate(-50%,0) scale(1.06)}18%,85%{transform:translate(-50%,0)}100%{transform:translate(-50%,-160%)}}@keyframes axSpin{from{transform:rotate(-200deg) scale(.2)}to{transform:none}}@keyframes axShine{from{left:-60px}to{left:110%}}',
'.ax-tip{position:absolute;left:50%;bottom:calc(160px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#0b1620e8;border:1px solid #f1d09a88;color:#ffeccc;border-radius:12px;padding:8px 12px;font:700 13px system-ui;max-width:min(88%,420px);text-align:center;pointer-events:none;z-index:3;transition:opacity .4s}',
'@media (prefers-reduced-motion:reduce){.ax-layer *,.ax-toast,.ax-toast *{animation-duration:.01s!important;transition:none!important}}'
].join('');
A.css=function(){if(document.getElementById('ax-css'))return;const s=document.createElement('style');s.id='ax-css';s.textContent=CSS;document.head.append(s);};

// 解鎖成就時的動畫提示（佇列依序播放）
const toastQ=[];let toastOn=false;
A.toast=function(icon,title,sub){A.css();toastQ.push([icon,title,sub]);if(!toastOn)nextToast();};
function nextToast(){const t=toastQ.shift();if(!t){toastOn=false;return;}toastOn=true;const e=document.createElement('div');e.className='ax-toast';e.setAttribute('role','status');e.innerHTML='<span class="ic">'+t[0]+'</span><span>'+t[1]+'<small>'+(t[2]||'')+'</small></span>';document.body.append(e);snd().sfx('coin');setTimeout(()=>{e.remove();nextToast();},3200);}

// 共用繪圖
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function txt(c,t,x,y,size,color,weight){c.font=(weight||700)+' '+size+'px system-ui,"PingFang TC","Noto Sans TC",sans-serif';c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(t,x,y);}
A.draw={rr,txt};

/* ── 遊戲本體 ──
   cfg: {stage(關卡定義), diff, buffs, seed, mode:'run'|'single'|'daily', daily, debug, onEnd(result), onPause(game)} */
function Game(layer,cfg){
 const g=this;
 g.cfg=cfg;g.layer=layer;g.def=cfg.stage;g.diff=cfg.diff||A.DIFFS.normal;g.buffs=cfg.mode==='daily'?{}:(cfg.buffs||{});
 g.rng=FackExpStore.rng(cfg.seed>>>0);
 const cv=layer.querySelector('.ax-cv'),ctx=cv.getContext('2d');g.ctx=ctx;
 g.VW=300;g.VH=300;g.k=1;g.camX=0;g.camY=0;g.t=0;g.over=false;g.paused=false;g.lock=0;g.celebrate=0;g.shake=0;
 g.solids=[];g.dyn=[];g.items=[];g.papers=[];g.guards=[];g.hazards=[];g.belts=[];g.gates=[];g.zones=[];g.secrets=[];g.fx=[];g.teles=[];g.spawners=[];
 g.P={x:100,y:100,r:14,fx:0,fy:1,mv:0,walk:0,slow:0};
 g.eff={speed:0,shield:0,magnet:0,radar:0,smoke:0,freeze:0,dash:0,pass:0};
 g.maxHearts=g.diff.hearts;g.hearts=g.maxHearts;g.inv=0;g.damage=0;g.paperScore=0;g.itemsUsed={};g.hidden=false;g.flags={};
 g.shieldCharges=A.buffLv(g.buffs,'shield');g.dashLv=A.buffLv(g.buffs,'dash');g.dashCD=0;g.radarT=0;
 g.limit=60;g.time=60;
 // 永久裝備：只在冒險模式（冒險／單關）生效
 g.gearId=cfg.mode==='daily'?null:(cfg.gear||null);g.gx=A.gear?A.gear.fx(g.gearId):{speed:0,pick:0,magnetMul:1,speedDur:1,freeze:0,itemDur:0,time:0,shield:0,hearts:0,radar:0,battery:1,cart:0,paper:0,cloneMark:false};
 g.def.setup(g);
 if(g.gx.time){g.limit*=1+g.gx.time;if(g.dayLen)g.dayLen*=1+g.gx.time;if(g.hourglass)g.hourglass*=1+g.gx.time;}
 if(g.gx.hearts){g.maxHearts+=g.gx.hearts;g.hearts=g.maxHearts;}
 g.shieldCharges+=g.gx.shield;
 g.time=g.limit;
 g.nav=new Nav(g.W,g.H,g.solids,25);
 if(g.dashLv)layer.classList.add('has-dash');else layer.classList.remove('has-dash');
 layer.querySelector('.ax-name').textContent=g.def.icon+' '+g.def.name+(cfg.mode==='daily'?'':'｜'+g.diff.e+g.diff.n);
 const keys={},stick={x:0,y:0,on:false};g.keys=keys;
 const joy=layer.querySelector('.ax-joy'),knob=joy.querySelector('i'),dashB=layer.querySelector('.ax-dash');
 function joyMove(e){const r=joy.getBoundingClientRect(),R=r.width/2;let dx=(e.clientX-r.left-R)/R,dy=(e.clientY-r.top-R)/R;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}stick.x=dx;stick.y=dy;stick.on=true;knob.style.transform='translate('+dx*36+'px,'+dy*36+'px)';}
 function joyEnd(){stick.on=false;stick.x=stick.y=0;knob.style.transform='';joy.dragging=false;}
 joy.onpointerdown=e=>{e.preventDefault();try{joy.setPointerCapture(e.pointerId);}catch(_){}joy.dragging=true;joyMove(e);};
 joy.onpointermove=e=>{if(joy.dragging)joyMove(e);};
 joy.onpointerup=joy.onpointercancel=joy.onlostpointercapture=joyEnd;
 dashB.onpointerdown=e=>{e.preventDefault();g.dash();};
 cv.onpointerdown=e=>e.preventDefault();
 const MOVE=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
 const kd=e=>{if(g.over)return;const kk=e.key.length===1?e.key.toLowerCase():e.key;
  if(MOVE.includes(kk)){keys[kk]=true;e.preventDefault();}
  else if(kk===' '||kk==='Shift'){g.dash();e.preventDefault();}
  else if(kk==='Escape'||kk==='p'){if(!g.paused)g.pause();e.preventDefault();}};
 const ku=e=>{const kk=e.key.length===1?e.key.toLowerCase():e.key;keys[kk]=false;};
 const rs=()=>g.layout();
 const vis=()=>{if(document.hidden&&!g.paused&&!g.over)g.pause();};
 const blur=()=>{Object.keys(keys).forEach(k=>keys[k]=false);};
 window.addEventListener('keydown',kd,true);window.addEventListener('keyup',ku,true);window.addEventListener('resize',rs);document.addEventListener('visibilitychange',vis);window.addEventListener('blur',blur);
 g.input=()=>{if(g.botInput!==undefined)return g.botInput;let mx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),my=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0),mag=1;
  if(!mx&&!my&&stick.on){const m=Math.hypot(stick.x,stick.y);if(m>.18){mx=stick.x;my=stick.y;mag=Math.min(1,m*1.25);}}
  const l=Math.hypot(mx,my);return l?{x:mx/l,y:my/l,m:mag}:null;};
 let raf=0,last=0;
 g.stopped=false;
 g.stop=()=>{if(g.stopped)return;g.stopped=true;g.over=true;cancelAnimationFrame(raf);joyEnd();layer.classList.remove('playing');snd().stop();
  window.removeEventListener('keydown',kd,true);window.removeEventListener('keyup',ku,true);window.removeEventListener('resize',rs);document.removeEventListener('visibilitychange',vis);window.removeEventListener('blur',blur);
  joy.onpointerdown=joy.onpointermove=joy.onpointerup=joy.onpointercancel=joy.onlostpointercapture=null;dashB.onpointerdown=null;cv.onpointerdown=null;};
 function loop(t){if(g.stopped)return;const dt=Math.min(.05,(t-(last||t))/1000);last=t;if(!g.paused){g.step(dt);}if(!g.stopped){g.render();raf=requestAnimationFrame(loop);}}
 g.pause=()=>{if(g.over)return;g.paused=true;joyEnd();Object.keys(keys).forEach(k=>keys[k]=false);snd().stop();layer.classList.remove('playing');if(cfg.onPause)cfg.onPause(g);};
 g.resume=()=>{if(g.over)return;g.paused=false;last=0;layer.classList.add('playing');snd().start();};
 g.layout();
 g.cam(true);
 layer.classList.add('playing');snd().start();
 if(g.def.start)g.def.start(g);
 raf=requestAnimationFrame(loop);
 if(cfg.debug)g.debug={teleport:(x,y)=>{g.P.x=x;g.P.y=y;},win:()=>g.win(),fail:()=>g.fail('測試'),hurt:()=>g.hurt('test'),step:(n,dt)=>{for(let i=0;i<n;i++)g.step(dt||1/60);},setInput:v=>{g.botInput=v;}};
}
A.Game=Game;
const G=Game.prototype;
G.layout=function(){const r=this.ctx.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);this.VW=Math.max(200,r.width);this.VH=Math.max(200,r.height);this.ctx.canvas.width=this.VW*dpr;this.ctx.canvas.height=this.VH*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.k=Math.min(this.VW,this.VH)/(this.def.view||430);};
G.cam=function(snap){const g=this,vw=g.VW/g.k,vh=g.VH/g.k;let tx=clamp(g.P.x-vw/2,0,Math.max(0,g.W-vw)),ty=clamp(g.P.y-vh/2,0,Math.max(0,g.H-vh));if(g.W<vw)tx=(g.W-vw)/2;if(g.H<vh)ty=(g.H-vh)/2;
 if(snap){g.camX=tx;g.camY=ty;}else{g.camX=lerp(g.camX,tx,.18);g.camY=lerp(g.camY,ty,.18);}};
G.rect=function(x,y,w,h,o){return Object.assign({x,y,w,h},o||{});};
G.inRects=function(x,y,pad,list){return (list||this.blockers()).some(s=>x>s.x-pad&&x<s.x+s.w+pad&&y>s.y-pad&&y<s.y+s.h+pad);};
G.blockers=function(){const g=this,out=g.solids.slice();g.dyn.forEach(d=>{if(!d.gone)out.push(d);});g.gates.forEach(t=>{if(t.closed)out.push(t);});g.secrets.forEach(s=>{if(!s.open)out.push(s);});return out;};
// 隨機找空位（使用關卡種子，確保每日挑戰的配置固定）
G.free=function(o){o=o||{};const g=this,pad=o.pad||22,avoid=o.avoid||[],area=o.area||{x:0,y:0,w:g.W,h:g.H};const bl=g.blockers();
 for(let n=0;n<200;n++){const x=area.x+pad+g.rng()*(area.w-pad*2),y=area.y+pad+g.rng()*(area.h-pad*2);
  if(g.inRects(x,y,pad,bl)||g.belts.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h&&!o.onBelt))continue;
  if(o.far&&dist({x,y},o.far)<(o.farD||200))continue;
  if(avoid.some(a=>dist(a,{x,y})<(o.gap||60)))continue;
  if(g.items.some(a=>dist(a,{x,y})<40))continue;
  return{x,y};}
 return o.fallback||{x:g.P.x,y:g.P.y-60};};
G.collide=function(e,list){const g=this;e.x=clamp(e.x,e.r,g.W-e.r);e.y=clamp(e.y,e.r,g.H-e.r);
 for(const s of list||g.blockers()){const cx=clamp(e.x,s.x,s.x+s.w),cy=clamp(e.y,s.y,s.y+s.h),dx=e.x-cx,dy=e.y-cy,d=Math.hypot(dx,dy);
  if(d<e.r){if(d>.01){e.x=cx+dx/d*e.r;e.y=cy+dy/d*e.r;}else{const l=e.x-s.x,r=s.x+s.w-e.x,t=e.y-s.y,b=s.y+s.h-e.y,m=Math.min(l,r,t,b);if(m===l)e.x=s.x-e.r;else if(m===r)e.x=s.x+s.w+e.r;else if(m===t)e.y=s.y-e.r;else e.y=s.y+s.h+e.r;}if(s.onBump)s.onBump(e);}}};
// 視線檢查：線段上取樣，被障礙物擋住就看不到。
G.los=function(a,b,list){const n=Math.max(4,Math.ceil(dist(a,b)/18));list=list||this.blockers();for(let i=1;i<n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(list.some(s=>x>s.x&&x<s.x+s.w&&y>s.y&&y<s.y+s.h))return false;}return true;};
G.msg=function(t,d){const m=this.layer.querySelector('.ax-msg');if(!m)return;m.textContent=t;m.classList.add('on');this.msgT=d||2.2;};
G.tip=function(t,d){let e=this.layer.querySelector('.ax-tip');if(!e){e=document.createElement('div');e.className='ax-tip';this.layer.append(e);}e.textContent=t;e.style.opacity=1;this.tipT=d||5;};
G.puff=function(x,y,text,color,n){for(let i=0;i<(n||8);i++){const a=this.rng()*6.28,s=40+this.rng()*90;this.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.6,max:.6,c:color||'#fff',s:3+this.rng()*3});}if(text)this.fx.push({x,y:y-10,vx:0,vy:-40,life:1,max:1,text,c:color||'#fff'});};
G.speed=function(){const g=this;let s=168*(1+.1*A.buffLv(g.buffs,'swift'));if(g.eff.speed>0)s*=1.55;if(g.eff.dash>0)s*=1.8;if(g.P.slow>0)s*=.55;s*=1+g.gx.speed;if(g.def.speedMul)s*=g.def.speedMul(g);return s;};
G.freezeDur=function(b){return (b||3)*(1+.2*A.buffLv(this.buffs,'extend')+this.gx.freeze);};
G.magR=function(){const g=this;return 20+g.gx.pick+(35*A.buffLv(g.buffs,'magnet')+(g.eff.magnet>0?95:0))*g.gx.magnetMul;};
G.dash=function(){const g=this;if(!g.dashLv||g.dashCD>0||g.over||g.paused||g.lock>0)return;g.eff.dash=.5;g.dashCD=g.dashLv>1?6:9;snd().sfx('slide');g.puff(g.P.x,g.P.y,null,'#bfe8ff',6);};
G.paperMul=function(){const n=A.buffLv(this.buffs,'double');return (n&&this.t<(n>1?40:25)?2:1)*(1+this.gx.paper);};
G.useItem=function(type,it){const g=this,I=A.ITEMS[type];g.itemsUsed[type]=1;
 const idur=1+g.gx.itemDur;if(type==='speed')g.eff.speed=3*g.gx.speedDur*idur;else if(type==='shield')g.eff.shield=8*idur;else if(type==='magnet')g.eff.magnet=8*idur;else if(type==='radar')g.eff.radar=8;else if(type==='smoke'){g.eff.smoke=4;g.guards.forEach(o=>{if(o.state==='chase')o.state='return';});}
 else if(type==='freeze')g.eff.freeze=g.freezeDur();else if(type==='battery')g.battery=Math.min(100,(g.battery||0)+40);else if(type==='hourglass')g.time+=g.hourglass||10;
 else if(type==='onigiri')g.hearts=Math.min(g.maxHearts,g.hearts+1);else if(type==='key')g.hasKey=true;else if(type==='pass')g.eff.pass=10;
 snd().sfx(type==='freeze'?'boing':'coin');g.puff(it?it.x:g.P.x,it?it.y:g.P.y,I.icon+' '+I.name,'#ffe09c',10);
 if(!(g.def.onItem&&g.def.onItem(g,type)))g.msg(I.icon+' '+I.name+'：'+I.desc);};
G.addItem=function(type,x,y,o){const it=Object.assign({x,y,type,r:17,bob:this.rng()*6},o||{});this.items.push(it);return it;};
G.addPapers=function(n,o){for(let i=0;i<n;i++){const p=this.free(Object.assign({pad:20,gap:50,avoid:this.papers},o||{}));this.papers.push({x:p.x,y:p.y,r:12,v:(o&&o.v)||50});}};
// 巡邏員：沿路徑巡邏，視野錐形內且沒有被障礙物擋住就會追；追丟 3 秒回到路線。
G.addGuard=function(path,o){const p0=path[0],gm=this.diff.enemy*(this.diff.guard||1),sp=(o&&o.spd||72)*gm;const gd=Object.assign({x:p0.x,y:p0.y,r:14,path,i:1%path.length,ps:sp,cs:(o&&o.chase||128)*gm,range:(o&&o.range)||175,fov:1.25,ang:0,state:'patrol',sus:0,lost:0,stun:0,navT:0,field:null,name:(o&&o.name)||'巡邏員',grace:3},o||{});gd.ps=sp;this.guards.push(gd);return gd;};
G.canSee=function(o){const g=this,P=g.P;if(g.eff.smoke>0||o.grace>0)return false;const d=dist(o,P);if(d<38)return true;if(d>o.range)return false;let a=Math.atan2(P.y-o.y,P.x-o.x)-o.ang;a=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(a)>o.fov/2)return false;return g.los(o,P);};
G.moveTo=function(o,tx,ty,sp,dt){const g=this;// 直線看得到就直走，否則沿 BFS 場繞路
 let d=null;if(g.los(o,{x:tx,y:ty},g.solids)){const dx=tx-o.x,dy=ty-o.y,l=Math.hypot(dx,dy);if(l>1)d={x:dx/l,y:dy/l};}
 else{o.navT-=dt;if(o.navT<=0||!o.field||o.fieldFor!==(Math.round(tx/25)+','+Math.round(ty/25))){o.field=g.nav.bfs(g.nav.cell(tx,ty));o.fieldFor=Math.round(tx/25)+','+Math.round(ty/25);o.navT=.5;}d=g.nav.dir(o.field,o.x,o.y);}
 if(d){o.x+=d.x*sp*dt;o.y+=d.y*sp*dt;const ta=Math.atan2(d.y,d.x);let da=ta-o.ang;da=Math.atan2(Math.sin(da),Math.cos(da));o.ang+=da*Math.min(1,dt*8);o.mv=1;}else o.mv=0;
 g.collide(o);};
G.updGuards=function(dt){const g=this,P=g.P;g.guards.forEach(o=>{o.grace=Math.max(0,o.grace-dt);o.walk=(o.walk||0)+dt*(o.mv?10:0);
 if(g.eff.freeze>0&&!o.noFreeze){o.mv=0;return;}
 if(o.stun>0){o.stun-=dt;o.mv=0;return;}
 const see=g.canSee(o);
 if(see){o.sus+=dt;o.lost=0;o.seenAt={x:P.x,y:P.y};if(o.sus>.35&&o.state!=='chase'){o.state='chase';o.alert=1.2;g.msg('❗ 被'+o.name+'發現了！躲到障礙物後面甩開他');snd().sfx('shout');}}
 else{o.sus=Math.max(0,o.sus-dt*.6);if(o.state==='chase'){o.lost+=dt;if(o.lost>3){o.state='return';g.msg('呼…'+o.name+'跟丟了');}}}
 o.alert=Math.max(0,(o.alert||0)-dt);
 // 追擊：看得到就追本人；看不到只會去「最後看到你的位置」，所以躲到障礙物後面可以甩開
 if(o.state==='chase'){const tg=see||!o.seenAt?P:o.seenAt;g.moveTo(o,tg.x,tg.y,o.cs,dt);if(!see&&o.seenAt&&dist(o,o.seenAt)<10)o.lost=Math.max(o.lost,2.2);}
 else{let w=o.path[o.i];if(o.state==='return'){let bi=0,bd=1e9;o.path.forEach((q,i)=>{const dd=dist(q,o);if(dd<bd){bd=dd;bi=i;}});if(bd<10){o.state='patrol';o.i=(bi+1)%o.path.length;}else w=o.path[bi];}
  g.moveTo(o,w.x,w.y,o.ps,dt);if(o.state==='patrol'&&dist(o,w)<8)o.i=(o.i+1)%o.path.length;}
 if(dist(o,P)<o.r+P.r&&o.stun<=0){if(g.hurt(o.name)){const dx=P.x-o.x,dy=P.y-o.y,l=Math.hypot(dx,dy)||1;P.x+=dx/l*40;P.y+=dy/l*40;g.collide(P);}o.stun=1.6;o.state='return';o.sus=0;g.puff(o.x,o.y-20,'抱歉抱歉','#ffe09c',0);}
});};
G.hurt=function(src){const g=this;if(g.over||g.inv>0||g.celebrate>0)return false;
 if(g.eff.shield>0){g.inv=.7;g.msg('🛡️ 護盾擋下了！');snd().sfx('boing');g.puff(g.P.x,g.P.y,null,'#9ae7ff',8);return false;}
 if(g.shieldCharges>0){g.shieldCharges--;g.inv=1.3;g.msg('🛡️ 緊急護盾抵擋了一次傷害！（剩 '+g.shieldCharges+' 次）');snd().sfx('boing');g.puff(g.P.x,g.P.y,null,'#9ae7ff',12);return false;}
 g.damage++;g.inv=1.5;g.shake=.3;snd().sfx('puff');
 if(g.def.onHurt&&g.def.onHurt(g,src))return true;
 g.hearts--;g.puff(g.P.x,g.P.y,'-1 ❤️','#ff8a7a',10);
 if(g.hearts<=0){g.fail('愛心用完了');}else g.msg('💥 '+(src||'受傷')+'！剩 '+g.hearts+' 顆愛心');
 return true;};
// 預警：先畫出範圍再結算，避免不公平的瞬間失敗。
G.tele=function(o){o.t=0;this.teles.push(o);return o;};
G.win=function(extra){const g=this;if(g.over||g.celebrate>0)return;g.winExtra=extra||{};g.celebrate=g.def.celebrate||1.6;snd().sfx('win');g.puff(g.P.x,g.P.y,'🎉','#ffe09c',24);if(g.def.onWin)g.def.onWin(g);};
G.fail=function(reason){const g=this;if(g.over)return;g.finish(false,reason);};
G.finish=function(win,reason){const g=this;if(g.over)return;g.stop();if(!win)snd().sfx('lose');g.render();
 const used=Math.max(1,Math.round(g.limit-g.time)),rem=Math.max(0,Math.ceil(g.time));
 const res={win,reason:reason||'',stage:g.def.id,mode:g.cfg.mode,diff:g.diff.id,used,remaining:rem,limit:Math.round(g.limit),hearts:g.hearts,maxHearts:g.maxHearts,damage:g.damage,papers:g.paperScore,itemsUsed:Object.assign({},g.itemsUsed),hidden:g.hidden,flags:Object.assign({},g.flags),extra:g.winExtra||{}};
 res.stars=win?(g.def.stars?g.def.stars(g,res):1+(g.damage===0?1:0)+(rem>=g.limit*.35?1:0)):0;
 res.score=win?Math.round(g.paperScore+rem*10+g.hearts*100+res.stars*200):Math.round(g.paperScore);
 if(g.def.result)g.def.result(g,res);
 g.cfg.onEnd(res,g);};
G.step=function(dt){const g=this;if(g.over)return;
 g.fx=g.fx.filter(f=>{f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;if(!f.text){f.vx*=.92;f.vy*=.92;}return f.life>0;});
 if(g.msgT>0){g.msgT-=dt;if(g.msgT<=0){const m=g.layer.querySelector('.ax-msg');m&&m.classList.remove('on');}}
 if(g.tipT>0){g.tipT-=dt;if(g.tipT<=0){const e=g.layer.querySelector('.ax-tip');if(e)e.style.opacity=0;}}
 g.shake=Math.max(0,g.shake-dt);
 if(g.celebrate>0){g.celebrate-=dt;if(g.def.celebrateStep)g.def.celebrateStep(g,dt);if(g.celebrate<=0)g.finish(true);return;}
 if(g.lock>0){g.lock-=dt;if(g.def.lockStep)g.def.lockStep(g,dt);return;}
 g.t+=dt;g.time-=dt;if(g.time<=0){g.time=0;g.fail('時間到了');return;}
 snd().setFast(g.time<20);
 Object.keys(g.eff).forEach(k=>g.eff[k]=Math.max(0,g.eff[k]-dt));
 g.inv=Math.max(0,g.inv-dt);g.dashCD=Math.max(0,g.dashCD-dt);g.P.slow=Math.max(0,g.P.slow-dt);
 const rl=A.buffLv(g.buffs,'radar');if(!rl&&g.gx.radar){g.radarT+=dt;if(g.radarT>=g.gx.radar){g.radarT=0;g.eff.radar=Math.max(g.eff.radar,3);g.msg('🎧 情報耳機：掃描中…');}}if(rl){g.radarT+=dt;const every=rl>1?12:18;if(g.radarT>=every){g.radarT=0;g.eff.radar=Math.max(g.eff.radar,4);g.msg('📡 偵查雷達掃描中…');}}
 // 玩家移動
 const P=g.P,inp=g.input();
 if(inp){const sp=g.speed()*inp.m*dt;P.x+=inp.x*sp;P.y+=inp.y*sp;P.fx=inp.x;P.fy=inp.y;P.mv=1;P.walk+=dt*12;}else P.mv=0;
 g.belts.forEach(b=>{if(P.x>b.x&&P.x<b.x+b.w&&P.y>b.y&&P.y<b.y+b.h){const f=g.eff.freeze>0?.25:1;P.x+=b.dx*b.spd*f*dt;P.y+=b.dy*b.spd*f*dt;}});
 const bl=g.blockers();g.collide(P,bl);
 // 閘門：週期開關（綠＝開、黃＝即將關閉、紅＝關閉）；關閉瞬間若人在閘門裡會被推出去。
 g.gates.forEach(t=>{if(t.always!=null){t.closed=!t.always(g)&&!(g.eff.pass>0);}else{const c=((g.t+t.off)%t.period+t.period)%t.period;t.phase=c<t.open?'open':c<t.open+t.warn?'warn':'closed';t.left=c<t.open+t.warn?t.open+t.warn-c:t.period-c;t.closed=t.phase==='closed'&&!(g.eff.pass>0);}});
 // 移動障礙物（定身時停止）
 g.hazards.forEach(h=>{if(g.eff.freeze<=0)h.ph+=dt/h.period*A.HAZARD_SPEED;const s=(Math.sin(h.ph*Math.PI*2)+1)/2;h.x=lerp(h.ax,h.bx,s);h.y=lerp(h.ay,h.by,s);
  const cx=clamp(P.x,h.x,h.x+h.w),cy=clamp(P.y,h.y,h.y+h.h);if(Math.hypot(P.x-cx,P.y-cy)<P.r-2){g.hurt(h.name||'撞到障礙');const dx=P.x-(h.x+h.w/2),dy=P.y-(h.y+h.h/2),l=Math.hypot(dx,dy)||1;P.x+=dx/l*36;P.y+=dy/l*36;g.collide(P);}});
 g.zones.forEach(z=>{if(P.x>z.x-P.r*.5&&P.x<z.x+z.w+P.r*.5&&P.y>z.y&&P.y<z.y+z.h){g.hurt(z.name);if(z.push){P.x+=z.push.x;P.y+=z.push.y;}g.collide(P);}});
 // 隱藏牆：持續推擠 0.6 秒就會打開
 g.secrets.forEach(s=>{if(s.open)return;const cx=clamp(P.x,s.x,s.x+s.w),cy=clamp(P.y,s.y,s.y+s.h);if(inp&&Math.hypot(P.x-cx,P.y-cy)<P.r+3){s.push=(s.push||0)+dt;if(s.push>.6){s.open=true;snd().sfx('win');g.puff(s.x+s.w/2,s.y+s.h/2,'發現隱藏捷徑！','#ffe09c',20);if(s.onOpen)s.onOpen(g);}}});
 // 道具與連署書
 const magR=g.magR();
 // 先收集「被撿到」的道具，再執行效果：效果中新增的道具（例如鑰匙）才不會被陣列替換吃掉。
 const picked=[];g.items=g.items.filter(it=>{it.bob+=dt*3;if(it.hiddenUntilNear&&dist(it,P)>110)return true;if(dist(it,P)<P.r+it.r){picked.push(it);return false;}return true;});
 picked.forEach(it=>{if(it.onPick){if(it.onPick(g,it)===false)g.items.push(it);}else g.useItem(it.type,it);});
 g.papers=g.papers.filter(p=>{const d=dist(p,P);if(d<magR+p.r&&d>1){const s=Math.min(d,380*dt);p.x+=(P.x-p.x)/d*s;p.y+=(P.y-p.y)/d*s;}if(d<P.r+p.r){const v=Math.round(p.v*g.paperMul());g.paperScore+=v;g.puff(p.x,p.y,'+'+v,'#fff8ca',3);snd().sfx('coin');if(g.def.onPaper)g.def.onPaper(g,v);return false;}return true;});
 g.spawners.forEach(sp=>{const lucky=1+.25*A.buffLv(g.buffs,'lucky');sp.t=(sp.t==null?sp.every:sp.t)-dt*lucky;if(sp.t<=0){sp.t=sp.every;const n=g.items.filter(i=>sp.types.includes(i.type)).length;if(n<sp.max){const p=g.free(Object.assign({pad:24,far:P,farD:120},sp.opt||{}));g.addItem(sp.types[Math.floor(g.rng()*sp.types.length)],p.x,p.y);}}});
 g.updGuards(dt);
 g.teles=g.teles.filter(o=>{o.t+=dt;if(o.t>=o.dur){if(o.done)o.done(g,o);return false;}return true;});
 if(g.def.update)g.def.update(g,dt);
};
// ── 繪圖 ──
G.person=function(e,body,hair,name,o){const c=this.ctx;o=o||{};const bob=e.mv?Math.sin(e.walk||0)*2:0,sq=e.mv?1+Math.sin((e.walk||0)*2)*.04:1;
 c.globalAlpha=o.alpha==null?1:o.alpha;c.fillStyle='#0006';c.beginPath();c.ellipse(e.x,e.y+e.r*.95,e.r*(o.shadow===false?0:1),e.r*.38,0,0,7);c.fill();
 c.save();c.translate(e.x,e.y+bob);c.scale(1/sq,sq);
 c.fillStyle=body;c.beginPath();c.arc(0,0,e.r,0,7);c.fill();
 c.fillStyle='#f1c9a5';c.beginPath();c.arc(0,-e.r*.15,e.r*.55,0,7);c.fill();
 c.fillStyle=hair;c.beginPath();c.arc(0,-e.r*.35,e.r*.58,Math.PI,0);c.fill();
 const fx=e.fx!=null?e.fx:Math.cos(e.ang||0),fy=e.fy!=null?e.fy:Math.sin(e.ang||0);c.fillStyle='#1b1b1b';c.beginPath();c.arc(fx*3-2.5,-e.r*.12+fy*2,1.4,0,7);c.arc(fx*3+2.5,-e.r*.12+fy*2,1.4,0,7);c.fill();
 c.restore();c.globalAlpha=1;
 if(name){rr(c,e.x-24,e.y-e.r-28+bob,48,18,9);c.fillStyle=o.tag||'#0b1620cc';c.fill();txt(c,name,e.x,e.y-e.r-19+bob,12,'#fff');}};
G.drawSolid=function(s){const c=this.ctx,th=this.def.theme||{};
 if(s.kind==='cone'){txt(c,'🚧',s.x+s.w/2,s.y+s.h/2,s.w*1.1,'#fff');return;}
 c.fillStyle='#0007';rr(c,s.x+3,s.y+5,s.w,s.h,5);c.fill();
 const col={fab:'#d9e2e8',ware:'#8b6f4e',office:'#3f7fae',box:'#c0573e',rack:'#6c7a86',shed:'#5a6b52',wall:th.wall||'#5d6d78',pillar:'#7d8b95',crate:'#a77b45',desk:'#b9825a'}[s.kind]||th.wall||'#5d6d78';
 c.fillStyle=col;rr(c,s.x,s.y,s.w,s.h,s.kind==='wall'?3:6);c.fill();
 if(s.kind==='crate'){c.strokeStyle='#6d4a22';c.lineWidth=3;c.beginPath();c.moveTo(s.x+4,s.y+4);c.lineTo(s.x+s.w-4,s.y+s.h-4);c.moveTo(s.x+s.w-4,s.y+4);c.lineTo(s.x+4,s.y+s.h-4);c.stroke();}
 else if(s.kind==='box'){c.fillStyle='#0002';for(let x=s.x+8;x<s.x+s.w-4;x+=14)c.fillRect(x,s.y+4,5,s.h-8);}
 else if(s.kind==='rack'){c.fillStyle='#e3c27a';for(let y=s.y+10;y<s.y+s.h-6;y+=24)c.fillRect(s.x+6,y,s.w-12,8);}
 else if(s.kind==='wall'||s.kind==='pillar'){c.fillStyle='#ffffff14';c.fillRect(s.x,s.y,s.w,Math.min(6,s.h));}
 if(s.label){const size=Math.min(15,Math.max(10,Math.min(s.w,s.h)/4));c.font='800 '+size+'px system-ui';const tw=c.measureText(s.label).width;rr(c,s.x+s.w/2-tw/2-6,s.y+s.h/2-size*.8,tw+12,size*1.6,5);c.fillStyle='#ffffffc8';c.fill();txt(c,s.label,s.x+s.w/2,s.y+s.h/2,size,'#1d3c55',800);}};
G.render=function(){const g=this,c=g.ctx,P=g.P,now=performance.now()/1000;
 g.cam(false);
 const th=g.def.theme||{};c.fillStyle='#111a20';c.fillRect(0,0,g.VW,g.VH);
 c.save();if(g.shake>0)c.translate((Math.random()-.5)*8*g.shake/.3,(Math.random()-.5)*8*g.shake/.3);c.scale(g.k,g.k);c.translate(-g.camX,-g.camY);
 c.fillStyle=th.floor||'#56656d';c.fillRect(0,0,g.W,g.H);
 c.strokeStyle=th.grid||'#ffffff10';c.lineWidth=1;c.beginPath();const x0=Math.floor(g.camX/80)*80,y0=Math.floor(g.camY/80)*80,x1=g.camX+g.VW/g.k,y1=g.camY+g.VH/g.k;for(let x=x0;x<x1;x+=80){c.moveTo(x,Math.max(0,g.camY));c.lineTo(x,Math.min(g.H,y1));}for(let y=y0;y<y1;y+=80){c.moveTo(Math.max(0,g.camX),y);c.lineTo(Math.min(g.W,x1),y);}c.stroke();
 if(g.def.floor)g.def.floor(g,c,now);
 // 輸送帶：箭頭流動顯示方向
 g.belts.forEach(b=>{c.fillStyle='#2d3a42';c.fillRect(b.x,b.y,b.w,b.h);c.strokeStyle='#f1d27a88';c.lineWidth=3;const off=(now*b.spd*(g.eff.freeze>0?.25:1))%40;c.save();c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.clip();
  if(b.dx){for(let x=b.x-40+(b.dx>0?off:40-off);x<b.x+b.w+40;x+=40)for(let y=b.y+12;y<b.y+b.h;y+=26){c.beginPath();c.moveTo(x-6*b.dx,y-7);c.lineTo(x+6*b.dx,y);c.lineTo(x-6*b.dx,y+7);c.stroke();}}
  else{for(let y=b.y-40+(b.dy>0?off:40-off);y<b.y+b.h+40;y+=40)for(let x=b.x+12;x<b.x+b.w;x+=26){c.beginPath();c.moveTo(x-7,y-6*b.dy);c.lineTo(x,y+6*b.dy);c.lineTo(x+7,y-6*b.dy);c.stroke();}}c.restore();c.strokeStyle='#f1d27a';c.lineWidth=2;c.strokeRect(b.x,b.y,b.w,b.h);});
 g.zones.forEach(z=>{c.fillStyle='#8b1e1e';c.fillRect(z.x,z.y,z.w,z.h);c.save();c.beginPath();c.rect(z.x,z.y,z.w,z.h);c.clip();c.strokeStyle='#ffd23f';c.lineWidth=6;for(let k=-z.h;k<z.w+z.h;k+=22){c.beginPath();c.moveTo(z.x+k,z.y);c.lineTo(z.x+k-z.h,z.y+z.h);c.stroke();}c.restore();if(z.label)txt(c,z.label,z.x+z.w/2,z.y+z.h/2,12,'#fff',900);});
 // 移動障礙物的軌道
 g.hazards.forEach(h=>{c.setLineDash([10,8]);c.strokeStyle='#ffd23f88';c.lineWidth=2;c.strokeRect(Math.min(h.ax,h.bx)-4,Math.min(h.ay,h.by)-4,Math.abs(h.bx-h.ax)+h.w+8,Math.abs(h.by-h.ay)+h.h+8);c.setLineDash([]);});
 g.solids.forEach(s=>g.drawSolid(s));g.dyn.forEach(s=>{if(!s.gone)g.drawSolid(s);});
 g.secrets.forEach(s=>{if(s.open){c.fillStyle='#0004';c.fillRect(s.x,s.y,s.w,s.h);return;}c.fillStyle=th.wall||'#5d6d78';c.fillRect(s.x,s.y,s.w,s.h);c.strokeStyle='#ffffff30';c.lineWidth=1.5;c.beginPath();c.moveTo(s.x+s.w*.3,s.y);c.lineTo(s.x+s.w*.45,s.y+s.h*.5);c.lineTo(s.x+s.w*.35,s.y+s.h);c.moveTo(s.x+s.w*.45,s.y+s.h*.5);c.lineTo(s.x+s.w*.7,s.y+s.h*.6);c.stroke();});
 g.gates.forEach(t=>{const col=t.closed?'#c0392b':t.phase==='warn'?((now*6|0)%2?'#f1c40f':'#8a6d00'):'#27ae60';
  if(t.closed){c.fillStyle='#5b1f1a';c.fillRect(t.x,t.y,t.w,t.h);c.fillStyle=col;for(let x=t.x;x<t.x+t.w;x+=14)c.fillRect(x,t.y,7,t.h);}
  else{c.fillStyle=col+'44';c.fillRect(t.x,t.y,t.w,t.h);c.strokeStyle=col;c.lineWidth=2;c.setLineDash([6,5]);c.strokeRect(t.x,t.y,t.w,t.h);c.setLineDash([]);}
  const lab=t.always!=null?(t.label||''):(t.closed?'關閉 '+Math.ceil(t.left)+'s':t.phase==='warn'?'即將關閉！':'開啟 '+Math.ceil(t.left)+'s');if(g.eff.pass>0)txt(c,'🎫 通行中',t.x+t.w/2,t.y-11,11,'#9fe3c4',900);else if(lab)txt(c,lab,t.x+t.w/2,t.y-11,11,col==='#8a6d00'?'#f1c40f':col,900);});
 g.papers.forEach(p=>{c.fillStyle='#fff6';c.beginPath();c.arc(p.x,p.y,p.r*1.35,0,7);c.fill();txt(c,'📝',p.x,p.y,18,'#fff');});
 g.items.forEach(it=>{if(it.hiddenUntilNear&&dist(it,P)>110)return;const r=it.r+5+Math.sin(it.bob)*2;c.fillStyle=it.glow||'#f9dd7f55';c.beginPath();c.arc(it.x,it.y,r,0,7);c.fill();c.strokeStyle=it.ring||'#ffe09c';c.lineWidth=2;c.stroke();txt(c,it.icon||A.ITEMS[it.type].icon,it.x,it.y+Math.sin(it.bob)*2,24,'#fff');});
 g.hazards.forEach(h=>{c.fillStyle='#0006';rr(c,h.x+3,h.y+5,h.w,h.h,8);c.fill();c.fillStyle=h.color||'#e67e22';rr(c,h.x,h.y,h.w,h.h,8);c.fill();c.strokeStyle='#ffd23f';c.lineWidth=3;c.stroke();txt(c,h.icon||'🚜',h.x+h.w/2,h.y+h.h/2,Math.min(h.w,h.h)*.7,'#fff');if(g.eff.freeze>0)txt(c,'🧊',h.x+h.w,h.y,16,'#fff');});
 if(g.def.under)g.def.under(g,c,now);
 // 預警範圍（紅色漸滿）
 g.teles.forEach(o=>{const p=Math.min(1,o.t/o.dur);c.save();if(o.kind==='line'){c.translate(o.x,o.y);c.rotate(o.a);c.fillStyle='#ff3b3022';c.fillRect(0,-o.w/2,o.len,o.w);c.fillStyle='#ff3b3066';c.fillRect(0,-o.w/2,o.len*p,o.w);c.strokeStyle='#ff6b5e';c.lineWidth=2;c.setLineDash([8,6]);c.strokeRect(0,-o.w/2,o.len,o.w);}
  else{c.fillStyle='#ff3b3022';c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.fill();c.fillStyle='#ff3b3066';c.beginPath();c.arc(o.x,o.y,o.r*p,0,7);c.fill();c.strokeStyle='#ff6b5e';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();c.arc(o.x,o.y,o.r,0,7);c.stroke();if(o.icon)txt(c,o.icon,o.x,o.y-o.r*(1-p)*2-10,22,'#fff');}
  c.restore();});
 // 巡邏員的視野錐
 g.guards.forEach(o=>{if(o.hideCone)return;const ch=o.state==='chase';c.fillStyle=ch?'#ff5b4d33':o.sus>0?'#ffb34733':'#fff3a822';c.beginPath();c.moveTo(o.x,o.y);c.arc(o.x,o.y,o.range,o.ang-o.fov/2,o.ang+o.fov/2);c.closePath();c.fill();});
 g.guards.forEach(o=>{g.person(o,o.state==='chase'?'#7a2b2b':'#2c3e50','#111',o.name,{tag:o.state==='chase'?'#9b2f2fdd':null});if(o.state==='chase'||o.alert>0)txt(c,'❗',o.x+12,o.y-o.r-34,18,'#ffd23f',900);else if(o.sus>0)txt(c,'？',o.x+12,o.y-o.r-34,16,'#ffd23f',900);if(o.stun>0)txt(c,'💫',o.x,o.y-o.r-6,14,'#fff');if(g.eff.freeze>0&&!o.noFreeze)txt(c,'🧊',o.x+14,o.y-14,15,'#fff');});
 if(g.def.actors)g.def.actors(g,c,now);
 const blink=g.inv>0&&((now*12|0)%2===0);
 if(!blink){g.person(P,g.eff.speed>0||g.eff.dash>0?'#e8b84f':'#3d6fa8','#1d1a17','會長');const cr=g.def.carry==null?'📦':g.def.carry;if(cr)txt(c,cr,P.x+P.r*.9,P.y+P.r*.25,15,'#fff');}
 if(g.eff.shield>0||g.shieldCharges>0){c.strokeStyle=g.eff.shield>0?'#9ae7ff':'#9ae7ff55';c.lineWidth=g.eff.shield>0?3:1.5;c.beginPath();c.arc(P.x,P.y,P.r+7,0,7);c.stroke();}
 if(g.eff.magnet>0||A.buffLv(g.buffs,'magnet')){c.strokeStyle='#ffe28a55';c.setLineDash([4,8]);c.lineWidth=1.5;c.beginPath();c.arc(P.x,P.y,g.magR(),0,7);c.stroke();c.setLineDash([]);}
 if(g.def.over)g.def.over(g,c,now);
 g.fx.forEach(f=>{c.globalAlpha=Math.max(0,f.life/f.max);if(f.text)txt(c,f.text,f.x,f.y,13,f.c,900);else{c.fillStyle=f.c;c.fillRect(f.x-f.s/2,f.y-f.s/2,f.s,f.s);}});c.globalAlpha=1;
 c.restore();
 if(g.def.screen)g.def.screen(g,c,now);
 // 畫面邊緣箭頭：指向目標（雷達期間也指向重要道具）
 let tg=g.def.targets?g.def.targets(g):[];if(g.eff.radar>0&&g.def.radar)tg=tg.concat(g.def.radar(g));
 tg.forEach(t=>g.arrow(t));
 g.hud();};
G.arrow=function(t){const g=this,c=g.ctx,sx=(t.x-g.camX)*g.k,sy=(t.y-g.camY)*g.k,m=30;if(sx>0&&sy>0&&sx<g.VW&&sy<g.VH)return;
 const cx=g.VW/2,cy=g.VH/2,a=Math.atan2(sy-cy,sx-cx),s=Math.min((g.VW/2-m)/Math.abs(Math.cos(a)||1e-6),(g.VH/2-m)/Math.abs(Math.sin(a)||1e-6)),ax=cx+Math.cos(a)*s,ay=cy+Math.sin(a)*s;
 c.save();c.translate(ax,ay);c.rotate(a);c.fillStyle=t.color||'#ffd23f';c.beginPath();c.moveTo(15,0);c.lineTo(-8,-10);c.lineTo(-8,10);c.closePath();c.fill();c.restore();
 const lx=ax-Math.cos(a)*30,ly=ay-Math.sin(a)*30;c.font='800 12px system-ui';const w=Math.max(40,c.measureText(t.label).width+14);rr(c,lx-w/2,ly-11,w,22,11);c.fillStyle='#0b1620dd';c.fill();txt(c,t.label,lx,ly,12,t.color||'#ffd23f',800);};
G.hud=function(){const g=this;const chips=[];
 if(!g.def.noHearts)chips.push(['❤️'.repeat(Math.max(0,g.hearts))+'🤍'.repeat(Math.max(0,g.maxHearts-g.hearts)),g.hearts<=1?'warn':'']);
 if(!g.def.customTime)chips.push(['⏱ '+Math.ceil(g.time),g.time<20?'warn':'']);
 (g.def.hud?g.def.hud(g):[]).forEach(x=>chips.push(Array.isArray(x)?x:[x,'']));
 const html=chips.map(x=>'<span class="'+x[1]+'">'+x[0]+'</span>').join('');if(html!==g._chips){g._chips=html;g.layer.querySelector('.ax-chips').innerHTML=html;}
 const bf=[];if(g.shieldCharges>0)bf.push('🛡️ 緊急護盾 ×'+g.shieldCharges);if(g.gearId&&A.GEAR){const ge=A.GEAR.find(x=>x.id===g.gearId);if(ge)bf.push(ge.icon+' '+ge.name);}if(g.paperMul()>=2)bf.push('✖️ 連署書 ×2');Object.keys(g.eff).forEach(k=>{if(g.eff[k]>.05&&k!=='dash'){const n={speed:'⚡ 加速',shield:'🛡️ 無敵',magnet:'🧲 磁鐵',radar:'📡 雷達',smoke:'💨 煙霧',freeze:'🧊 定身',pass:'🎫 通行'}[k];bf.push(n+' '+g.eff[k].toFixed(1)+'s');}});
 const bh=bf.map(x=>'<span>'+x+'</span>').join('');if(bh!==g._bh){g._bh=bh;g.layer.querySelector('.ax-buffs').innerHTML=bh;}
 const db=g.layer.querySelector('.ax-dash');if(g.dashLv){const cd=g.dashCD>0;db.classList.toggle('cd',cd);const l=cd?Math.ceil(g.dashCD)+'s':'衝刺';if(db.textContent!==l)db.textContent=l;}};
G.state=function(){const g=this;return {stage:g.def.id,x:g.P.x,y:g.P.y,time:g.time,hearts:g.hearts,damage:g.damage,paused:g.paused,over:g.over,papers:g.paperScore,items:g.items.map(i=>({type:i.type,x:i.x,y:i.y})),guards:g.guards.map(o=>({x:o.x,y:o.y,state:o.state})),extra:g.def.state?g.def.state(g):null};};

// 冒險畫面外框（畫布＋HUD＋搖桿＋衝刺鍵）
A.layer=function(host){A.css();const l=document.createElement('div');l.className='ax-layer';
 l.innerHTML='<div class="ax-top"><div class="ax-name">冒險模式</div><button class="ax-mute" type="button" aria-label="音樂開關">🔊</button><button class="ax-pause" type="button" aria-label="暫停">⏸</button></div><div class="ax-chips" aria-live="off"></div><canvas class="ax-cv" role="img" aria-label="冒險模式遊戲畫面"></canvas><div class="ax-msg" aria-live="polite"></div><div class="ax-buffs"></div><div class="ax-joy" aria-label="移動搖桿"><i></i></div><button class="ax-dash" type="button" aria-label="衝刺">衝刺</button>';
 host.append(l);const mb=l.querySelector('.ax-mute');mb.textContent=snd().muted?'🔇':'🔊';mb.onclick=()=>{mb.textContent=snd().toggle()?'🔇':'🔊';};return l;};
})();
