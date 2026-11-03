/* 介面整理：上方只留章節、地點與數值；其他按鈕收進「☰ 選單」。
   手機直向時，畫面上半是場景、下半是對話，選項固定在對話區底部，不用往下捲。 */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const css=document.createElement('style');
css.textContent=[
// 整體：固定一個螢幕高，不讓整頁捲動
'html,body{height:100%;overflow:hidden}',
'#app{height:100dvh!important;min-height:0!important;max-width:1180px!important;padding:0 0 env(safe-area-inset-bottom,0px)!important;display:flex!important;flex-direction:column!important}',
'#ops,#optools,#locbar,#goal,#stats{display:none}',
'#sheet #ops,#sheet #goal{display:block}#sheet #ops{display:grid!important;margin:0!important}',
// 上方列
'#bar{flex:none!important;flex-wrap:nowrap!important;gap:8px!important;padding:8px 10px!important;align-items:center!important}',
'#bar .tb-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}',
'#bar .tb-text b{flex:none!important;flex-basis:auto!important;min-width:0!important;font-size:14px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px!important}',
'#tb-loc{font-size:11px;color:#a8cad7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'#tb-chips{display:flex;gap:4px;flex:none;background:none;border:0;padding:0;color:inherit;cursor:pointer}',
'#tb-chips span{font:700 12px system-ui;background:#1b3242;border:1px solid #3d5a6c;border-radius:999px;padding:4px 7px;white-space:nowrap}',
'#tb-chips span.bad{border-color:#e56c75;color:#ffb3b8}',
'#tb-menu{flex:none;background:#e4b979;color:#13222e;border:0;border-radius:10px;padding:8px 12px;font-weight:800;font-size:14px;white-space:nowrap}',
// 舞台
'#stage{flex:1 1 auto!important;height:auto!important;min-height:0!important;margin:0 8px 8px!important}',
'#stage-place{display:none!important}',
'#toast{top:calc(env(safe-area-inset-top,0px) + 64px)!important}',
// 對話框：選項永遠在底部可見，長文字在上方自己捲動
'#panel:not([style*="none"]){display:flex!important;flex-direction:column}',
'#panel{max-height:66%!important;overflow:hidden!important;padding:30px clamp(14px,4vw,40px) 14px!important;cursor:pointer}',
'#nm{flex:none;align-self:flex-start}',
'#tx{flex:0 1 auto;min-height:2em!important;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
'#cs{flex:none;margin-top:10px!important}',
'#hint{flex:none}',
// 手機直向：上半場景、下半對話
'@media (max-width:760px) and (orientation:portrait){',
' #stage{--ah:min(86vw,48%);margin:0 6px 6px!important;border-radius:12px!important}',
' #art{bottom:auto!important;height:var(--ah)!important}',
' #hsl{position:absolute;left:0;right:0;top:0;height:var(--ah);z-index:3}',
' #panel{top:var(--ah)!important;bottom:0!important;max-height:none!important;padding:10px 14px 12px!important;background:linear-gradient(#071827,#020b15 40px)!important;border-top:1px solid #4d6c7d}',
' #nm{padding:4px 10px!important;font-size:13px!important;margin-bottom:6px!important}',
' .dialog-avatar{width:38px!important;height:44px!important;margin-right:9px!important}',
' #tx{font-size:16px!important;line-height:1.75!important;flex:1 1 auto}',
' .ch{font-size:15px!important;padding:11px 12px!important;line-height:1.5!important}',
' #cs{gap:7px!important}',
' #chapterRibbon{font-size:9px!important;top:8px!important;left:8px!important;padding:4px 8px!important}',
' .hs{font-size:12px!important;padding:5px 9px!important}',
' #title{padding:20px 18px!important;overflow-y:auto;justify-content:flex-start!important}',
' #title h1{margin-top:auto!important}',
'}',
'@media (max-width:380px){#tb-chips span:nth-child(n+3){display:none}#tb-menu{padding:8px 10px}}',
// 手機橫向（高度很矮）：對話框可佔滿舞台，選項排兩欄
'@media (max-height:520px) and (orientation:landscape){#bar{padding:4px 10px!important}#tb-loc{display:none}#tb-menu{padding:6px 10px}#panel{max-height:100%!important;padding:18px 16px 8px!important}#nm{padding:2px 10px!important;margin-bottom:2px!important}.dialog-avatar{width:30px!important;height:34px!important}#tx{font-size:15px!important;line-height:1.6!important}#cs{grid-template-columns:1fr 1fr;gap:6px!important;margin-top:6px!important}.ch{font-size:14px!important;padding:8px 10px!important}#chapterRibbon{display:none}}',
// 選單抽屜
'#sheet{position:fixed;inset:0;z-index:8;display:none}#sheet.on{display:block}',
'#sheet .sh-back{position:absolute;inset:0;background:#000a;backdrop-filter:blur(3px)}',
'#sheet .sh-panel{position:absolute;right:0;top:0;bottom:0;width:min(420px,100%);background:#10202c;color:#e9e5de;border-left:1px solid #4d6c7d;overflow-y:auto;padding:14px 16px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:-20px 0 60px #0008}',
'@media (max-width:760px){#sheet .sh-panel{top:auto;left:0;width:100%;max-height:86dvh;border-left:0;border-top:1px solid #4d6c7d;border-radius:18px 18px 0 0}}',
'.sh-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:-14px;background:#10202c;padding:4px 0 8px;z-index:1}.sh-head b{font-size:17px}',
'.sh-head button{background:#203e50;color:#fff;border:1px solid #5d7d8f;border-radius:8px;width:38px;height:38px;font-size:17px}',
'#sheet h4{margin:16px 0 8px;font-size:12px;letter-spacing:2px;color:#e4b979}',
'.sh-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
'#sheet button.sm,#sheet .sh-grid button,#sheet #goal button{width:100%;min-height:44px;text-align:left;font:600 14px system-ui!important;background:#1d3747!important;color:#eef3f5!important;border:1px solid #4f7385!important;border-radius:10px!important;padding:10px 12px!important;margin:0!important}',
'#sheet .audioControl{grid-column:1/-1;display:flex;gap:8px;align-items:center}#sheet .audioControl button{flex:1}#sheet #volume{width:110px}',
'#sheet #saveLamp{grid-column:1/-1;font-size:12px}',
'#sheet #goal{margin:0!important;border-radius:10px;font-size:14px!important;padding:12px!important}#sheet #goal .ab{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}',
'#sheet #goal .ab:first-of-type:has(#hnt){grid-template-columns:auto 1fr}#sheet #hx{font-size:13px;color:#ffe2a8;align-self:center}',
'#sheet .om{padding:8px!important}'
].join('\n');
document.head.append(css);

