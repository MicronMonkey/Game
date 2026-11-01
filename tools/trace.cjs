// Deterministic behaviour trace for refactoring checks.
// Usage: node tools/trace.cjs [index.html] [--runs N] [--seed S] [--out file] [--full RUN]
// Loads every <script> (inline or src) into a fake DOM, plays seeded random runs through the real
// click / key handlers, and hashes a full snapshot (state + DOM + storage + modal HTML) after every action.
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const args=process.argv.slice(2),opt=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]};
const file=args.find((a,i)=>!a.startsWith('--')&&!(i&&args[i-1].startsWith('--')))||'index.html';
const RUNS=+(opt('--runs')||400),SEED=+(opt('--seed')||12345),OUT=opt('--out'),FULL=opt('--full');
const html=fs.readFileSync(file,'utf8');
const scripts=[...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m=>m[1]?{name:m[1],code:fs.readFileSync(path.join(path.dirname(file),m[1]),'utf8')}:{name:'inline',code:m[2]});
let seed=SEED>>>0;const rnd=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296},ri=n=>Math.floor(rnd()*n);
const hesc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const storage=new Map();

function boot(){
 const reg={},listeners=[];let modals=[];
 class El{
  constructor(tag,id){this.tagName=tag;this.children=[];this.parentNode=null;this._h='';this._t=null;this._id='';this.style={};this.dataset={};this.attrs={};this.cls=new Set();this.disabled=false;this.scrollTop=0;this.offsetWidth=0;this.isConnected=true;this.value='25';this.tabIndex=-1;
   const c=this.cls;this.classList={add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x)};if(id)this.id=id}
  get id(){return this._id}set id(v){this._id=v;reg[v]=this}
  get className(){return[...this.cls].join(' ')}set className(v){this.cls.clear();String(v).split(/\s+/).filter(Boolean).forEach(x=>this.cls.add(x))}
  get innerHTML(){return this._h}set innerHTML(v){this._h=String(v);this._t=null;this.children.forEach(c=>c.parentNode=null);this.children=[];for(const m of this._h.matchAll(/\bid="([^"]+)"/g))new El('x',m[1])}
  get textContent(){return this._t!=null?this._t:this._h.replace(/<[^>]*>/g,'')}set textContent(v){const s=v==null?'':String(v);this.innerHTML=hesc(s);this._t=s}
  append(...xs){xs.forEach(x=>this.appendChild(x))}
  appendChild(x){if(typeof x==='string'){this._h+=hesc(x);return x}x.parentNode=this;this.children.push(x);if(x._id)reg[x._id]=x;return x}
  remove(){const p=this.parentNode;if(p){p.children=p.children.filter(c=>c!==this);this.parentNode=null}if(reg[this._id]===this)delete reg[this._id];this.isConnected=false}
  setAttribute(k,v){this.attrs[k]=String(v)}
  focus(){doc.activeElement=this}
  click(){if(this.onclick)this.onclick(ev('click'))}
  addEventListener(t,f){(this.ls||(this.ls=[])).push([t,f])}
  querySelectorAll(){return[]}querySelector(){return null}closest(){return null}
  insertAdjacentHTML(p,h){this._h+=h}
 }
 const ev=(type,key)=>({type,key,target:doc.body,stopped:false,stopPropagation(){this.stopped=true},preventDefault(){}});
 const statics='app bar nb rs stats ec tr sp goal stage art title go ct panel nm tx cs hint mod mc'.split(' ');
 statics.forEach(id=>new El('div',id));
 const barB=new El('b');reg.bar.children.push(barB);barB.parentNode=reg.bar;['nb','rs'].forEach(k=>{reg[k].parentNode=reg.bar;reg.bar.children.push(reg[k])});
 ['art','title','panel'].forEach(k=>{reg[k].parentNode=reg.stage;reg.stage.children.push(reg[k])});
 const scs=['ec','tr','sp'].map(k=>{const s=new El('div');s.className='sc';reg[k].parentNode=s;return s});
 const doc={activeElement:null,hidden:false,body:new El('body'),documentElement:new El('html'),
  querySelector(s){if(s==='#bar b')return barB;if(s==='#art svg'){const a=reg.art;return a._h.includes('</svg>')?{insertAdjacentHTML:(p,h)=>{a._h=a._h.replace(/<\/svg>$/,h+'</svg>')}}:null}if(/^#[\w-]+$/.test(s))return reg[s.slice(1)]||null;throw new Error('selector '+s)},
  querySelectorAll(s){if(s==='.sc')return scs;if(s==='.ch')return reg.cs.children.filter(c=>c.cls.has('ch'));return[]},
  getElementById(id){return reg[id]||null},createElement:t=>new El(t),
  addEventListener(t,f,cap){listeners.push([t,f,!!cap])}};
 doc.activeElement=doc.body;
 let act={},n=0;
 const ctx={document:doc,localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))},confirm:()=>true,innerWidth:900,
  matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame(){},navigator:{},setTimeout(){return 0},clearTimeout(){},
  setInterval(fn){const id=++n;act[id]=1;for(let k=0;k<700&&act[id];k++)fn();return id},clearInterval(id){act[id]=0},AudioContext:undefined,console};
 ctx.window=ctx;vm.createContext(ctx);
 for(const s of scripts)vm.runInContext(s.code,ctx,{filename:s.name});
 // Record every modal body without changing what the game does.
 const realModal=vm.runInContext('modal',ctx);
 const key=k=>{const e=ev('keydown',k);for(const[t,f,c]of listeners)if(t==='keydown'&&c)f(e);if(!e.stopped)for(const[t,f,c]of listeners)if(t==='keydown'&&!c)f(e)};
 const dump=el=>({tag:el.tagName,id:el._id,h:el._h,t:el._t,c:el.className,s:JSON.stringify(el.style),a:JSON.stringify(el.attrs),d:el.disabled,o:typeof el.onclick,k:el.children.map(dump)});
 const snap=()=>JSON.stringify({st:vm.runInContext('typeof st==="undefined"?null:st',ctx),cur:vm.runInContext('typeof cur==="undefined"||!cur?null:{full:cur.full,ti:cur.ti||null}',ctx),
  reg:Object.keys(reg).sort().map(k=>[k,dump(reg[k])]),stage:dump(reg.stage),bar:dump(reg.bar),title:dump(reg.title),body:dump(doc.body),sc:scs.map(s=>[typeof s.onclick,s.tabIndex,JSON.stringify(s.attrs)]),
  focus:doc.activeElement&&(doc.activeElement._id||doc.activeElement.textContent),store:[...storage.entries()].sort()});
 return {ctx,reg,doc,key,snap,run:c=>vm.runInContext(c,ctx),realModal};
}

