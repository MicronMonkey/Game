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
 return G('#7fa3bf','#2a4256')
 +R(20,60,470,190,'#e9eef1',4)+[0,1,2,3,4,5,6].map(i=>R(44+i*64,84,30,140,'#cfd8de',2)).join('')+R(20,222,470,14,'#2f6fa8',0)+T(255,160,'FAB 無塵室廠房',22,'#1d3c55',800)
 +R(560,96,220,154,'#2a5d86',4)+[0,1,2,3,4,5,6,7,8,9].map(i=>'<path d="M'+(572+i*21)+' 104V242" stroke="#bfe3f5" stroke-width="1.5" opacity=".45"/>').join('')+[0,1,2,3,4,5].map(i=>'<path d="M566 '+(116+i*22)+'H774" stroke="#bfe3f5" stroke-width="1.5" opacity=".45"/>').join('')+T(670,180,'辦公大樓',18,'#fff',800)
 +R(490,140,70,26,'#cfe6f2',2,.9)+T(525,158,'天橋',11,'#1d3c55',700)
 +R(0,250,800,200,'#8d9aa0',0)+R(0,262,800,30,'#4a5a64',0)+'<path d="M0 277H800" stroke="#f3f0d8" stroke-width="3" stroke-dasharray="18 14" opacity=".6"/>'
 +'<ellipse cx="400" cy="372" rx="190" ry="44" fill="none" stroke="#f1d27a" stroke-width="5" stroke-dasharray="18 12" opacity=".8"/>'+T(400,380,'集合點 A',20,'#fff3c4',700)
 +R(590,300,180,60,'#c7372c',8)+R(604,286,110,16,'#e4e8ea',3)+'<circle cx="612" cy="364" r="13" fill="#151b22"/><circle cx="742" cy="364" r="13" fill="#151b22"/>'+T(680,336,'消防車',17,'#fff',700)
 +'<circle cx="760" cy="294" r="9" fill="#ff5b4d"/><circle cx="760" cy="294" r="24" fill="#ff5b4d" opacity=".25"/>'
 +[0,1,2,3,4,5,6,7,8,9,10].map(i=>{const x=60+i*68,y=330+(i%3)*16;return '<circle cx="'+x+'" cy="'+(y-20)+'" r="11" fill="'+(i%2?'#f1d36b':'#e8edf0')+'"/><path d="M'+(x-17)+' '+(y+26)+'Q'+x+' '+(y-12)+' '+(x+17)+' '+(y+26)+'Z" fill="'+(i%2?'#20384b':'#2e4a5e')+'"/>';}).join('')
 +R(220,14,360,38,'#0e2434',4)+T(400,40,'11/3 台中廠區疏散演練',20,'#ffe3b0',700);
};

// ── 劇情節點（第 5 章結尾 → 第 6 章前）──
S.c5b.n='c5drill';
S.c5drill={b:'drill',sp:'旁白',t:'【11/3・台中廠區疏散演練】警報響起，無塵室、辦公大樓的人照著路線往集合區移動。點名點到一半，人群突然一陣騷動——神隱很久的法克，竟然出現在集合區的另一頭。手機群組瞬間炸開：「法克出現了！」「在消防車旁邊！」',n:'c5drill2'};
S.c5drill2={b:'drill',l:'ty',r:'fk',sp:'ty',t:'這一段，你換成桃園會長的視角。懷裡正好抱著一整箱會員連署書。「這次一定要親手交給他。」——全民找法克，開始。',
 c:()=>[
  {t:'抱起連署書箱，去追法克（小遊戲）',g:'c5drill2',do:()=>setTimeout(launch,60)},
  {t:'不追了，把連署書交給大家公開保存（略過小遊戲）',g:'c5drillSkip',fx:{flag:'fk_skip'}}
 ]};
S.c5drillWin={b:'drill',l:'ty',r:'fk',sp:'fk',t:'你在集合點旁追上法克，把整箱連署書放進他手裡。周圍的同事舉起手機，不是起鬨，而是把這一刻記下來：11/3，連署書已親手交付。法克沉默了很久，只說了一句：「……我會看。」',n:'c6a'};
S.c5drillLose={b:'drill',l:'ty',sp:'ty',t:'「演練結束，請各單位回到工作崗位。」廣播響起，法克消失在散去的人群裡，又神隱了。連署書沒交出去，可是這一路上，有幾十個人幫你指路、幫你扶箱子——大家都看見了。',n:'c6a'};
S.c5drillSkip={b:'drill',sp:'旁白',t:'你沒有去追。連署書由各班代表一起清點、拍照、公開保存，等下一次正式場合再交。法克在演練結束前就不見了。',n:'c6a'};

// ── 小遊戲（引擎在 game/chase.js，獨立頁 fack.html 也用同一份）──
let chase=null;
function launch(){
 const stage=document.querySelector('#stage');if(chase||!stage||!window.FackChase)return;
 chase=FackChase.mount(stage,{
  intro:'你是桃園會長，抱著一箱連署書。<br>法克在台中廠區的集合區現身，會逃也會躲，追上他就算成功。',
  onQuit:api=>{api.close();chase=null;},
  buttons:r=>r.win?[{label:'把連署書交給法克 →',onClick:()=>finish(true)}]
   :[{label:'再追一次',onClick:(r,api)=>api.retry()},{label:'接受結果，繼續故事',alt:true,onClick:()=>finish(false)}]
 });
}
function finish(win){
 if(chase){chase.close();chase=null;}
 if(win)pick({t:'追上法克，親手交出連署書',g:'c5drillWin',fx:{sup:1,trust:1,ev:'petitionF',flag:'fk_caught'}});
 else pick({t:'法克又神隱了',g:'c5drillLose',fx:{flag:'fk_escaped'}});
}
window.launchFackChase=launch;
window.fackChaseState=()=>chase?chase.state():null;
})();
