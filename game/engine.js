// 引擎：狀態、存檔、畫面、選項處理與介面。資料在 art／characters／evidence／chapters／story／resources.js。
const $=s=>document.querySelector(s);
let st,ty,tm,cur;
let chg=[],hi=0,lsc='',logs=[],instant=false,resultToastTimer;
const mk=()=>({id:'s0',trust:2,sup:1,ev:[],fl:[],met:[]});
const save=()=>{try{localStorage.setItem('wsg1',JSON.stringify(st))}catch(e){}};
const load=()=>{try{return JSON.parse(localStorage.getItem('wsg1'))}catch(e){return null}};

// ── 介面元件 ──
function hud(){$('#ec').textContent=st.ev.length+' / '+Object.keys(E).length;$('#tr').textContent='♥'.repeat(st.trust)+'♡'.repeat(5-st.trust);$('#sp').textContent='◆'.repeat(st.sup)+'◇'.repeat(5-st.sup)}
function modal(h,cb){const back=document.activeElement;$('#mc').innerHTML=h+'<button class="pri" id="cl">好</button>';$('#mod').classList.add('on');$('#cl').onclick=()=>{$('#mod').classList.remove('on');if(back?.isConnected)back.focus();if(cb)cb();};$('#cl').focus();if(h.includes('新證物已收進筆記'))$('#cl').textContent='收進筆記，繼續故事';}
function evidenceDetail(k,acquired=false){const e=E[k];return `<div class="case-label">EVIDENCE / 第 ${e.ch} 章</div><h3>${acquired?'新證物已收進筆記：':''}${esc(e.n)}</h3><div class="file-art">${documentArt(k)}</div><div class="case-note">來源：${esc(e.src)} · 圖中為劇情重製示意，並非真實新聞文件或原件。</div><div class="reading-grid"><div class="reading-box"><b>① 這份資料告訴你什麼？</b>${esc(e.yes)}</div><div class="reading-box pending"><b>② 先別急著下這個結論</b>${esc(e.no)}</div></div><p class="case-note">閱讀順序：先看標記的內容，再分清「已看見的資訊」與「仍需查證的推測」。</p>`;}
function nbk(tab='evidence'){const head=`<div class="case-top"><div><div class="case-label">FIELD NOTES / 調查手帳</div><h3>把看見的事，留下來。</h3></div><span>${st.ev.length} / ${Object.keys(E).length} 件證物</span></div><div class="case-tabs" role="tablist"><button role="tab" aria-selected="${tab==='evidence'}" data-tab="evidence">證物圖鑑</button><button role="tab" aria-selected="${tab==='people'}" data-tab="people">人物關係</button></div>`;const content=tab==='people'?`<div class="people-grid">${IDS.map(k=>st.met.includes(k)?`<article class="person-card"><div class="avatar">${portrait(k)}</div><div><strong>${C[k][0]}</strong><small>${C[k][1]}<br>${PERSON_NOTES[k]}</small></div></article>`:`<article class="person-card"><div class="avatar"><div class="empty-face">？</div></div><div>尚未見面<small>第 ${DB[k]} 章登場</small></div></article>`).join('')}</div><p class="case-note">所有頭像均為原創虛構角色造型，不描繪真實人物。</p>`:`<div class="evidence-grid">${Object.keys(E).map(k=>st.ev.includes(k)?`<button class="evidence-tile" data-file="${k}">${documentArt(k)}<strong>${E[k].n}</strong><small>第 ${E[k].ch} 章 · 點開查看重點</small></button>`:`<div class="evidence-tile locked"><div style="height:105px;display:grid;place-items:center;font-size:32px">▱</div><strong>未取得 · 第 ${E[k].ch} 章</strong><small>${E[k].h}</small></div>`).join('')}</div>`;modal(head+content);$('#mc').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>nbk(b.dataset.tab));$('#mc').querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{modal('<button class="file-back" id="backFiles">← 返回證物圖鑑</button>'+evidenceDetail(b.dataset.file));$('#backFiles').onclick=()=>nbk();});}
function status(){const f=k=>st.fl.includes(k),L=a=>a.filter(x=>f(x[0])).map(x=>'<p>• '+x[1]+'</p>').join('')||'<p>（尚無）</p>';let h='<h3>📋 事件回顧</h3><h4>我答應了誰</h4>'+L([['mu_with','阿凱：我不把他推上台，他願意才陪我'],['mu_stay','阿凱：他留在台下，我尊重他的界線'],['a_full','美玲姐：代表發言時保留「版本何時能看」'],['a_narrow','美玲姐：接受較窄的共同題目'],['b_story','阿凱：只在他同意的範圍內帶入他的遭遇'],['r3_mu','阿凱：簽約前一晚陪我到場，不要求他開口'],['r3_noname','糖果：短回覆裡不寫阿凱的名字'],['r3_lc','林澄：照約定不提她的名字'],['p4_ang','小蔡：替他把問題交給糖果'],['k4_ang','（沒做到）小蔡的問題沒有交給糖果'],['p4_mu','阿凱：下次開會前先讓他知道內容'],['p4_call','門口的同事：下週打電話給他']])+'<h4>對方答應了什麼</h4>'+L([['hc_agree','美玲姐：在台上提出共同問題'],['cd_note','糖果：盯著法克的當場承諾'],['c_date','法克：十月二十日前公布下次說明會時間（未含版本）'],['c_window','窗口：十月二十日前回覆版本與時間'],['c_shareable','糖果：提供可轉述的短回覆'],['c_next','糖果：約下一次共同確認'],['c_verbal','口頭說明，尚未取得可公開版本'],['c_none','法克：無法當場答覆，沒有承諾'],['r3_written','糖果：把口頭說明寫成可轉述的短回覆'],['r3_hc','美玲姐：一起去找法克'],['r3_cd','糖果：一起去會議室門口'],['r3_back','法克：簽約前的核對會帶版本來'],['r3_brush','法克：只說「明天會說明」，沒有具體安排'],['f4_ang','糖果：把小蔡的問題列進下一輪'],['p_hc2','美玲姐：上台念出還沒回答的問題'],['ask4','糖果：「我會留下來」，但沒有給全文的時間'],['g5_hc','美玲姐：承接一個地方的會議'],['g5_mu','阿凱：承接一個地方的會議'],['g5_cd','糖果：承接一個地方的會議'],['g5_mb','小蔡：承接一個地方的會議'],['g5_call','門口那位同事：承接一個地方的會議'],['d6_rej','會員：第一次表決沒有通過，回去再談'],['d6_ok','會員：表決通過協商版本'],['d6_no','會員：兩次表決都沒有通過，原協議照舊']])+'<h4>誰知道</h4>'+(f('q_pub')?'<p>• 全場聽到你的問題'+(f('b_story')?'（含阿凱同意的遭遇）':'')+'</p>':f('q_priv')?'<p>• 只有小圈知道，其他會員不知道</p>':'<p>（尚無）</p>')+(f('r3_posted')?'<p>• 公告欄：全廠都看得到原本的承諾</p>':'')+'<h4>何時再確認</h4>'+L([['p_hc','美玲姐會追蹤說明時間'],['p_cd','糖果說下一輪會列入你的問題']])+'<p><small>小說事件，沒有現實效力。</small></p>';
 // 第 3 章起把「何時再確認」改寫成已結束；在開啟彈窗前改好文字，「好」按鈕才保有關閉功能。
 if(st.ch>=3)h=h.replace('<h4>何時再確認</h4>','<h4>已結束的追蹤（改記為結果）</h4>').replace('美玲姐會追蹤說明時間','追蹤已結束，是否履行見結局').replace('糖果說下一輪會列入你的問題','追蹤已結束，是否履行見結局');
 modal(h)}
