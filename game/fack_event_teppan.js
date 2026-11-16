/* 全民找法克・限定活動「11/16 鐵板燒偶遇」
   ─ 獨立紀錄：localStorage Key「fack.event.teppan1116」，不寫入經典或冒險的資料。
   ─ 單一難度（中等）、不套用冒險 Buff 與裝備，所有人條件相同。
   ─ 店家「好簽鐵板燒」與所有人物、事件皆為虛構。 */
(function(){
'use strict';
const A=window.FackAdv,{dist,clamp}=A.util,snd=A.util.snd,{rr,txt}=A.draw;
const KEY='fack.event.teppan1116';

/* ── 活動紀錄 ── */
function blank(){return {v:1,plays:0,clears:0,bestTime:null,bestScore:0,bestStars:0,firstClear:0,maxExtends:0,totalExtends:0,chefTreats:0,lastAt:0};}
let rec=blank(),status='new';
(function load(){let raw=null;try{raw=localStorage.getItem(KEY);}catch(e){return;}
 if(raw==null)return;
 try{const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw 0;rec=Object.assign(blank(),v);status='loaded';}
 catch(e){try{localStorage.setItem(KEY+'.corrupt.'+Date.now(),raw);}catch(_){}rec=blank();status='recovered';}})();
function save(){rec.lastAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(rec));return true;}catch(e){return false;}}
// 活動限定稱號（在「成就・稱號・裝備」圖鑑中可選為展示稱號）
const TITLES=[
 {id:'teppanMeet',icon:'🍳',title:'鐵板燒偶遇者',desc:'通關限定活動「11/16 鐵板燒偶遇」',ok:r=>r.clears>0},
 {id:'teppanOrder',icon:'🧾',title:'加點大師',desc:'在一場活動中讓法克的用餐時間延長 5 次',ok:r=>r.maxExtends>=5},
 {id:'teppanChef',icon:'👨‍🍳',title:'主廚好朋友',desc:'累積讓主廚請客 5 次',ok:r=>r.chefTreats>=5}
];
function record(res){rec.plays++;
 rec.totalExtends+=res.extra.extends|0;rec.maxExtends=Math.max(rec.maxExtends,res.extra.extends|0);rec.chefTreats+=res.extra.treats|0;
 const before=TITLES.filter(t=>t.ok(rec)).map(t=>t.id);
 if(res.win){if(!rec.clears)rec.firstClear=Date.now();rec.clears++;res.newBest=rec.bestScore>0&&res.score>rec.bestScore;rec.bestScore=Math.max(rec.bestScore,res.score);rec.bestStars=Math.max(rec.bestStars,res.stars);rec.bestTime=rec.bestTime==null?res.used:Math.min(rec.bestTime,res.used);}
 save();return TITLES.filter(t=>t.ok(rec)&&!before.includes(t.id));}

