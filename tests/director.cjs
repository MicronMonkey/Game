/* Lightweight regression tests for canonical outcome and visited-NPC behavior. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const storyCtx=vm.createContext({say(){}});
for(const p of ['game/characters.js','game/evidence.js','game/chapters.js','game/story.js'])vm.runInContext(read(p),storyCtx,{filename:p});
const state=(flags=[])=>({ch:3,fl:flags,ev:[],trust:3,sup:2,met:[]});
const pick=(name,s)=>storyCtx.__test=undefined,choices=s=>vm.runInContext('S.c3r.c(__s).map(x=>({g:x.g,t:x.t}))',Object.assign(storyCtx,{__s:s}));
let s=state();
let x=choices(s);assert.equal(x.length,4);assert(x.every(v=>v.g!=='win'),'No path can prevent 10/21 signing');
assert(x.some(v=>v.g==='c4a'),'A path must always reach signing');
s=state(['try_member','try_candy']);
x=choices(s);assert.deepEqual(Array.from(x.map(v=>v.g)),['c4a'],'After two attempts the signing is unavoidable');
s=state(['try_member']);
x=choices(s);assert.equal(x.length,3,'Two additional choices: remaining attempt plus signing');
storyCtx.__s=state(['try_candy']);vm.runInContext('S.c3tryCandy.f(__s)',storyCtx);
assert(storyCtx.__s.fl.includes('cd_waver'),'Candy can be shaken');
storyCtx.__s=state(['try_fack']);vm.runInContext('S.c3tryFack.f(__s)',storyCtx);
assert(storyCtx.__s.fl.includes('fk_waver'),'Fack can be shaken');
assert.equal(vm.runInContext('S.win.c[0].g',storyCtx),'c4a','Old saves must visit signing');
assert.match(read('game/caseboard.js'),/10\/22.*授權/);
assert.match(read('game/scenery.js'),/S\.q5e\.n='c5reportNight'/);
const html=read('index.html');
for(const file of ['game/engine.js','game/upgrade.js','game/cinematic.js','game/caseboard.js','game/scenery.js','game/navigation.js'])assert(html.includes('<script src="'+file+'"></script>'));
const order=['game/engine.js','game/upgrade.js','game/cinematic.js','game/caseboard.js','game/scenery.js','game/navigation.js'].map(x=>html.indexOf(x));
assert.deepEqual(order,order.slice().sort((a,b)=>a-b),'Scripts are loaded in dependency order');

class E{
 constructor(){this.textContent='0/5';this.innerHTML='';this.style={};this.children=[];this.disabled=false;this.klass=new Set();this.classList={add:k=>this.klass.add(k)};}
 append(x){this.children.push(x)}after(){}remove(){}setAttribute(k,v){this[k]=v}querySelectorAll(){return this.children}addEventListener(){}
}
const els=new Map(),get=key=>{if(!els.has(key))els.set(key,new E());return els.get(key)};
const holder=get('#hsl'),doc={head:new E(),createElement:()=>new E(),querySelector:get};
let lastModal='',s2={ch:1,sc:'seat',fl:[],ev:[],met:[],trust:2,sup:2};
const vmCtx=vm.createContext({
 document:doc,st:s2,cur:{b:'hall',qs:true},S:{qd:null},CT:{1:'大家都相信他們'},C:{mu:['阿凱']},
 QN:{mu:()=>({t:'第一次對話',c:[{t:'請他幫忙'}]})},
 qActs:()=>[{t:'阿凱',l:'🗣 阿凱',visitId:'mu',g:'qd'},{t:'走道',l:'→ 走道',moveTo:'aisle',g:'qs'}],
 qhs(){holder.children=[new E(),new E()]},show(){},pick(){},save(){},
 modal(h){lastModal=h},
 setTimeout:()=>{},console
});
vm.runInContext(read('game/navigation.js'),vmCtx);
vm.runInContext('show("qs")',vmCtx);
assert(s2.visitedAreas.includes('1:seat'),'Scene should be recorded');
vm.runInContext('qhs()',vmCtx);
assert.equal(holder.children[0].disabled,false,'NPC should be available before first conversation');
vm.runInContext('pick(qActs()[0]);qhs()',vmCtx);
assert.equal(holder.children[0].disabled,true,'Repeated unchanged NPC dialogue should be disabled');
assert.match(holder.children[0].textContent,/已交談/);
assert.equal(holder.children[1].disabled,false,'Movement must stay available');
vm.runInContext('QN.mu=()=>({t:"新內容：資料已公開",c:[{t:"回覆"}]});qhs()',vmCtx);
assert.equal(holder.children[0].disabled,false,'NPC must reopen when dialogue changes');
assert.match(holder.children[0].textContent,/新對話/);
get('#map-button').onclick();
assert.match(lastModal,/大會會場/);
assert.match(lastModal,/已去過/);
console.log('PASS director: signing is inevitable, both can waver, map persists, NPC conversations are one-time until changed.');