function mis(){if(!st)return;const c=st.ch||1,sc=st.sc||'seat',q=cur&&cur.qs,inScene=q||st.id==='qd';$('#goal').innerHTML='<b>📌 '+(c===1?'讓下次如何討論的問題得到處理。':inScene&&c===3?'讓說好的版本，在簽約前回到大家面前。':inScene&&c===4?'先陪誰？說出口的承諾，今晚要做得到。':inScene&&c===5?'三個地方同一晚開會：你去哪裡，其他交給誰？':inScene&&c===6?'把三件事談成一個會員願意通過的版本。':MS[c][0])+'</b>'+(q?'<div class="ab"><button class="sm" id="hnt">💡 提示</button><span id="hx"></span></div>':'')+'<div class="ab"><button class="sm" id="bgb">🎒 證物袋 '+st.ev.length+'</button><button class="sm" id="ppl">👥 人物</button><button class="sm" id="sts">📋 事件回顧</button></div>';$('#bgb').onclick=()=>nbk('evidence');$('#ppl').onclick=()=>nbk('people');$('#sts').onclick=()=>status();if(q)$('#hnt').onclick=()=>{$('#hx').textContent=' '+HT[sc][Math.min(hi++,2)]}}
function qhs(){const o=$('#hsl');o&&o.remove();if(!cur||!cur.qs)return;const d=document.createElement('div');d.id='hsl';qActs().forEach(a=>{const b=document.createElement('button');b.className='hs';b.style.left=a.x+'%';b.style.top=a.y+'%';b.textContent=a.l;b.onclick=e=>{e.stopPropagation();pick(a)};d.appendChild(b)});$('#stage').appendChild(d)}
function say(m){const q=$('#pop');q&&q.remove();const p=document.createElement('div');p.id='pop';p.innerHTML='<div class="up">'+m+'</div>';document.body.appendChild(p);setTimeout(()=>p.remove(),2600)}

