/* 10/21 → 10/22 case puzzle. Fictional authorization record, not a factual assertion. */
(function(){
'use strict';
const css=document.createElement('style');
css.textContent='.case-map{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.case-node{background:linear-gradient(145deg,#253f50,#142532);border:1px solid #7695a0;border-radius:10px;padding:16px;box-shadow:0 7px 22px #0006}.case-date{font:700 28px monospace;color:#edcb95}.case-node strong{display:block;margin-top:8px}.case-node small{display:block;color:#b9cfda;margin-top:6px;line-height:1.7}.case-choices{display:grid;gap:10px}.case-choices button{background:#244556;border:1px solid #7d9fab;border-radius:7px;text-align:left;color:#f7f1e9;padding:13px;cursor:pointer}.case-choices button:hover,.case-choices button:focus-visible{background:#396578;border-color:#e9c892}.case-success{padding:16px;background:#1d4644;border-left:3px solid #9bdcc0}.case-alert{padding:16px;background:#45272d;border-left:3px solid #eb7d8e}.case-meta{font-size:12px;color:#b9cad4;line-height:1.9}.case-kicker{font:12px monospace;letter-spacing:2px;color:#edcb95}@media(max-width:540px){.case-map{gap:6px}.case-node{padding:9px}.case-date{font-size:21px}.case-node strong{font-size:13px}}';
document.head.append(css);
E.signedF={n:'10/21 協議簽署訊息',src:'小說事件：協議簽署；真實新聞支持簽署日期',h:'第 4 章：簽署之夜',yes:'10/21 已出現簽署訊息；本遊戲中簽署比虛構授權紀錄更早。',no:'日期不能單獨證明任何人的動機，也不能直接裁定法律效力。',ch:4};
E.authorizedF={n:'10/22 會員正式授權紀錄',src:'純虛構遊戲文件；現實授權日期與效力尚待獨立核實',h:'第 4 章：翌日的授權疑點',yes:'遊戲設定：10/22 才出現正式授權紀錄，晚於 10/21 簽署。',no:'不能當作真實工會已於 10/22 才授權的新聞證據。',ch:4};
DOCUMENTS.signedF=['簽署訊息紀錄','10 / 21 先簽署','日期背景參考新聞'];
DOCUMENTS.authorizedF=['會員授權紀錄','10 / 22 後授權','小說虛構・現實待查'];
function addEvidence(k,s){if(!s.ev.includes(k))s.ev.push(k)}
function mark(k){if(!st.fl.includes(k))st.fl.push(k)}
const earlierHandler=S.c4a.f;
S.c4a.t='【架空故事・10 月 21 日】會議室裡，九個人的身影消失在玻璃反光後。公司與工會已簽署一份協議。你卻仍拿不到會員正式授權紀錄。公開新聞中的簽署日期是真實背景，秘密會議與人物關係均屬小說。';
S.c4a.f=function(s){s.ch=4;addEvidence('signedF',s);if(earlierHandler)earlierHandler(s)};
S.c4a.n='c4auth';
S.c4auth={
 b:'boardroom',sp:'旁白',
 t:'【架空故事・10 月 22 日】你取得另一份日期為 10/22 的「會員正式授權」紀錄。它比 10/21 的簽署更晚。這份紀錄是本遊戲創作，不是已核實的現實文件。現在你要找出：究竟授權協商、授權接受方案，還是授權直接簽署？',
 f:function(s){addEvidence('authorizedF',s)},
 c:function(s){
 return s.fl.includes('dateverified')?[
 {t:'帶著核對過的時間線進入隔日說明會',g:'c4b',fx:{flag:'asked_authority'}},
 {t:'再次查看 10/21 → 10/22 證據板',g:'c4auth',do:function(){setTimeout(openBoard,120)}}
 ]:[
 {t:'打開證據板，比對簽署日和授權日',g:'c4auth',do:function(){setTimeout(openBoard,120)}},
 {t:'暫時保留疑點，進入公開說明會',g:'c4b',fx:{flag:'unverified_authority'}}
 ];
 }
};
function frame(html){modal('<div class="case-kicker">CASE 021–022 / EVIDENCE BOARD</div><h3>先簽署？後授權？</h3>'+html)}
function answer(ok){
 if(!ok){
 st.trust=Math.max(0,st.trust-1);
 st.exposure=Math.min(5,(st.exposure||0)+1);
 save();hud();
 frame('<div class="case-alert">證據不支持這個結論。文件日期、會員授權效力和特定人物的動機，是三個需要分開調查的問題。</div><button class="pri" id="case-retry">重試</button>');
 document.querySelector('#case-retry').onclick=openBoard;return;
 }
 st.caseStage=Math.min(2,(st.caseStage||0)+1);
 if(st.caseStage===2&&!st.fl.includes('dateverified')){
 mark('dateverified');st.trust=Math.min(5,st.trust+1);st.sup=Math.min(5,st.sup+1);
 }
 save();hud();
 frame('<div class="case-success">核對完成。你沒有把尚未證實的推論當成事實，而是先建立文件時間線。</div><button class="pri" id="case-next">繼續調查</button>');
 document.querySelector('#case-next').onclick=openBoard;
}
function openBoard(){
 if(!st)return;
 const have=['signedF','authorizedF'].every(k=>st.ev.includes(k));
 const cards='<div class="case-map"><div class="case-node"><div class="case-date">10 / 21</div><strong>協議簽署訊息</strong><small>有公開新聞支持日期；小說的密室情節是創作</small></div><div class="case-node"><div class="case-date">10 / 22</div><strong>會員授權紀錄</strong><small>純虛構文件；真實授權形式與效力仍待核實</small></div></div>';
 const step=st.caseStage||0;
 let quiz='';
 if(!have)quiz='<div class="case-alert">證據尚未解鎖。請先進行到第 4 章的簽署與授權事件。</div>';
 else if(step>=2)quiz='<div class="case-success"><b>✓ 時序調查完成</b><p>故事中的簽署先於正式授權紀錄。應要求查明原先授權範圍、完整決議、文件版本及適用程序，不能直接斷言真實協議無效。</p></div>';
 else if(step===0)quiz='<p>第一題：依本遊戲的兩份文件，哪個事件先發生？</p><div class="case-choices"><button data-case="1">10/21 先簽署，10/22 才出現正式授權紀錄</button><button data-case="0">10/22 先授權，10/21 才簽署</button><button data-case="0">這兩份文件完全沒有日期</button></div>';
 else quiz='<p>第二題：從先後順序能推論出什麼？</p><div class="case-choices"><button data-case="0">已直接證明所有幹部收受利益，協議必然無效</button><button data-case="1">有授權時間差疑點；還要核對授權範圍、版本與程序</button><button data-case="0">10/22 的紀錄必然自動補足所有早前授權</button></div>';
 frame(cards+quiz+'<p class="case-meta">史實：10/21 簽署已有公開報導。10/22「會員正式授權」是作者提供的故事前提，目前未經新聞獨立核實。</p>');
 document.querySelectorAll('[data-case]').forEach(b=>b.onclick=function(){answer(b.dataset.case==='1')});
}
const bar=document.querySelector('#optools');
if(bar){const b=document.createElement('button');b.id='casefile-btn';b.textContent='⌁ 證據板：10/21 → 10/22';b.style.cssText='background:linear-gradient(110deg,#604831,#223b52);border-color:#c5a16e;color:#f7dfb2';b.onclick=openBoard;bar.prepend(b)}
const previousShow=show;
show=function(id){
 if(st&&st.id!=='failedCase'&&id!=='failedCase'&&id!=='c7a'&&(st.trust<=0||(st.exposure||0)>=5))id='failedCase';
 previousShow(id);
 if(id==='c4a'&&st&&!st.fl.includes('cinematicSeen'))setTimeout(function(){if(document.querySelector('#cinematic-layer')==null&&st&&st.id==='c4a')window.playSigningCutscene&&window.playSigningCutscene()},180);
};
S.failedCase={b:'night',sp:'旁白',ti:'調查失敗：信任斷裂',t:function(s){return s.trust<=0?'你提出太多無法核對的指控。信任度歸零，願意陪你調查的同事離開了。':'你讓匿名消息與個人資料暴露，風險超過可控範圍。虛構劇情裡，相關方聯合反制，你的調查不得不中止。';},c:[{t:'重新開始，改用有效證據推理',g:'RESET'},{t:'檢視已經取得的證物',g:'NB'}]};
const previousPick=pick;
pick=function(o){
 if(st&&st.id==='failedCase'&&o.g!=='RESET'&&o.g!=='NB')return;
 previousPick(o);
 if(st&&st.id!=='failedCase'&&(st.trust<=0||(st.exposure||0)>=5))setTimeout(function(){if(st&&st.id!=='failedCase'){document.querySelector('#mod')?.classList.remove('on');show('failedCase')}},100);
};
document.addEventListener('click',function(e){
 if(e.target.closest('.opchoices button')||e.target.closest('.case-choices button'))setTimeout(function(){if(st&&st.id!=='failedCase'&&(st.trust<=0||(st.exposure||0)>=5)){document.querySelector('#mod')?.classList.remove('on');show('failedCase')}},180);
},true);
})();