let H=crypto.createHash('sha256'),lines=[],steps=0;
const rec=(g,label)=>{const s=g.snap();H.update(label+'\n'+s+'\n');steps++;const h=crypto.createHash('sha256').update(s).digest('hex').slice(0,12);lines.push(label+' '+h);if(FULL!=null&&label.startsWith('r'+FULL+' '))fs.appendFileSync(OUT+'.full',label+'\n'+s+'\n')};
if(FULL!=null&&OUT)fs.writeFileSync(OUT+'.full','');
const endings={};let dead=0,stuck=0;
let g=boot();rec(g,'boot');
const closeModal=(g,L)=>{for(let i=0;i<5&&g.reg.mod.cls.has('on');i++){const cl=g.reg.cl;if(cl&&cl.onclick){rnd()<.2?g.key('Escape'):cl.click()}else{dead++;g.reg.mod.cls.delete('on');lines.push(L+' dead-modal-button')}rec(g,L+' close'+i)}};
const pokes=[g=>g.reg.nb.click(),g=>g.reg.bgb&&g.reg.bgb.click(),g=>g.reg.ppl&&g.reg.ppl.click(),g=>g.reg.sts&&g.reg.sts.click(),g=>g.reg.hnt&&g.reg.hnt.click(),
 ...[0,1,2,3,4,5,6,7].map(i=>g=>{const b=g.reg.bar.children.filter(c=>c.tagName==='button'||c.tagName==='div')[3+i];if(b){if(b.tagName==='div')b.children[0]&&b.children[0].click();else b.click()}}),
 g=>g.reg.music&&g.reg.music.onclick(),g=>g.reg.ec.parentNode.click(),g=>g.reg.tr.parentNode.click(),g=>g.reg.sp.parentNode.click(),g=>g.key('?')];
for(let r=0;r<RUNS;r++){
 const how=r%3;
 if(how===0)g.reg.go.click();else if(how===1)g.run('st=mk();chg=[];show("c7a")');else{g.reg.rs.click()}
 let L='r'+r+' s0';rec(g,L);let ok=0;
 for(let k=0;k<400;k++){
  L='r'+r+' s'+(k+1);
  if(r%4===3&&k===15){g=boot();rec(g,L+' reboot');g.reg.ct.click();rec(g,L+' continue');continue}
  if(g.reg.mod.cls.has('on')){closeModal(g,L);continue}
  if(rnd()<.12){pokes[ri(pokes.length)](g);rec(g,L+' poke');continue}
  const j=JSON.parse(g.run('JSON.stringify({ti:cur.ti||null,end:!!(cur.ti&&cur.c&&cur.c.some(c=>c.g==="RESET")),qs:!!cur.qs,has:!!(typeof cur.c==="function"?cur.c(st):cur.c)})'));
  if(j.end){endings[j.ti]=(endings[j.ti]||0)+1;ok=1;break}
  if(j.qs){const hs=(g.reg.hsl?g.reg.hsl.children:[]);if(!hs.length){stuck++;break}hs[ri(hs.length)].click();rec(g,L+' hotspot');continue}
  if(!j.has){const m=ri(3);if(m===0)g.reg.panel.onclick();else if(m===1)g.key(' ');else g.key('Enter');rec(g,L+' advance');continue}
  const bs=g.reg.cs.children.filter(b=>!b.disabled);if(!bs.length){stuck++;break}
  const i=ri(bs.length),b=bs[i],idx=g.reg.cs.children.indexOf(b);
  if(idx<4&&rnd()<.4)g.key(String(idx+1));else b.click();rec(g,L+' choose'+idx);
 }
 if(!ok)stuck++;
}
const digest=H.digest('hex');
if(OUT)fs.writeFileSync(OUT,lines.join('\n')+'\n');
console.log(JSON.stringify({file,runs:RUNS,seed:SEED,steps,stuck,deadModalButtons:dead,endings,digest}));