// ── 劇情推進 ──
function show(id){
 $('#panel').style.display='block';if(id==='s0')logs=[];
 st.id=id;const n=id==='fin'?fe(st):S[id];const m=/^c(\d)/.exec(id);if(m)st.ch=+m[1];if(n.f)n.f(st);cur=n;
 const side=(k,x)=>{if(!n[k])return'';const c=C[n[k]];if(!st.met.includes(n[k]))st.met.push(n[k]);return bust(x,c[2],c[3],n.sp===n[k])};
 $('#art').innerHTML=`<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">${BG[n.b]()}${side('l',170)}${side('r',630)}<rect width="800" height="450" fill="url(#v)"/></svg>`;
 const c=C[n.sp];$('#nm').textContent=n.ti?(id==='win'?'階段成果｜':'結局｜')+n.ti:c?c[0]+'・'+c[1]:'旁白';
 $('#cs').innerHTML='';$('#hint').textContent='';hud();save();
 const t=typeof n.t==='function'?n.t(st):n.t;let i=0;ty=1;clearInterval(tm);$('#tx').textContent='';
 tm=setInterval(()=>{$('#tx').textContent=t.slice(0,++i);if(i>=t.length)fin()},24);cur.full=t;
 $('#panel').scrollTop=0;$('#art').classList.remove('sceneIn');void $('#art').offsetWidth;$('#art').classList.add('sceneIn');
 let text=cur.full||'';if(logs.at(-1)?.text!==text){logs.push({who:$('#nm').textContent,text});logs=logs.slice(-80);try{localStorage.setItem('silicon-v1-log',JSON.stringify(logs));lamp.textContent='✓ 進度已記錄';}catch{lamp.textContent='無法儲存紀錄';}}
 if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches)fin();
 if(C[cur.sp])$('#nm').innerHTML=`<span class="dialog-avatar">${portrait(cur.sp)}</span><span class="speaker-text">${C[cur.sp][0]}<small>${C[cur.sp][1]}</small></span>`;
 const ch=st.ch||1,name=ch==7?'序章':ch==8?'終章':'第'+ch+'章';$('#bar b').textContent='晶片沉默者・'+name+'〈'+CT[ch]+'〉・'+DT[ch];ribbon.textContent=name+' / '+DT[ch];rw.style.display=(ch>=4&&ch<=6)||ch==8||id==='fin'?'':'none';
 if(st.sc!==lsc){lsc=st.sc;hi=0}qhs();mis();decorate()}
