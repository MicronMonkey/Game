/* Fiction-only extension: narrative allegations are not factual accusations. */
(function(){
const s=document.createElement('style');
s.textContent='#ops{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 8px 8px} .om{padding:9px;background:linear-gradient(135deg,#1b3949,#101e2c);border:1px solid #527183;border-radius:8px;color:#e8e8e4}.om small{display:block;color:#b9d0db}.om b{font-size:21px;color:#eed1a1}.track{height:5px;background:#09151f;border-radius:5px;margin-top:8px;overflow:hidden}.track i{display:block;background:linear-gradient(90deg,#62bcca,#a1e7ca);height:100%;transition:width .4s}.danger .track i{background:#e56c75}#optools{display:flex;gap:6px;padding:0 8px 8px;flex-wrap:wrap}#optools button{font:12px system-ui;background:#233c4b;color:#eaf1f5;border:1px solid #55798b;border-radius:6px;padding:8px}#stage{box-shadow:0 25px 80px #000b}#stage:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 5px,#0002 6px);z-index:1;pointer-events:none}#bar>b{font-family:Georgia,serif;color:#ecc28c}.opchoices{display:grid;gap:8px}.opchoices button{padding:12px;background:#294454;color:white;border:1px solid #8aa4b2;border-radius:6px;text-align:left}.opsnote{font-size:12px;color:#c5cdd4}@media(max-width:650px){#ops{grid-template-columns:repeat(2,1fr);gap:5px}.om{padding:7px}.om b{font-size:16px}#stage{height:calc(100dvh - 330px)!important;min-height:380px!important}}';
document.head.append(s);
const ops=document.createElement('div');ops.id='ops';ops.innerHTML=['♥ 信任度','◆ 支持度','▣ 證據完整度','⚠ 曝光風險'].map((x,i)=>'<div class="om" id="om'+i+'"><small>'+x+'</small><b id="ov'+i+'">—</b><div class="track"><i id="oi'+i+'"></i></div></div>').join('');
document.querySelector('#bar').after(ops);
const tools=document.createElement('div');tools.id='optools';tools.innerHTML='<button id="secret">◈ 懸疑支線：雙重訊息</button><button id="checks">◎ KPI 與目標</button><button id="sources2">↗ 真實新聞／關係企業工會</button>';ops.after(tools);
function state(){return typeof st!=='undefined'&&st&&Array.isArray(st.ev)?st:null}
function stats(){const t=state();if(!t)return;t.exposure=Math.max(0,Math.min(5,t.exposure||0));const v=[t.trust,t.sup,Math.min(5,Math.floor(t.ev.length/Object.keys(E).length*5)),t.exposure];v.forEach((n,i)=>{document.querySelector('#ov'+i).textContent=n+'/5';document.querySelector('#oi'+i).style.width=(n*20)+'%';document.querySelector('#om'+i).classList.toggle('danger',i===3||i===0&&n<=1)});}
function has(k){return state()?.fl.includes(k)}
function flag(k){if(!has(k))state().fl.push(k)}
function note(title,body){modal('<h3>'+title+'</h3>'+body+'<p class="opsnote">本遊戲人物、私下串聯與反制皆為虛構劇情；不能視為真實人物有不法或背叛行為。</p>')}
function scene(title,body,options){note(title,'<p>'+body+'</p><div class="opchoices">'+options.map((o,i)=>'<button data-sc="'+i+'">'+o[0]+'</button>').join('')+'</div>');document.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{document.querySelector('#mod').classList.remove('on');options[Number(b.dataset.sc)][1]();save();stats()})}
function change(tr,su,risk,key,title,body){const t=state();flag(key);t.trust=Math.max(0,Math.min(5,t.trust+tr));t.sup=Math.max(0,Math.min(5,t.sup+su));t.exposure=Math.max(0,Math.min(5,t.exposure+risk));note(title,'<p>'+body+'</p>');}
document.querySelector('#secret').onclick=()=>{const t=state();if(!t)return;
if(!has('secret1'))return scene('密件一｜糖果與法克','同一晚，兩人給會員的答覆竟與公司窗口的草稿極為相似。傳聞說他們早有聯繫，但聯繫不等於已經證實背叛。你要怎麼查？',[
['保留訊息與版本資訊，先找獨立來源',()=>change(1,0,0,'secret1','取得待查線索','你保護了來源，繼續尋找能核對的會議紀錄。')],
['沒證據也立刻指控兩人收受利益',()=>change(-2,0,2,'secret1','反制開始','小說中的幹部與公司窗口共同要求你提出依據。你的匿名消息來源可能暴露。')]]);
if(t.ch>=3&&!has('secret2'))return scene('密件二｜議程被替換','在小說裡，公司幕僚、高層與兩名工會幹部有私下合作。玩家看到的只有不同版本的議程與回覆時間，還不能從中推出全部動機。',[
['整理時間線，要求公開核對版本與授權',()=>change(1,1,0,'secret2','建立證據鏈','會員願意一起核對版本，合作關係的更多細節成為後續章節的調查主線。')],
['闖入辦公室偷拍未授權文件',()=>change(-2,-1,3,'secret2','曝光危機','你無法合法使用取得的材料，虛構反派藉機讓調查失去公信力。')]]);
if(t.ch>=5&&!has('secret3'))return scene('密件三｜新的組織','跨廠區會員希望建立可受監督的新組織，並依法檢討既有工會幹部的授權。',[
['先查明章程、召集程序與會員資格',()=>change(1,1,0,'secret3','共同討論開啟','獲得公開程序的支持。但遊戲支持度不能直接罷免任何真實幹部。')],
['宣布支持度超過四格就直接解任',()=>change(-1,-1,1,'secret3','程序遭質疑','現實中的改選與解任需要依章程和法律完成，不是遊戲數值直接生效。')]]);
note('密件暫時封存','<p>繼續主線故事；下一段將在第 3 章或第 5 章開啟。</p>')};
document.querySelector('#checks').onclick=()=>{const t=state();if(!t)return;const a=MS[t.ch]||MS[1];note('章節任務與達成狀態','<p>會員信任跌至 0，虛構調查線會失去協助；共同支持達 4/5 有機會進入公開程序分支，但不等於法律上的解任門檻。</p>'+a[1].map(x=>'<p>'+(x[1](t)?'✅':'◻')+' '+x[0]+'</p>').join(''))};
document.querySelector('#sources2').onclick=()=>note('真實新聞與工會資料','<p>以下連結與遊戲數值、劇情決策無關；是否參與任何現實活動均由讀者自行決定。</p>'+[['焦點事件新聞專題','https://eventsinfocus.org/'],['10/23 協議爭議與罷工','https://eventsinfocus.org/node/7148521'],['10/28 勞動部回應','https://eventsinfocus.org/node/7148527'],['10/30 關係企業工會','https://eventsinfocus.org/news/7148529'],['光光猴平台','https://micronmonkey.github.io/'],['關係企業工會 Q&A','https://micronmonkey.github.io/Connected_Union_QA.html'],['關係企業工會申請頁','https://micron-affiliated-enterprises-union.github.io/membership-form/'],['維基百科背景整理','https://zh.wikipedia.org/wiki/2026年臺灣美光勞資爭議']].map(x=>'<p><a href="'+x[1]+'" target="_blank" rel="noopener noreferrer">'+x[0]+' ↗</a></p>').join(''));
const oldHud=hud;hud=function(){oldHud();stats()};
const oldShow=show;show=function(id){oldShow(id);stats()};
const oldPick=pick;pick=function(o){oldPick(o);const t=state();if(!t)return;stats();if(t.trust===0&&!has('zero')){flag('zero');note('失敗｜信任斷裂','<p>信任度歸零，同事不再願意提供消息，這條調查支線失敗。可以使用右上角「重來」重新挑戰。</p>')}else if(t.exposure>=5&&!has('exposed')){flag('exposed');note('失敗｜身分暴露','<p>你缺乏保護匿名線索的方法，虛構反派發起聯合反制，調查支線失敗。</p>')}save()};
stats();
})();