// Deterministic DOM harness: validates actual dialogue actions, gates, puzzles and persistence.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class El{constructor(tag){this.tag=tag;this.children=[];this.style={};this.open=false;this.selectedIndex=0;}append(...xs){this.children.push(...xs)}replaceChildren(...xs){this.children=xs}set innerHTML(v){this.children=[]}setAttribute(){}showModal(){this.open=true}close(){this.open=false}focus(){}setPointerCapture(){}}
function boot(saved){const els={},storage={value:saved};const c=vm.createContext({document:{getElementById:id=>els[id]??=new El(id),createElement:t=>new El(t)},localStorage:{getItem:()=>storage.value,setItem:(k,v)=>storage.value=v},confirm:()=>true});vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8'),c);return {c,els,storage,run:s=>vm.runInContext(s,c),click:i=>els.choices.children[i].onclick()};}
let a=boot();a.run("interact('archive')");assert.equal(a.run("has('archive')"),false);
a.run("interact('old')");a.click(0);a.run("interact('board');interact('terminal');interact('rumor')");a.click(0);a.run("interact('zhou')");a.click(0);a.run("interact('he')");a.click(0);a.run("interact('archive')");a.click(0);let input=a.els.modalContent.children.find(x=>x.tag==='input');input.value='0316';a.els.modalContent.children.find(x=>x.tag==='button').onclick();assert.equal(a.run('state.bag.length'),7);
a.run("tab='board';renderDesk()");for(let i=0;i<3;i++){let p=a.els.deskContent.children[i];p.children.find(x=>x.tag==='select').selectedIndex=[1,2,2][i];p.children.find(x=>x.tag==='button').onclick();}assert.equal(a.run('state.solved.length'),3);
a.run('finale()');a.click(0);assert.equal(a.run('state.ended'),null);a.click(0);a.click(0);a.run('finale()');a.click(0);assert.equal(a.run('state.ended'),'good');assert.equal(boot(a.storage.value).run('state.ended'),'good');
let b=boot();b.run("state.solved=['math','time','claim'];finale()");b.click(1);assert.equal(b.run('state.ended'),'sealed');
b=boot();b.run('finale()');b.click(1);assert.equal(b.run('state.ended'),'quiet');
b=boot();b.run("interact('rumor')");b.click(1);assert.equal(b.run('state.ended'),'accuse');
b=boot();b.run("interact('lin')");b.click(1);assert.equal(b.run('state.ended'),'leak');
b=boot();b.run("mistake('x');mistake('x');mistake('x')");assert.equal(b.run('state.ended'),'noise');
b=boot('{broken');assert.equal(b.run('state.bag.length'),0);b.run("add('memo');add('memo')");assert.equal(b.run('state.bag.length'),1);
console.log('PASS: evidence gates, all 3 puzzle actions, redaction gate, 6 endings, save/resume, malformed save and duplicate evidence. Browser layout not covered.');

// Orientation integration: first encounter, progress and history stay distinct.
El.prototype.before=function(){};El.prototype.after=function(){};
let orientation=boot();orientation.c.document.querySelector=()=>new El('layout');
orientation.c.document.createElement=t=>{let e=new El(t);Object.defineProperty(e,'id',{set(v){orientation.els[v]=e;}});return e;};
orientation.els.goNext=new El('button');orientation.els.goNext.click=()=>{};
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../context.js'),'utf8'),orientation.c);
orientation.run("interact('old')");assert.equal(orientation.run("state.met.includes('old')"),true);
assert.match(orientation.els.characterCard.children[1].children[0].textContent,/林澄/);
orientation.run("add('memo');add('archive')");assert.match(orientation.els.caseOrientation.children[0].textContent,/23:25/);
assert.equal(boot(orientation.storage.value).run("state.met.includes('old')"),true);
console.log('PASS: character introduction, case timeline and encounter persistence.');