// 場景小道具與角色表情符號
function decorate(){const sv=$('#art svg');if(!sv||!sv.insertAdjacentHTML)return;const f=k=>st.fl.includes(k),n=cur;let h='';
 if(n.b==='lounge'||(n.qs&&st.sc==='seat'))h+=R(60,300,56,26,'#d9c9a3',4)+R(66,306,44,5,'#8a6a3a',2);
 if(n.b==='chairs2'&&f('v1_sit'))h+=R(40,330,36,26,'#c9a02f',6);
 const em=(x,k)=>{if(!k)return'';const t=n.sp===k?'💬':k==='mu'&&f('mu_stay')?'…':k==='mu'&&f('v4_leave')?'↗':'⋯';return '<text x="'+(x+50)+'" y="205" font-size="34">'+t+'</text>'};
 sv.insertAdjacentHTML('beforeend',h+em(170,n.l)+em(630,n.r))}
function fin(){if(!ty)return;ty=0;clearInterval(tm);$('#tx').textContent=cur.full;
 if(cur.c){(typeof cur.c==='function'?cur.c(st):cur.c).forEach((o,i)=>{const b=document.createElement('button');b.className='ch';b.textContent=(i+1)+'. '+o.t;b.disabled=!!o.d;b.onclick=e=>{e.stopPropagation();pick(o)};$('#cs').appendChild(b)})}
 else $('#hint').textContent='點一下繼續 ▶'}
function pick(o){
 if(o.do){const d=o.do;delete o.do;d(st)}
 if(o.msg){const m=o.msg;delete o.msg;modal(m,()=>pick(o));return}
 const a=[st.trust,st.sup,st.ev.length];cue(!!o.fx?.ev);
 const f=o.fx||{};if(f.trust)st.trust=Math.max(0,Math.min(5,st.trust+f.trust));if(f.sup)st.sup=Math.max(0,Math.min(5,st.sup+f.sup));if(f.flag&&!st.fl.includes(f.flag))st.fl.push(f.flag);
 if(o.g==='RESET'){reset();return}
 if(o.g==='NB')nbk();
 else{
  if(f.ev&&!st.ev.includes(f.ev)){st.ev.push(f.ev);hud();modal(evidenceDetail(f.ev,true),()=>show(o.g))}else show(o.g);
  // 畫面上方的數值變化提示
  const changes=[];const delta=(n)=>n>0?'+'+n:String(n);if(st.ev.length!==a[2])changes.push('🔍 蒐證 '+delta(st.ev.length-a[2]));if(st.trust!==a[0])changes.push('♥ 信任 '+delta(st.trust-a[0]));if(st.sup!==a[1])changes.push('◆ 支持 '+delta(st.sup-a[1]));const t=$('#toast');clearTimeout(resultToastTimer);t.textContent=changes.length?changes.join('　'):'此次選擇：數值未變';t.style.opacity=1;resultToastTimer=setTimeout(()=>t.style.opacity=0,3200);
 }
 const d=[];if(st.trust!==a[0])d.push('♥ 信任 '+(st.trust>a[0]?'+':'')+(st.trust-a[0]));if(st.sup!==a[1])d.push('◆ 支持 '+(st.sup>a[1]?'+':'')+(st.sup-a[1]));if(st.ev.length>a[2])d.push('🔍 新證物');if(o.t&&d.length){chg.unshift({t:o.t.slice(0,26),d});chg.length=Math.min(chg.length,8)}
 if(st.ev.length>a[2])say('🔍 新證物')}
function adv(){if(ty){fin();return}if(cur&&!cur.c&&cur.n)show(cur.n)}
function reset(){st=mk();show('c7a')}
function begin(s){$('#title').style.display='none';if(s.sup==null)s.sup=1;if(s.id==='s0'&&!s.met.length&&!s.ev.length)s.id='c7a';st=s;show(s.id)}

