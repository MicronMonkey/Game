/* Original vector CG for factory shifts, union office, corridors, voting and after-hours transition. */
(function(){
'use strict';
BG.lounge=function(){
 return G('#223a4b','#0a1221')
 +'<defs><linearGradient id="cgLocker" x1="0" x2="1"><stop stop-color="#213b50"/><stop offset=".6" stop-color="#435c6d"/><stop offset="1" stop-color="#1a3041"/></linearGradient><linearGradient id="cgFloor" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#4c6270"/><stop offset="1" stop-color="#0c1728"/></linearGradient></defs>'
 +'<rect width="800" height="350" fill="url(#cgLocker)"/><rect y="350" width="800" height="100" fill="url(#cgFloor)"/>'
 +[0,1,2,3,4,5,6].map(i=>R(26+i*104,83,94,239,i%2?'#263c4d':'#30485b',3)+R(35+i*104,98,76,130,'#111f2e',3)+R(55+i*104,255,33,5,'#9eaeb4',2)).join('')
 +'<path d="M0 62H800" stroke="#93b3c0" opacity=".25" stroke-width="6"/>'
 +R(420,299,335,14,'#ab8b6a',2)+R(438,312,9,75,'#223340',2)+R(731,312,9,75,'#223340',2)
 +R(461,267,74,30,'#ede6d7',8)+R(570,273,57,24,'#e8e4d7',8)+R(666,269,44,25,'#81bbd4',3)
 +'<ellipse cx="540" cy="261" rx="130" ry="25" fill="#d8c997" opacity=".14"/>'
 +R(675,26,108,40,'#0d2231',4)+T(729,53,'02:17',27,'#79ddd1',700)
 +R(24,28,237,36,'#123346',3)+T(143,52,'NIGHT SHIFT / 夜班',16,'#d0e8eb',700)
 +'<path d="M0 348H800" stroke="#9bc7c7" stroke-width="4" opacity=".28"/>';
};
BG.corr=function(){
 return G('#1a3950','#06121e')
 +'<defs><linearGradient id="cgCorrFloor" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#426377"/><stop offset="1" stop-color="#071624"/></linearGradient></defs>'
 +'<path d="M0 0H800L551 230H250Z" fill="#234457"/><path d="M0 0L250 230L0 450Z" fill="#142e41"/><path d="M800 0L551 230L800 450Z" fill="#10283a"/>'
 +'<path d="M250 230H551L800 450H0Z" fill="url(#cgCorrFloor)"/>'
 +'<rect x="339" y="65" width="125" height="169" fill="#102b3d" stroke="#77abb7" stroke-width="6"/><rect x="363" y="110" width="82" height="78" fill="#092231"/>'
 +[0,1,2,3,4].map(i=>'<path d="M'+(i*80)+' 450L'+(248+i*24)+' 231M'+(800-i*80)+' 450L'+(551-i*24)+' 231" stroke="#c2d8da" opacity=".14" stroke-width="3"/>').join('')
 +[0,1,2,3,4].map(i=>'<path d="M0 '+(i*62)+'L250 '+(230-i*12)+'M800 '+(i*62)+'L551 '+(230-i*12)+'" stroke="#91baca" stroke-width="4" opacity=".26"/>').join('')
 +R(38,56,160,69,'#103348',5)+T(118,84,'FAB CORRIDOR',16,'#dbece9',700)+T(118,106,'設備通道',14,'#e7cfab',600)
 +R(629,75,137,104,'#102c42',4)+T(697,105,'DAY / 日班',14,'#bce9e3',700)+T(697,147,'NIGHT / 夜班',14,'#d7baa3',700);
};
BG.desk=function(){
 return G('#283d4d','#101a29')+R(0,327,800,123,'#1b2635')
 +'<rect x="58" y="39" width="682" height="235" rx="4" fill="#29495b" stroke="#668da0" stroke-width="5"/>'
 +[0,1,2,3].map(i=>R(98+i*155,65,112,164,i%2?'#2b4c60':'#344d60',3)+[0,1,2,3,4].map(j=>R(114+i*155,87+j*25,72-(j%2)*17,5,'#c1d2ce',2,.48)).join('')).join('')
 +'<path d="M57 274H747L800 360H0Z" fill="#5d4539"/><rect y="362" width="800" height="88" fill="#2d252b"/>'
 +[0,1,2,3,4].map(i=>'<g transform="translate('+(80+i*144)+' '+(279-(i%2)*16)+') rotate('+(i%2?8:-7)+')"><rect width="114" height="64" rx="2" fill="#f0e5d2"/><path d="M13 17H99M13 29H86M13 42H93" stroke="#a7b5af" stroke-width="3"/></g>').join('')
 +R(237,126,332,53,'#10283a',3)+T(401,158,'工會辦公室 · 文件核對',19,'#e4eae6',700)
 +R(610,294,150,32,'#173548',3)+T(686,316,'DOCUMENT v02',15,'#efce95',700);
};
BG.door=function(){
 return G('#0d2437','#080f1b')
 +'<path d="M87 0H713L785 450H17Z" fill="#15344a"/><path d="M236 42H567V450H236Z" fill="#264e62" stroke="#a6c7d2" stroke-width="7"/>'
 +R(248,55,305,341,'#081d2e',2)+R(264,70,128,313,'#8dafba',2,.3)+R(406,70,126,313,'#d8e2d1',2,.21)
 +'<path d="M398 59V395" stroke="#d4e4e2" stroke-width="8"/>'
 +'<circle cx="378" cy="261" r="5" fill="#f3d7a5"/><circle cx="420" cy="261" r="5" fill="#f3d7a5"/>'
 +R(272,91,254,48,'#234556',3)+T(398,121,'MEETING / 會議室',18,'#eddbc0',700)
 +'<path d="M0 395H800M0 428H800" stroke="#6d9fb0" stroke-width="3" opacity=".45"/>';
};
BG.dayShift=function(){
 return G('#bdd8d7','#617d92')
 +'<defs><linearGradient id="cgDayFloor" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#b1c9cb"/><stop offset="1" stop-color="#41697f"/></linearGradient></defs>'
 +'<path d="M0 0L260 190H540L800 0Z" fill="#b7d0d3"/><path d="M0 0V450L260 190Z" fill="#628da3"/><path d="M800 0V450L540 190Z" fill="#5e8297"/>'
 +'<path d="M260 190H540L800 450H0Z" fill="url(#cgDayFloor)"/>'
 +[0,1,2,3,4].map(i=>'<path d="M0 '+(i*90)+'L260 190M800 '+(i*90)+'L540 190" stroke="#d5ecec" stroke-width="4" opacity=".6"/>').join('')
 +'<rect x="335" y="44" width="130" height="147" fill="#9bc1c8" stroke="#d8f1eb" stroke-width="6"/>'
 +R(44,46,227,62,'#315e77',6)+T(157,73,'DAY SHIFT',20,'#e6f3e6',700)+T(157,95,'日班交接區',17,'#e6f3e6',600)
 +R(518,235,172,22,'#e7f3eb',4)+R(548,258,16,80,'#5c7888',3)+R(644,258,16,80,'#5c7888',3)
 +'<circle cx="625" cy="79" r="37" fill="#e9f7ed" opacity=".45"/><path d="M626 79L626 58M626 79L643 90" stroke="#2e657e" stroke-width="4"/>';
};
BG.otherFab=function(){
 return G('#1b3d57','#071525')
 +'<defs><linearGradient id="cgSky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#294c67"/><stop offset="1" stop-color="#a6a9a3"/></linearGradient></defs>'
 +'<rect width="800" height="450" fill="url(#cgSky)"/>'
 +R(0,356,800,94,'#1b303e')+R(75,129,298,227,'#30495c')+R(395,89,325,267,'#2d4959')
 +[0,1,2,3].map(r=>[0,1,2,3,4,5].map(c=>R(93+c*44,160+r*42,23,17,c%3?'#9ac5d5':'#e2cba0',2,.7)).join('')).join('')
 +[0,1,2,3,4].map(r=>[0,1,2,3,4,5].map(c=>R(418+c*45,121+r*39,26,17,c%2?'#a5cbd5':'#e0ba87',2,.68)).join('')).join('')
 +'<path d="M0 357H800" stroke="#c0c2a6" stroke-width="3"/><path d="M90 425H702" stroke="#d8d6b5" stroke-width="4" stroke-dasharray="35 30"/>'
 +R(255,318,277,43,'#15344b',5)+T(391,346,'CROSS FAB / 跨廠區',18,'#e9ead8',700);
};
const prevNight=BG.night;
BG.night=function(day){
 if(day)return prevNight(day);
 return prevNight(day)+R(17,26,205,37,'#0e293c',4)+T(119,51,'FAB NIGHT / 夜間',16,'#e9d7b4',700)
 +[0,1,2,3,4,5,6].map(i=>'<path d="M'+(140+i*51)+' 230V150" stroke="#526c7d" stroke-width="3" opacity=".6"/>').join('')
 +'<path d="M0 375L800 375" stroke="#608a98" stroke-width="2" opacity=".5"/>';
};
BG.vote=function(){
 return G('#22374b','#0b1523')+R(0,355,800,95,'#1a3040')
 +'<path d="M0 247L400 143L800 247V319H0Z" fill="#385165"/>'
 +R(249,49,302,118,'#e5e9e3',4)+T(400,101,'會員自主表決',28,'#20475b',700)+T(400,137,'DISCUSS • VERIFY • VOTE',14,'#426379',600)
 +[0,1,2,3,4,5].map(i=>'<g transform="translate('+(48+i*121)+' 0)"><circle cx="42" cy="284" r="19" fill="#132635"/><path d="M6 360Q8 315 42 315Q76 315 79 360Z" fill="'+(i%2?'#2e4a60':'#1d374b')+'"/><rect x="14" y="362" width="65" height="75" rx="5" fill="#254053"/></g>').join('')
 +R(322,215,155,120,'#3c697e',6)+R(358,204,85,12,'#081b2c',2)+T(400,284,'投票箱',23,'#f5efde',700);};
const oldSign=BG.sign;
BG.sign=function(){return BG.boardroom()+R(258,307,281,17,'#e6d9c2',2,.7)+'<path d="M382 289L458 304" stroke="#161b25" stroke-width="6" stroke-linecap="round"/>'+T(400,374,'AGREEMENT / 虛構簽署現場',14,'#e7cb99',700)};
const oldChairs=BG.chairs;
BG.chairs=function(f){return oldChairs(f)+R(249,36,304,33,'#173448',3)+T(400,59,'班別交接・員工討論',16,'#e7d5ad',700)};
const tip=document.createElement('p');
tip.textContent='約 30 分鐘 · CG 場景版 · 已造訪地點與已交談人物將自動標記';
tip.style.cssText='font-size:12px;color:#e8c793';
document.querySelector('#title').append(tip);
/* Show all shift locations before the 6th chapter conclusion. */
S.q5e.n='c5reportNight';
S.c5reportNight={b:'night',sp:'旁白',t:'【夜班工作區】你走過熟悉的廠房。有人願意跟熟人談，卻不想在眾人面前發言。留下的是一份自願核對的問題清單。',n:'c5reportDay'};
S.c5reportDay={b:'dayShift',sp:'旁白',t:'【日班交接處】交接時間很短，還有人趕著回家顧小孩。能用手機閱讀的摘要，比冗長演講更有幫助。',n:'c5reportOther'};
S.c5reportOther={b:'otherFab',sp:'旁白',t:'【跨廠區聯繫】不同廠區的人未必互相信任。你們先把程序、問題、入會意願分開，新的組織必須接受同樣的監督。',n:'c5b'};
const c=S.c4auth&&S.c4auth.c;
if(c){S.c4auth.c=function(s){return c(s).map(o=>o.g==='c4b'?Object.assign({},o,{g:'c4shadow'}):o)}}
S.c4shadow={b:'boardroom',sp:'旁白',t:s=>s.fl.includes('secret2')?
'【純虛構劇情】你比對三份資料。法克、糖果和公司幕僚高興的說詞，竟帶有相同的修訂痕跡。小說裡他們確實合作修改對外訊息，但授權的真相仍須查證。':
'【純虛構劇情】糖果與法克的名字，出現在同一份版本紀錄；檔案另一端是公司幕僚高興。這可能代表協調說法，也可能有你尚未看到的前因。先保留證據。',
 c:[{t:'保存版本差異，繼續追查協議與授權全文',g:'c4b',fx:{flag:'shadow_record',sup:1}},
 {t:'保護匿名來源，只公開可核對的問題',g:'c4b',fx:{flag:'shadow_protect',trust:1}}]};
})();
