import json, time, sys, os, subprocess
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

bot=r"""
(function(){
  const K=['w','a','s','d'];let active=[],tick=0,target='';
  function press(keys){
    for(const k of active)if(!keys.includes(k))window.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true}));
    for(const k of keys)if(!active.includes(k))window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
    active=keys;
  }
  function step(){
    const s=window.fackChaseState&&window.fackChaseState();
    if(!s||s.time<=0||document.querySelector('.cz-card'))return press([]);
    tick++;
    const points=s.sheets>=2600?[{x:s.fwx,y:s.fwy,value:1}]:s.pickupPositions||[];
    if(!points.length)return press([]);
    const obs=s.obstacles||[],cell=32,W=760,H=1150;
    // World orientation is always portrait in 390px viewport.
    const cols=Math.ceil(W/cell),rows=Math.ceil(H/cell);
    const blocked=(x,y)=>obs.some(o=>x>o.x-22&&x<o.x+o.w+22&&y>o.y-22&&y<o.y+o.h+22);
    const start=Math.max(0,Math.min(cols-1,Math.floor(s.wx/cell)))+
       cols*Math.max(0,Math.min(rows-1,Math.floor(s.wy/cell)));
    const costs=new Float64Array(cols*rows).fill(1e9),first=new Int32Array(cols*rows).fill(-1);
    let q=[start],head=0;costs[start]=0;
    const move=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    while(head<q.length){
      let id=q[head++],x=id%cols,y=Math.floor(id/cols);
      for(let [dx,dy] of move){
        const xx=x+dx,yy=y+dy;if(xx<0||xx>=cols||yy<0||yy>=rows)continue;
        if(blocked((xx+.5)*cell,(yy+.5)*cell))continue;
        const ni=yy*cols+xx;if(costs[ni]!==1e9)continue;
        costs[ni]=costs[id]+1;first[ni]=id===start?ni:first[id];q.push(ni);
      }
    }
    let best=null,score=Infinity;
    for(let p of points){
      const cx=Math.max(0,Math.min(cols-1,Math.floor(p.x/cell)));
      const cy=Math.max(0,Math.min(rows-1,Math.floor(p.y/cell)));
      const i=cy*cols+cx;
      const d=costs[i]+Math.hypot(p.x-s.wx,p.y-s.wy)/cell*.07;
      if(d<score){score=d;best={p,i};}
    }
    if(!best||score>=1e9)return press([]);
    let dest=best.p;
    const directVisible=()=>{
      for(let j=1;j<=12;j++){const t=j/12;if(blocked(s.wx+(dest.x-s.wx)*t,s.wy+(dest.y-s.wy)*t))return false;}return true;
    };
    if(!directVisible()&&first[best.i]>=0){
      const i=first[best.i];dest={x:(i%cols+.5)*cell,y:(Math.floor(i/cols)+.5)*cell};
    }
    const dx=dest.x-s.wx,dy=dest.y-s.wy;
    const keys=[];if(dx>7)keys.push('d');if(dx< -7)keys.push('a');if(dy>7)keys.push('s');if(dy< -7)keys.push('w');
    press(keys);
  }
  window.__botTick=step;
})();
"""
opts=Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=390,840')
opts.add_argument('--autoplay-policy=no-user-gesture-required')
opts.add_argument('--hide-scrollbars')
opts.add_argument('--force-device-scale-factor=1')
driver=webdriver.Chrome(options=opts)
driver.set_window_size(390,840)
driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument',{'source':"""
window.__testClock=1000;
window.requestAnimationFrame=function(fn){return setTimeout(function(){window.__testClock+=50;if(window.__botTick)window.__botTick();fn(window.__testClock);},1);};
window.cancelAnimationFrame=clearTimeout;
"""})
results=[]
for level in ['easy','normal','hard','hell']:
 for trial in range(1,4):
  try:
   driver.get('http://127.0.0.1:8765/fack_v2.html')
   driver.find_element(By.ID,'go').click()
   driver.execute_script(bot)
   driver.find_element(By.CSS_SELECTOR,'.cz-start[data-lv="'+level+'"]').click()
   t0=time.monotonic()
   while time.monotonic()-t0<35:
    state=driver.execute_script("return window.fackChaseState&&window.fackChaseState()")
    result=driver.execute_script("var el=document.querySelector('.cz-card h2');return el&&el.textContent")
    if result and ('追到了' in result or '演練結束' in result):break
    time.sleep(.12)
   state=driver.execute_script("return window.fackChaseState&&window.fackChaseState()") or {}
   result=driver.execute_script("var el=document.querySelector('.cz-card h2');return el&&el.textContent")
   record={'difficulty':level,'trial':trial,'won':bool(result and '追到了' in result),
           'finished':bool(result),'remaining':round(state.get('time',0),1),
           'sheets':state.get('sheets',0),'elapsed_wall_seconds':round(time.monotonic()-t0,1)}
  except Exception as e:
   record={'difficulty':level,'trial':trial,'error':str(e)[:180]}
  results.append(record)
  print(json.dumps(record,ensure_ascii=False),flush=True)
print('SUMMARY',json.dumps(results,ensure_ascii=False),flush=True)
driver.quit()