/* ── 關卡 ── */
const COURSES=[[0,'前菜'],[.15,'沙拉'],[.3,'湯品'],[.45,'主餐'],[.7,'炒飯'],[.85,'甜點']];
const DISHES=['和牛','龍蝦','干貝','蒜香炒飯','鐵板豆芽','鵝肝','明蝦'];
const TREATS=['炙燒干貝','主廚特製和牛捲','火焰香蕉','招待海鮮湯'];
const MEAL=120;
const MAX_EXTENDS=8;
const MOOD=3;                // 心情要到 3（加點／請客／熱茶各 +1）法克才肯簽名         // 最多延長 8 次（吃不下了），避免無限拖時間              // 法克正常吃完一頓的秒數
const def={
 id:'teppan',event:true,icon:'🍳',name:'11/16 鐵板燒偶遇',full:'限定活動｜11/16 鐵板燒偶遇',kick:'LIMITED EVENT / 11.16',
 story:'避難演練那天沒抓到法克……過了一陣子，11/16 晚上，會長走進一家鐵板燒店，竟然看到法克一個人坐在吧台大口吃和牛！',
 goals:['📄 撿回散落在店裡的 5 份連署書（有一份掉在備料區）','😋 讓法克加點、主廚請客或喝熱茶，心情到 3 他才肯簽','🤫 趁法克不注意，從他看不到的地方走到他身邊遞上連署書','🍽️ 法克吃完甜點就會結帳離開——要在那之前完成'],
 tips:['法克會不定時回頭：先出現「嗯？」預告，接著紅色扇形就是他的視線。被看到他會吃得更快（用餐 +10%），躲到桌子後面或從側面接近','🧾 撿到加點單送到「點餐台」，法克就會加點、吃更久（最多延長 8 次）','🦐🥩🥚 備料區的食材湊齊交給主廚，主廚會請客；🍵 熱茶也能拖一下時間','服務生會巡場，被攔下會被帶回入口；師傅的火焰秀有紅圈預告，被燙到會扣愛心'],
 view:430,customTime:true,carry:'',theme:{floor:'#7a5a40',wall:'#4a3426',grid:'#0000001a'},
 setup(g){g.W=900;g.H=1100;g.limit=900;g.meal=0;g.papersGot=0;g.carry=null;g.ing=0;g.extends=0;g.treats=0;g.lastCourse=0;
  const R=(x,y,w,h,kind,label)=>g.solids.push({x,y,w,h,kind,label});
  R(180,200,540,50,'counter','鐵板吧台');
  [[150,450],[630,450],[150,700],[630,700]].forEach(t=>R(t[0],t[1],120,80,'table',''));R(390,640,120,70,'table','');
  R(0,330,170,24,'wall');R(60,950,40,40,'plant');R(800,950,40,40,'plant');R(420,420,40,40,'pillar');
  // 吧台座位上的其他客人（擋視線、擋路）
  g.guests=[{x:260,y:285},{x:340,y:285},{x:700,y:285}];g.guests.forEach(c=>R(c.x-14,c.y-14,28,28,'guest'));
  g.F={x:560,y:280,r:16,fx:0,fy:1,mv:0,walk:0,state:'eat',t:4+g.rng()*3,look:0};
  g.chef={x:450,y:165,r:16,fx:0,fy:1,mv:0,walk:0};
  g.orderZone={x:780,y:520,w:110,h:80};g.chefZone={x:110,y:215,w:66,h:70};g.kitchen={x:16,y:24,w:150,h:290};
  g.P.x=450;g.P.y=1050;
  // 5 份連署書：4 份散落在用餐區、1 份掉在備料區
  for(let i=0;i<5;i++){const area=i===4?{x:16,y:24,w:150,h:290}:{x:40,y:370,w:820,h:640};const p=g.free({pad:26,area,far:g.P,farD:130,avoid:g.items.filter(x=>x.type==='petition'),gap:i===4?40:200});
   g.addItem('petition',p.x,p.y,{icon:'📄',onPick:(g,it)=>{g.papersGot++;snd().sfx('coin');g.puff(it.x,it.y,'連署書 '+g.papersGot+'/5','#ffe09c',10);g.msg(g.papersGot>=5?'📄 連署書撿齊了！找機會走到法克身邊':'📄 連署書 '+g.papersGot+'/5');}});}
  g.maxHearts=g.hearts=4;
  g.addGuard([{x:80,y:600},{x:820,y:600}],{name:'服務生',range:150,chase:115});
  g.addGuard([{x:300,y:380},{x:600,y:380},{x:600,y:850},{x:300,y:850}],{name:'服務生',range:150,chase:115});
  g.orderT=6;g.teaT=12;g.flameT=7;g.spawnIng(g);
  g.addPapers(10,{v:50,area:{x:30,y:360,w:840,h:700}});
 },
 start(g){g.tip('🍳 撿 5 份 📄 連署書，再讓法克加點、請客、喝熱茶讓他心情變好，別被他回頭看到',7);},
 update(g,dt){const F=g.F,P=g.P;
  // 用餐進度
  const rate=(F.state==='startled'?2.2:1)/MEAL;g.meal=Math.min(1,g.meal+dt*rate);
  const ci=COURSES.filter(c=>g.meal>=c[0]).length-1;if(ci>g.lastCourse){g.lastCourse=ci;g.msg('🍽️ 法克開始吃'+COURSES[ci][1]+'了'+(ci>=5?'——吃完就要結帳了！':''));}
  if(g.meal>=1){g.fail('法克吃完結帳離開了…');return;}
  // 法克回頭：預告 → 看 → 繼續吃
  F.t-=dt;
  if(F.state==='eat'&&F.t<=0){F.state='warn';F.t=1.2;g.msg('👀 法克：「嗯？」他要回頭了！');snd().sfx('shout');}
  else if(F.state==='warn'&&F.t<=0){F.state='look';F.t=2.2;}
  else if((F.state==='look'||F.state==='startled')&&F.t<=0){F.state='eat';F.t=5+g.rng()*3.5;}
  if(F.state==='look'&&g.fackSees(g)){F.state='startled';F.t=2;g.spotted=(g.spotted||0)+1;g.meal=Math.min(1,g.meal+.08);g.shake=.2;snd().sfx('shout');g.puff(F.x,F.y-30,'被發現！用餐 +8%','#ff8a7a',8);g.msg('😳 法克：「會長？我、我只是路過吃個飯…」他吃得更快了！',3);}
  // 走到法克身邊
  if(dist(F,P)<F.r+P.r+6&&!(g.needMsg>0)){if(g.papersGot<5){g.needMsg=2.5;g.msg('📄 連署書還沒撿齊（'+g.papersGot+'/5）！');}
   else if(g.extends<MOOD){g.needMsg=2.5;g.msg('🍖 法克：「我還在吃，沒心情簽！」（心情 '+g.extends+'/'+MOOD+'：讓他加點、請客或喝熱茶）',3);}
   else if(F.state!=='look'&&F.state!=='startled')g.win();}
  g.needMsg=(g.needMsg||0)-dt;
  // 小任務：加點單
  g.orderT-=dt;if(g.orderT<=0&&!g.items.some(i=>i.type==='order')&&g.carry!=='order'){g.orderT=16;const p=g.free({pad:26,area:{x:40,y:380,w:820,h:640},far:P,farD:160});g.addItem('order',p.x,p.y,{icon:'🧾',onPick:(g)=>{g.carry='order';g.msg('🧾 拿到加點單！送到右邊的「點餐台」');}});}
  if(g.carry==='order'&&inRect(P,g.orderZone)){g.carry=null;const d=DISHES[Math.floor(g.rng()*DISHES.length)];g.extend(g,.12,'🧾 法克加點了一份「'+d+'」！用餐時間變長');}
  // 小任務：主廚請客（湊齊 3 種食材）
  if(g.ing>=3&&inRect(P,g.chefZone)){g.ing=0;g.treats++;const d=TREATS[Math.floor(g.rng()*TREATS.length)];g.extend(g,.2,'👨‍🍳 主廚：「這道「'+d+'」我請客！」法克又多坐了一下');g.chefSay=2.5;g.ingT=10;}
  if(g.ingT!=null){g.ingT-=dt;if(g.ingT<=0){g.ingT=null;g.spawnIng(g);}}
  // 小任務：招待熱茶
  g.teaT-=dt;if(g.teaT<=0){g.teaT=22;if(!g.items.some(i=>i.type==='tea')){const p=g.free({pad:26,area:{x:40,y:380,w:820,h:640},far:P,farD:140});g.addItem('tea',p.x,p.y,{icon:'🍵',onPick:(g)=>{g.extend(g,.06,'🍵 招待熱茶送上桌，法克慢慢喝…');}});}}
  // 師傅的火焰秀：吧台前方的紅圈預告
  g.flameT-=dt;if(g.flameT<=0){g.flameT=10;g.msg('🔥 師傅的火焰秀！看紅圈閃開');
   for(let i=0;i<2;i++){let x=0;for(let k=0;k<20;k++){x=210+g.rng()*480;if(Math.abs(x-F.x)>110)break;}g.tele({kind:'circle',x,y:265+g.rng()*55,r:42,dur:1.2,icon:'🔥',done:(g,o)=>{g.puff(o.x,o.y,null,'#ff9a3c',12);if(dist(g.P,o)<o.r+g.P.r*.4)g.hurt('被火焰秀燙到');}});}}
  g.chefSay=Math.max(0,(g.chefSay||0)-dt);
 },
 onHurt(g,src){// 被服務生攔下：不扣愛心，被帶回入口重新「帶位」，法克多吃一點
  if(src==='服務生'){g.damage--;g.seated=(g.seated||0)+1;g.meal=Math.min(1,g.meal+.05);g.P.x=450;g.P.y=1040;g.inv=1.2;g.cam(true);g.puff(450,1040,'先生這邊請～','#ffe09c',8);g.msg('🙇 服務生：「先生這邊請～」被帶回入口重新帶位（法克多吃了一點）',3);return true;}return false;},
 floor(g,c,now){
  // 木地板紋路
  c.strokeStyle='#00000018';c.lineWidth=2;for(let y=0;y<g.H;y+=36){c.beginPath();c.moveTo(0,y);c.lineTo(g.W,y);c.stroke();}
  // 廚房備料區
  const K=g.kitchen;c.fillStyle='#9aa6ad';c.fillRect(K.x-16,K.y-24,K.w+16,K.h+22);c.strokeStyle='#ffffff55';for(let x=0;x<K.w+16;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,K.h);c.stroke();}
  txt(c,'備料區',K.x+K.w/2,K.y+12,12,'#1d3c55',900);
  // 吧台內的鐵板（熱氣閃爍）
  c.fillStyle='#2b2b2b';rr(c,200,175,500,22,6);c.fill();c.globalAlpha=.25+.15*Math.sin(now*6);c.fillStyle='#ff7a3c';rr(c,204,178,492,16,5);c.fill();c.globalAlpha=1;
  // 點餐台、交給主廚
  const O=g.orderZone,Z=g.chefZone;c.fillStyle=g.carry==='order'?'#2e7d4fcc':'#2e7d4f77';rr(c,O.x,O.y,O.w,O.h,10);c.fill();c.strokeStyle='#9ff0bf';c.lineWidth=2;c.stroke();txt(c,'🧾 點餐台',O.x+O.w/2,O.y+O.h/2,14,'#fff',900);
  c.fillStyle=g.ing>=3?'#b8860bcc':'#b8860b66';rr(c,Z.x,Z.y,Z.w,Z.h,10);c.fill();c.strokeStyle='#ffe08a';c.stroke();txt(c,'👨‍🍳',Z.x+Z.w/2,Z.y+24,18,'#fff');txt(c,'交給主廚',Z.x+Z.w/2,Z.y+50,11,'#fff',900);
  // 入口地墊與店名
  c.fillStyle='#5b2a1a';rr(c,380,1070,140,26,6);c.fill();txt(c,'好簽鐵板燒・歡迎光臨',450,1083,11,'#ffe0b8',900);
  // 法克的視線（預告：虛線；回頭：紅色扇形）
  const F=g.F;if(F.state==='warn'||F.state==='look'||F.state==='startled'){const a=Math.PI/2,R=330,fv=.78;c.beginPath();c.moveTo(F.x,F.y);c.arc(F.x,F.y,R,a-fv,a+fv);c.closePath();
   if(F.state==='warn'){c.setLineDash([8,8]);c.strokeStyle='#ffd23f';c.lineWidth=3;c.stroke();c.setLineDash([]);c.fillStyle='#ffd23f14';c.fill();}else{c.fillStyle=F.state==='startled'?'#ff3b3044':'#ff5b4d33';c.fill();}}},
 drawSolid(g,s){},
 actors(g,c,now){const F=g.F,ch=g.chef;
  g.guests.forEach((q,i)=>g.person({x:q.x,y:q.y,r:13,fx:0,fy:-1,mv:0},['#6b8e9e','#a0785a','#7a6aa0'][i%3],'#333',null));
  g.person(ch,'#f5f5f5','#ddd','主廚');txt(c,'👨‍🍳',ch.x,ch.y-ch.r-34,16,'#fff');if(g.chefSay>0)A.fx.bubble(c,'這道我請客！',ch.x,ch.y-60);
  g.person(F,'#b5432e','#e2e1dd','法克',{tag:F.state==='look'||F.state==='startled'?'#9b2f2fdd':null});
  txt(c,'🍽️',F.x+F.r+6,F.y+6,14,'#fff');
  if(F.state==='warn')A.fx.bubble(c,'嗯？',F.x,F.y-56);else if(F.state==='startled')A.fx.bubble(c,'會、會長？！',F.x,F.y-56);else if(F.state==='eat'&&((now*2|0)%3===0))txt(c,'🥩',F.x,F.y-F.r-34,14,'#fff');
  // 用餐進度條（在法克頭上）
  const w=90,x=F.x-w/2,y=F.y-F.r-58;if(F.state==='eat'){rr(c,x,y,w,10,5);c.fillStyle='#0008';c.fill();rr(c,x,y,w*g.meal,10,5);c.fillStyle=g.meal>.8?'#ff6b5e':'#ffd23f';c.fill();}},
 over(g,c){if(g.carry==='order')txt(c,'🧾',g.P.x+g.P.r,g.P.y-g.P.r-4,15,'#fff');if(g.ing)txt(c,['','🦐','🦐🥩','🦐🥩🥚'][g.ing],g.P.x,g.P.y+g.P.r+14,12,'#fff');},
 hud(g){const ci=COURSES.filter(c=>g.meal>=c[0]).length-1;return [['🍽️ '+COURSES[ci][1]+' '+Math.round(g.meal*100)+'%',g.meal>.8?'warn':''],['📄 '+g.papersGot+'/5',g.papersGot>=5?'ok':''],[g.extends>=MOOD?'😋 '+MOOD+'/'+MOOD+'・延長 '+g.extends+'/'+MAX_EXTENDS:'😋 心情 '+g.extends+'/'+MOOD,g.extends>=MOOD?'ok':'']].concat(g.carry==='order'?[['🧾 送點餐台','ok']]:[]).concat(g.ing?[['食材 '+g.ing+'/3',g.ing>=3?'ok':'']]:[]);},
 targets(g){const t=[];if(g.carry==='order')t.push({x:g.orderZone.x+50,y:g.orderZone.y+40,label:'🧾 點餐台',color:'#9ff0bf'});if(g.ing>=3)t.push({x:g.chefZone.x+33,y:g.chefZone.y+35,label:'👨‍🍳 主廚',color:'#ffe08a'});
  const ready=g.papersGot>=5&&g.extends>=MOOD;t.push({x:g.F.x,y:g.F.y,label:ready?'法克 ✍️':'法克',color:ready?'#ff8a7a':'#c9b8a8'});return t;},
 radar(g){return g.items.map(i=>({x:i.x,y:i.y,label:i.icon||'?',color:'#9ae7ff'}));},
 stars(g,r){return 1+(g.damage===0&&!g.spotted?1:0)+(g.meal<.6?1:0);},
 result(g,r){r.extra.extends=g.extends;r.extra.treats=g.treats;r.extra.meal=Math.round(g.meal*100);r.extra.spotted=g.spotted|0;r.extra.seated=g.seated|0;r.used=Math.max(1,Math.round(g.t));
  r.score=r.win?Math.round((1-g.meal)*1000+g.hearts*100+g.extends*80+g.paperScore+r.stars*200):Math.round(g.paperScore);},
 state(g){return {meal:g.meal,papers:g.papersGot,fack:{x:g.F.x,y:g.F.y,state:g.F.state},carry:g.carry,ing:g.ing,extends:g.extends,treats:g.treats,orderZone:g.orderZone,chefZone:g.chefZone};},
 celebrate:3.2,
 onWin(g){g.F.state='eat';g.msg('✍️ 法克：「吃個飯也被你找到……好啦，我簽！」',3);},
 celebrateStep(g,dt){if(g.rng()<.6){const x=g.camX+g.rng()*g.VW/g.k;g.fx.push({x,y:g.camY-10,vx:(g.rng()-.5)*30,vy:120+g.rng()*80,life:2.5,max:2.5,text:g.rng()<.5?'📝':'🍳',c:'#fff'});}}
};
const inRect=(p,r)=>p.x>r.x&&p.x<r.x+r.w&&p.y>r.y&&p.y<r.y+r.h;
// 法克的視線：面向入口（正下方）、張角約 90 度、會被桌子和客人擋住
def.fackSeesFn=function(g){const F=g.F,P=g.P,d=dist(F,P);if(d>330)return false;let a=Math.atan2(P.y-F.y,P.x-F.x)-Math.PI/2;a=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(a)>.78)return false;return g.los(F,P);};
const baseSetup=def.setup;
def.setup=function(g){g.fackSees=def.fackSeesFn;g.spawnIng=function(g){['🦐','🥩','🥚'].forEach(ic=>{const p=g.free({pad:22,area:g.kitchen,gap:40,avoid:g.items});g.addItem('ingredient',p.x,p.y,{icon:ic,onPick:(g)=>{g.ing=Math.min(3,g.ing+1);snd().sfx('coin');g.msg(g.ing>=3?'🦐🥩🥚 食材湊齊了！交給吧台左邊的主廚':'食材 '+g.ing+'/3');}});});};
 g.extend=function(g,amt,text){if(g.extends>=MAX_EXTENDS){g.msg('🫃 法克：「吃不下了！再點我就要結帳了！」（最多延長 '+MAX_EXTENDS+' 次）',3);return;}g.meal=Math.max(0,g.meal-amt);g.extends++;snd().sfx('win');g.puff(g.F.x,g.F.y-30,'用餐時間延長！','#9ff0bf',14);g.msg(text,3);};
 baseSetup(g);};
