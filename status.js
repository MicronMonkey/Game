/* Prominent case status: explicit counts and remaining opportunities. */
(function(){
const bar=document.querySelector('.status');bar.classList.add('statusCards');bar.replaceChildren();
const specs=[['evidenceStatus','已收集證據','每份材料都可在下方清單點開'],['reasonStatus','已完成推理','讀原件、比對，再提出結論'],['errorStatus','判讀失誤','']];
for(const [id,label,help] of specs){let card=document.createElement('section');card.className='statusCard';let name=document.createElement('div');name.className='statusLabel';name.textContent=label;let value=document.createElement('strong');value.id=id;let detail=document.createElement('p');detail.id=id+'Help';detail.textContent=help;card.append(name,value,detail);bar.append(card);}
// Keep the original renderer's status targets available without duplicate visible counters.
for(const id of ['progress','risk']){let el=document.createElement('span');el.id=id;el.hidden=true;bar.append(el);}
let note=document.createElement('small');note.id='saveNotice';note.textContent='進度自動儲存在此瀏覽器';bar.after(note);
const previous=renderStats;renderStats=function(){previous();$('evidenceStatus').textContent=state.bag.length+' / 7';$('reasonStatus').textContent=state.solved.length+' / 3';$('errorStatus').textContent=state.risk+' / 3';$('errorStatusHelp').textContent=state.ended?'本章已結束，可回顧調查紀錄':state.risk===0?'尚無失誤；累積 3 次將中止調查':'再失誤 '+Math.max(0,3-state.risk)+' 次，調查將中止';$('errorStatus').parentElement.classList.toggle('atRisk',state.risk>0);};
const originalSave=save;save=function(){originalSave();if($('progress').textContent.includes('無法儲存'))note.textContent='目前無法自動儲存，請勿關閉此分頁';};
renderStats();
})();