// ── 啟動：按鈕、鍵盤、標題畫面 ──
$('#go').onclick=()=>begin(mk());
$('#ct').onclick=()=>begin(load());
$('#rs').onclick=()=>{if(confirm('要重新開始嗎？目前進度會被覆蓋。')){$('#title').style.display='none';reset()}};
$('#nb').onclick=()=>st?nbk():0;
$('#panel').onclick=adv;
document.addEventListener('keydown',e=>{if($('#mod').classList.contains('on')||$('#title').style.display!=='none')return;
 if(e.key===' '||e.key==='Enter'){if(document.activeElement.className==='ch')return;e.preventDefault();adv()}
 else if(/^[1-4]$/.test(e.key)){const b=document.querySelectorAll('.ch')[e.key-1];if(b&&!b.disabled)b.click()}});
$('#art').innerHTML=`<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">${BG.night(0)}<rect width="800" height="450" fill="url(#v)"/></svg>`;
$('#panel').style.display='none';
const sv=load();if(sv&&sv.id&&sv.id!=='s0')$('#ct').style.display='inline-block';
const tz=document.createElement('div');tz.id='toast';$('#stage').appendChild(tz);
$('#goal').textContent=INTRO_GOAL;
$('#ec').parentNode.onclick=()=>st&&nbk();
$('#tr').parentNode.onclick=()=>st&&modal('<h3>♥ 信任</h3><p>同事願意相信你的程度（0〜5）。拿出具體問題、承認自己說太快會上升；沒有證據就指控、嘲笑別人會下降。信任太低，同事不會跟你一起查證。</p>');
$('#sp').parentNode.onclick=()=>st&&modal('<h3>◆ 支持</h3><p>願意一起核對、一起決定的會員有多少（0〜5）。傾聽、公開可核對的資料會上升；私下決定、替別人做決定會下降。支持越高，越容易有人協助你蒐集證據及參與後續公開討論；10/21 簽署是固定劇情，不能靠數值阻止。</p>');

// ── 上方工具列（依序：配樂、對話紀錄、文字速度、存檔燈、時間線、真實資源、背景說明）──
const bar=$('#bar'),audio=document.createElement('div');audio.className='audioControl';audio.innerHTML='<button class="sm" id="music" aria-pressed="false">♫ 開啟配樂</button><input id="volume" type="range" min="0" max="60" value="25" aria-label="音樂音量">';bar.append(audio);
const historyButton=document.createElement('button');historyButton.className='sm';historyButton.textContent='對話紀錄';bar.append(historyButton);const speed=document.createElement('button');speed.className='sm';speed.textContent='文字：逐字';bar.append(speed);speed.onclick=()=>{instant=!instant;speed.textContent=instant?'文字：即時':'文字：逐字';if(instant&&ty)fin();};
const lamp=document.createElement('span');lamp.id='saveLamp';lamp.textContent='本機自動存檔';bar.append(lamp);const ribbon=document.createElement('div');ribbon.id='chapterRibbon';ribbon.textContent='九月 · 說明會之前';$('#stage').append(ribbon);

// 原創環境配樂（Web Audio 即時合成）
const cue=(()=>{
let ctx,master,enabled=false,timer=null,step=0;const voices=new Set();
function note(freq,at,len,amp,type='sine'){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(amp,at+.08);g.gain.exponentialRampToValueAtTime(.0001,at+len);o.connect(g);g.connect(master);o.start(at);o.stop(at+len+.05);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};}
const chords=[[146.83,174.61,220],[130.81,164.81,196],[116.54,146.83,174.61],[130.81,164.81,196]];
function phrase(){if(!enabled||document.hidden||!ctx)return;let ch=st?.ch||1,now=ctx.currentTime+.04,notes=ch>=5?[130.81,164.81,196]:ch>=3?[146.83,155.56,220]:chords[step%4];notes.forEach((f,i)=>note(f,now+i*.08,5,.055));note(notes[0]/2,now,5,.035);[0,2,1,2].forEach((n,i)=>note(notes[n]*2,now+i*1.15,1.8,.035,'triangle'));step++;}
async function toggle(){try{if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);}enabled=!enabled;await ctx.resume();master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(enabled?Number($('#volume').value)/100:0,ctx.currentTime,.2);clearInterval(timer);if(enabled){phrase();timer=setInterval(phrase,4800);}$('#music').textContent=enabled?'♫ 配樂播放中':'♫ 開啟配樂';$('#music').setAttribute('aria-pressed',String(enabled));}catch(e){enabled=false;$('#music').textContent='此瀏覽器無法播放音樂';}}
$('#music').onclick=toggle;$('#volume').oninput=()=>{if(ctx&&enabled)master.gain.setTargetAtTime(Number($('#volume').value)/100,ctx.currentTime,.1);};document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else if(enabled)ctx.resume();});
return function cue(evidence){if(!enabled||!ctx)return;let t=ctx.currentTime;note(evidence?659.25:440,t,.3,.12);if(evidence)note(880,t+.12,.5,.1);};
})();