// 吧台、桌子、客人、盆栽的外觀
const baseDraw=A.Game.prototype.drawSolid;
def.drawSolidFn=function(g,s){const c=g.ctx;
 if(s.kind==='counter'){c.fillStyle='#0007';rr(c,s.x+3,s.y+5,s.w,s.h,6);c.fill();c.fillStyle='#8b5a2b';rr(c,s.x,s.y,s.w,s.h,6);c.fill();c.fillStyle='#c48a4f';rr(c,s.x,s.y,s.w,14,6);c.fill();txt(c,s.label,s.x+s.w/2,s.y+32,13,'#ffe8c8',900);return true;}
 if(s.kind==='table'){c.fillStyle='#0006';rr(c,s.x+3,s.y+5,s.w,s.h,10);c.fill();c.fillStyle='#d9b38c';rr(c,s.x,s.y,s.w,s.h,10);c.fill();c.strokeStyle='#8b5a2b';c.lineWidth=3;c.stroke();txt(c,'🍲',s.x+s.w/2,s.y+s.h/2,20,'#fff');return true;}
 if(s.kind==='guest')return true;
 if(s.kind==='plant'){txt(c,'🪴',s.x+s.w/2,s.y+s.h/2,34,'#fff');return true;}
 return false;};
A.Game.prototype.drawSolid=function(s){if(this.def&&this.def.id==='teppan'&&def.drawSolidFn(this,s))return;return baseDraw.call(this,s);};
delete def.drawSolid;
window.FackEvent={KEY,def,TITLES,get data(){return rec;},get status(){return status;},record,save,
 // 活動稱號是否已取得（供成就圖鑑使用）
 titles(){return TITLES.filter(t=>t.ok(rec));}};
})();