const bar=$('#bar'),title=$('#bar b');
const textBox=document.createElement('div');textBox.className='tb-text';
const loc=document.createElement('span');loc.id='tb-loc';loc.textContent='📍 —';
bar.prepend(textBox);textBox.append(title,loc);
const chips=document.createElement('button');chips.id='tb-chips';chips.setAttribute('aria-label','查看數值與選單');
chips.innerHTML='<span id="cp0">♥ –</span><span id="cp1">◆ –</span><span id="cp2">▣ –</span><span id="cp3">⚠ –</span>';
const menu=document.createElement('button');menu.id='tb-menu';menu.textContent='☰ 選單';menu.setAttribute('aria-haspopup','dialog');

// 選單內容：把原本散在畫面上的按鈕移進來（保留原本的功能）
const sheet=document.createElement('div');sheet.id='sheet';
sheet.innerHTML='<div class="sh-back"></div><div class="sh-panel" role="dialog" aria-modal="true" aria-label="選單"><div class="sh-head"><b>☰ 選單</b><button id="sh-close" aria-label="關閉選單">✕</button></div><h4>目前目標</h4><div id="sh-goal"></div><h4>狀態</h4><div id="sh-ops"></div><h4>調查</h4><div class="sh-grid" id="sh-inv"></div><h4>設定</h4><div class="sh-grid" id="sh-set"></div><h4>真實世界資料</h4><div class="sh-grid" id="sh-ext"></div></div>';
document.body.append(sheet);
const inv=$('#sh-inv'),set=$('#sh-set'),ext=$('#sh-ext');
$('#sh-goal').append($('#goal'));
if($('#ops'))$('#sh-ops').append($('#ops'));
const byText=t=>[...bar.querySelectorAll(':scope > button')].find(b=>b.textContent.includes(t));
const move=(el,to)=>{if(el)to.append(el)};
move($('#nb'),inv);move($('#casefile-btn'),inv);move($('#map-button'),inv);move(byText('對話紀錄'),inv);move(byText('故事時間線'),inv);move($('#secret'),inv);move($('#checks'),inv);
move(bar.querySelector('.audioControl'),set);move(byText('文字'),set);move($('#rs'),set);move($('#saveLamp'),set);
move(byText('真實資源'),ext);move($('#sources2'),ext);move(byText('背景'),ext);
[...bar.querySelectorAll(':scope > button,:scope > span:not(.tb-text)')].forEach(el=>{if(el.id!=='tb-chips'&&el.id!=='tb-menu')inv.append(el)});
bar.append(chips,menu);

let back=null;
function open(){back=document.activeElement;sheet.classList.add('on');$('#sh-close').focus();}
function shut(){if(!sheet.classList.contains('on'))return;sheet.classList.remove('on');if(back&&back.isConnected&&!$('#mod').classList.contains('on'))back.focus();}
menu.onclick=open;chips.onclick=open;
$('#sh-close').onclick=shut;sheet.querySelector('.sh-back').onclick=shut;
// 點了選單裡會開啟視窗的按鈕就先收起選單；音樂、音量、文字速度、提示則留在選單裡。
sheet.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.id==='sh-close')return;if(b.closest('.audioControl')||b.id==='hnt'||/^文字/.test(b.textContent))return;shut();},true);
window.addEventListener('keydown',e=>{if(!sheet.classList.contains('on'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();shut();return;}if(!e.target.closest('#sheet'))e.stopPropagation();},true);

// 上方小數值與地點，跟著原本的數值卡／地點列同步
function sync(){
 for(let i=0;i<4;i++){const v=$('#ov'+i),c=$('#cp'+i);if(!v||!c)continue;const n=v.textContent.split('/')[0];c.textContent=['♥','◆','▣','⚠'][i]+' '+n;c.classList.toggle('bad',(i===3&&+n>=3)||(i===0&&+n<=1&&n!=='—'));}
 const w=$('#where-now');if(w)loc.textContent='📍 '+w.textContent;
}
const mo=new MutationObserver(sync);['#ops','#locbar'].forEach(q=>{const el=$(q);if(el)mo.observe(el,{subtree:true,childList:true,characterData:true})});
sync();

// 換場景時，對話文字回到最上方
const oldShow=show;show=function(id){oldShow(id);title.textContent=title.textContent.replace(/^晶片沉默者・/,'');const t=$('#tx');if(t)t.scrollTop=0;shut();};
})();
