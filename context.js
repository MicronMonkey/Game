/* Story orientation: fictional case progress is distinct from reported history. */
(function(){
const cast={
 old:{name:'林澄',role:'離職同事',relation:'三年前和你同班，離職後仍與你聯絡。',want:'希望你保存她提供的授權副本。',knows:'留任備忘錄的來源與封存索引。',color:'#8ec9d4'},
 mei:{name:'許沐',role:'同班技術員',relation:'每天與你交接班的同事。',want:'想知道分潤制度能不能被大家重算。',knows:'一次性獎金與制度性分潤的差別。',color:'#ddb67c'},
 he:{name:'何岑',role:'會員代表',relation:'你可以詢問會員授權範圍的窗口。',want:'希望調查先核對文件，再向會員說明。',knows:'會議節錄與授權範圍。',color:'#a5bd92'},
 zhou:{name:'周岳',role:'文件聯絡窗口',relation:'他的名字出現在舊備忘錄；你還不清楚他扮演的角色。',want:'要求你區分收件、授權與同意。',knows:'交付收據及附件缺頁。',color:'#d5a298'},
 lin:{name:'林衡',role:'你的值班主管',relation:'負責你這一班的工作安排。',want:'要求保護同事個人資料。',knows:'如何整理去識別副本。',color:'#b6cddf'}
};
const report=[
 ['2026-09-11／09-15','獎酬公布與制度訴求','據 9/15 報導，公司已公布獎酬；工會質疑方案未先協商，並要求制度性分潤。這是工會主張的歸屬，不是遊戲的裁決。','7148444'],
 ['2026-09-17','兩個活動，一群員工','9/18 報導記錄前一晚桃園員工往返公司烤肉與工會活動。參與工會不必被塑造成每個人都恐懼的地下行動。','7148448'],
 ['2026-10-06／10-07','投票與報導日期不同','10/7 報導記載 10/6 晚開票：2,258 名入冊會員中有 1,994 票同意，占全體會員 88.3%。不要與占投票人數的比例混用。','7148488'],
 ['2026-10-19','桃園預告聲援行動','報導稱桃園工會預告 10/22 罷工一天，聲援當時預定進行第二次調解的台中工會。兩地是不同工會。','7148511'],
 ['2026-10-21／10-22','台中簽約，桃園罷工','10/22 報導記載前一天台中簽署協議、撤回調解；桃園 11 名幹部於 22 日上午開始預計 24 小時罷工。報導中的批判與轉述須保留歸屬。','7148518'],
 ['2026-10-23','說明會與協商延後','報導記錄台中說明會取消、桃園罷工結束及後續協商延期；協議細節與所謂和平條款仍有未明之處。','7148521'],
 ['2026-10-25','一次性與長期方案','這篇是獎酬分析的刊登日期，不是所有方案的實施日期。報導分析一次性獎金、IPP 與季度分潤及參數透明度。','7148522'],
 ['2026-10-28','協議性質受到追問','報導引述勞動部人員說明 21 日協議為一般性協議、非團體協約；不能由此推定所有條款或法律爭議已解決。','7148527'],
 ['2026-10-30','跨廠區重新組織','報導稱自救會宣布連署達標，桃園與台中夥伴籌組關係企業工會。這是當時的籌組進度，並非宣稱工會已完成成立。','7148529']
];
const ledger=document.createElement('section');ledger.id='caseOrientation';document.querySelector('.layout').before(ledger);
const character=document.createElement('div');character.id='characterCard';$('dialogue').before(character);
const utility=document.createElement('div');utility.className='caseTools';ledger.after(utility);
function button(text,fn){let b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
function seen(){return Array.isArray(state.met)?state.met:[];}
function phase(){if(state.ended)return 4;if(state.solved.length===3)return 3;if(has('archive'))return 2;if(has('memo'))return 1;return 0;}
const phases=[['22:40','夜班來訊','先認識寄件人，再收下舊文件。'],['22:55','蒐集與訪談','逐一核對公告、本人明細、傳聞與授權文件。'],['23:25','原件交叉核對','比較三條線索，區分可以確定與尚未知道的事。'],['23:50','整理與交付','保護來源，決定公開哪些可核對的問題。'],['翌日 00:16','本章結束','檢視結局，回顧取得的材料。']];
function refresh(){let p=phase();ledger.replaceChildren();let title=document.createElement('strong');title.textContent='小說時間 · 2026-10-21 '+phases[p][0]+'｜'+phases[p][1];ledger.append(title);let context=document.createElement('p');context.textContent='你是陳以安｜晶衡記憶體・台中夜班工程師（虛構） · '+phases[p][2];ledger.append(context);let trail=document.createElement('div');trail.className='phaseTrail';phases.forEach((s,i)=>{let span=document.createElement('span');span.textContent=(i<p?'✓ ':i===p?'● ':'○ ')+s[1];span.className=i===p?'current':'';trail.append(span);});ledger.append(trail);let items=document.createElement('div');items.className='evidenceStrip';Object.entries(evidence).forEach(([id,e])=>{let b=button((has(id)?'✓ ':'○ ')+e.name,()=>{if(has(id))modal(e.name,e.type+'\n\n'+e.text);else modal('尚未取得',e.name+'\n按「下一步」繼續蒐集。');});b.className=has(id)?'collected':'missing';items.append(b);});ledger.append(items);$('clock').textContent='小說時間 / '+phases[p][0];}
function people(){modal('人物關係手冊','你只需要先記得：你是陳以安，林澄是你的離職同事。其他人物會在接觸時介紹。以下全為虛構人物，沒有真人對照。');Object.entries(cast).forEach(([id,c])=>{let section=document.createElement('section');section.className='personEntry';let h=document.createElement('h3');h.textContent=seen().includes(id)?c.name+' · '+c.role:'尚未接觸 · '+c.role;let p=document.createElement('p');p.textContent=seen().includes(id)?c.relation+'\n他／她關心：'+c.want+'\n可詢問：'+c.knows:'在調查中接觸後，會記錄姓名、關係與可提供的資訊。';section.append(h,p);$('modalContent').append(section);});}
function news(){modal('真實新聞時間線','閱讀模式｜這是現實事件的背景資料，不是玩家在小說中取得的證據。完整時間線包含小說當晚之後的新聞，請勿當成角色已知道的資訊。查閱日期：2026-11-01。');report.forEach(([date,title,body,id])=>{let section=document.createElement('section');section.className='newsEntry';let h=document.createElement('h3');h.textContent=date+' · '+title;let p=document.createElement('p');p.textContent=body;let a=document.createElement('a');a.textContent='閱讀《焦點事件》原文 ↗';a.href='https://eventsinfocus.org/news/'+id;a.target='_blank';a.rel='noopener';section.append(h,p,a);$('modalContent').append(section);});let p=document.createElement('p');p.textContent='7148528：本次無法取得內容，未用於故事事實。維基百科作跨來源索引；比例、日期與法律性質保留原始報導脈絡。';$('modalContent').append(p);let a=document.createElement('a');a.textContent='維基百科：2026 年臺灣美光勞資爭議';a.href='https://zh.wikipedia.org/wiki/2026年臺灣美光勞資爭議';a.target='_blank';a.rel='noopener';$('modalContent').append(a);}
utility.append(button('人物關係 · 誰是誰？',people),button('真實新聞時間線 ↗',news),button('我已經知道什麼？',()=>modal('調查摘要',`已取得 ${state.bag.length}/7 份材料；完成 ${state.solved.length}/3 項核對。\n\n`+(has('notice')?'已知：一次性方案與長期制度是不同問題。\n':'待查：公告究竟說了什麼？\n')+(has('minutes')&&has('receipt')?'已知：會員授權與文件收件必須分開核對。\n':'待查：誰被授權做什麼？\n')+(has('chat')?'待證：匿名收款截圖無法證實指控。\n':'')+(has('archive')?'已知：附件有保留意見；仍需查明完整版本。':'待查：封存附件說了什麼？'))));
const previousSay=say;say=function(speaker,title,body,choices){let entry=Object.entries(cast).find(([,c])=>speaker.includes(c.name));if(entry){let [id,c]=entry;let first=!seen().includes(id);if(first){state.met=[...seen(),id];save();}character.replaceChildren();character.style.borderColor=c.color;let badge=document.createElement('span');badge.className='portraitBadge';badge.style.background=c.color;badge.textContent=c.name.slice(0,1);let info=document.createElement('div');let name=document.createElement('strong');name.textContent=c.name+'｜'+c.role;let rel=document.createElement('p');rel.textContent=c.relation;info.append(name,rel);character.append(badge,info);character.hidden=false;if(first)body='【初次接觸】'+c.relation+'\n'+c.want+'\n\n'+body;}else character.hidden=true;previousSay(speaker,title,body,choices);refresh();};
const previousStats=renderStats;renderStats=function(){previousStats();refresh();};
// Characters explain their role and the conflict before handing over documents.
const previousInteract=interact;interact=function(id){if(id==='mei'&&!state.ended){say('許沐 / 同班技術員','你還記得中秋那晚嗎？','「那晚有人參加公司活動，也去工會攤位聊聊。不是每個人都想衝突；大家是想知道，景氣回來之後，分配是不是有規則。」\n「一次性發一筆，跟以後每年能核對的制度，是兩回事。先看自己的明細，我陪你整理問題。」',[['去看自己的明細',()=>{state.room=3;renderRoom();previousInteract('terminal');save();}],['我懂了，繼續調查',()=>{$('goNext').click();}]]);return;}previousInteract(id);};
refresh();welcome();
})();
