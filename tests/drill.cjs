/* 11/3 疏散演練：確認劇情節點接在第 5 章後、每條路都回到第 6 章，且證物資料完整。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({say(){},window:{},document:{querySelector:()=>null}});
for(const p of ['game/art.js','game/characters.js','game/evidence.js','game/chapters.js','game/story.js','game/drill.js'])vm.runInContext(read(p),ctx,{filename:p});
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('S.c5b.n'),'c5drill','第 5 章結尾要接到 11/3 疏散演練');
assert.equal(run('S.c5drill.n'),'c5drill2');
const choices=run('S.c5drill2.c({fl:[]}).map(o=>o.g)');
assert.deepEqual(Array.from(choices),['c5drill2','c5drillSkip'],'可以玩小遊戲，也可以略過');
assert.equal(run('typeof S.c5drill2.c({fl:[]})[0].do'),'function','選「去追」要啟動小遊戲');
assert.notEqual(run('S.c5drill2.c({fl:[]})[0]'),run('S.c5drill2.c({fl:[]})[0]'),'每次都產生新的選項，重玩時才不會失去啟動動作');
for(const k of ['c5drillWin','c5drillLose','c5drillSkip'])assert.equal(run('S.'+k+'.n'),'c6a',k+' 要回到第 6 章');
assert.equal(run("typeof BG.drill()"),'string');
assert.equal(run("E.petitionF.ch"),5);
assert.equal(run("DOCUMENTS.petitionF.length"),3);
assert.equal(run("C.ty[0]"),'桃園會長');
assert.match(run("documentArt('petitionF')"),/<svg/);
console.log('PASS: 11/3 drill nodes, chase launch, skip path, return to chapter 6, petition evidence.');