try{logs=JSON.parse(localStorage.getItem('silicon-v1-log')||'[]');if(!Array.isArray(logs))logs=[];}catch{logs=[];}
historyButton.onclick=()=>modal('<h3>對話紀錄</h3><p>僅保存在此裝置，最多 80 則。</p>'+logs.map(x=>'<p><b>'+esc(x.who)+'</b><br>'+esc(x.text)+'</p>').join(''));
// Keep keys on controls from also advancing the story; trap focus in the reading dialog.
const mod=$('#mod');mod.setAttribute('role','dialog');mod.setAttribute('aria-modal','true');mod.setAttribute('aria-label','筆記與紀錄');
document.addEventListener('keydown',e=>{if(mod.classList.contains('on')){if(e.key==='Escape'){e.preventDefault();$('#cl').click();}if(e.key==='Tab'){let list=[...mod.querySelectorAll('button,a,input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled);if(!list.length)return;let first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(e.target.closest('button,input,select,textarea,a'))e.stopPropagation();},true);
for(const el of document.querySelectorAll('.sc')){el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});}
const subtitle=document.createElement('p');subtitle.textContent='♫ 原創環境配樂｜點上方開啟，可調音量。音樂隨章節由懸疑轉為希望。';$('#title').append(subtitle);
tz.setAttribute('role','status');tz.setAttribute('aria-live','polite');

const timelineButton=document.createElement('button');timelineButton.className='sm';timelineButton.textContent='故事時間線';bar.append(timelineButton);
timelineButton.onclick=()=>modal('<h3>從空掉的座位，到重新站在一起</h3><p class="case-note">背景參考真實新聞；人物與畫面為小說。後續結果是架空推演。</p>'+TL.map(x=>'<article style="margin:18px 0;background:#253b48;border-radius:12px;overflow:hidden"><svg style="display:block;width:100%;max-height:180px" viewBox="0 0 800 450" role="img" aria-label="'+x[1]+'">'+BG[x[2]]()+'</svg><div style="padding:18px"><small>'+x[0]+'</small><h3>'+x[1]+'</h3>'+x[3]+'</div></article>').join(''));
// 真實資源：只在第 4–6 章、終章與舊版結局顯示（show 裡切換）
const rw=document.createElement('button');rw.className='sm';rw.textContent='🌐 真實資源';rw.style.display='none';bar.append(rw);
rw.onclick=()=>modal('<h3>🌐 真實世界資源</h3><p>你即將開啟真實世界的網站。該頁可能涉及報名、連署、入會或個人資料。是否參與由你自行決定，與遊戲進度、信任值及結局無關。活動與申請狀態以目的網站最新公告為準。</p>'+RL.map(x=>`<p><b>${x[0]}</b>（${x[3]}）<br><small>${x[2]}</small><br><a href='${x[1]}' target='_blank' rel='noopener noreferrer'>開啟網站 ↗</a></p>`).join('')+'<p><small>本作為虛構故事，與上述網站沒有背書關係，也不會預填或傳送任何資料。</small></p>');
const bgb2=document.createElement('button');bgb2.className='sm';bgb2.textContent='📰 背景與虛構界線';bar.append(bgb2);
bgb2.onclick=()=>modal(NEWS_NOTE+'<p>'+NEWS.map(x=>`<a href='${x[1]}' target='_blank' rel='noopener noreferrer'>${x[0]} ↗</a>`).join('<br>')+'</p>');
