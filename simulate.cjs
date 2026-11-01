const fs=require('fs'),vm=require('vm'),path=require('path');
const file=process.argv[2]||'index.html',html=fs.readFileSync(file,'utf8');
const sc=[...html.matchAll(/<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m=>m[1]?fs.readFileSync(path.join(path.dirname(file),m[1]),'utf8'):m[2]);
if(process.env.SEED){let r=+process.env.SEED>>>0;Math.random=()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const P=()=>new Proxy(function(){},{get(t,p){if(p===Symbol.toPrimitive)return()=>'';if(p===Symbol.iterator)return function*(){};if(!(p in t))t[p]=(p==='innerHTML'||p==='textContent')?'':(p==='style'||p==='dataset'||p==='classList')?P():P();return t[p]},set(t,p,v){t[p]=v;return true},apply(){return P()}});
let btns=[],els={};
const doc={querySelector(s){return els[s]||(els[s]=P())},querySelectorAll(){return[]},getElementById(){return P()},createElement(){const e=P();e.disabled=false;return e},body:P(),addEventListener(){},documentElement:P(),hidden:false};
let act={},n=0;
const ctx={document:doc,localStorage:{getItem(){return null},setItem(){}},confirm(){return true},innerWidth:900,clearTimeout(){},matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame(f){},navigator:{},setTimeout(){},
 setInterval(fn){const id=++n;act[id]=1;for(let k=0;k<700&&act[id];k++)fn();return id},clearInterval(id){act[id]=0},AudioContext:undefined,console};
ctx.window=ctx;vm.createContext(ctx);
for(const s of sc)vm.runInContext(s,ctx);
console.log('loaded; scripts',sc.length);
vm.runInContext('modal=(h,cb)=>{cb&&cb()}',ctx);
const ends={};let errs=0,stuck=0,seen=new Set();
for(let r=0;r<800;r++){try{vm.runInContext('st=mk();chg=[];show("c7a")',ctx);let ok=0;
 for(let k=0;k<2500;k++){
  const o=vm.runInContext('JSON.stringify({ti:cur.ti||null,end:!!(cur.ti&&cur.c&&cur.c.some(c=>c.g==="RESET")),id:st.id})',ctx),j=JSON.parse(o);seen.add(j.id);
  if(j.end){ends[j.ti]=(ends[j.ti]||0)+1;ok=1;break}
  const ch=vm.runInContext('cur.qs?qActs():((typeof cur.c==="function"?cur.c(st):cur.c)||null)',ctx);
  if(!ch){vm.runInContext('show(cur.n)',ctx);continue}
  const en=ch.filter(c=>!c.d);if(!en.length){stuck++;break}
  ctx.__o=en[Math.floor(Math.random()*en.length)];
  vm.runInContext('pick(__o)',ctx)}
 if(!ok)stuck++}catch(e){errs++;if(errs<4)console.log('ERR',e.message)}}
console.log('errors',errs,'stuck',stuck,ends,'nodes',[...seen].length);
