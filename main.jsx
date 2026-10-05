
import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const PAGES = {
  welcome:["welcome","ورود"],
  home:["home","خانه"],
  level:["level","لول"],
  wallet:["wallet","کیف پول"],
  buy:["buy","خرید PERS"],
  mining:["mining","ماینینگ"],
  tasks:["tasks","تسک‌ها"],
  friends:["friends","دوستان"],
  leaderboard:["leaderboard","لیدربرد"],
  profile:["profile","پروفایل"]
};

const NAV = [
  ["home","⌂","خانه"],
  ["tasks","☷","تسک‌ها"],
  ["level","↟","لول"],
  ["friends","♟","دوستان"],
  ["wallet","▣","کیف پول"]
];

const LEVELS = Array.from({length:400},(_,i)=>{
  const level=i+1,t=i/399;
  let hold=level===1?0:Math.round(100+Math.pow(t,1.42)*149900);
  let speed=level<=12?1+(i/11)*124.6:125.6+Math.pow((level-12)/388,1.15)*374.4;
  if(level===12){hold=15000;speed=125.6}
  if(level===400){hold=150000;speed=500}
  return {level,hold,speed:+speed.toFixed(2)};
});

const INITIAL = {
  level:1,balance:0,mined:0,energy:200,mining:false,last:Date.now(),
  referrals:0,tasks:{},wallet:null
};

function load(){
  try { return {...INITIAL,...JSON.parse(localStorage.getItem("persepolis-state")||"{}")}; }
  catch { return {...INITIAL}; }
}
function save(s){localStorage.setItem("persepolis-state",JSON.stringify(s));}

function App(){
  const [state,setState] = useState(load);
  const [page,setPage] = useState("welcome");
  const [toast,setToast] = useState("");

  const level = LEVELS[state.level-1] || LEVELS[0];
  const next = LEVELS[state.level] || null;

  useEffect(()=>{
    const tg=window.Telegram?.WebApp;
    tg?.ready?.(); tg?.expand?.();
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>{
      setState(s=>{
        if(!s.mining || !s.last) return s;
        const now=Date.now();
        const sec=Math.max(0,(now-s.last)/1000);
        const earned=Math.min(s.energy, sec*level.speed/3600);
        if(!earned) return {...s,last:now};
        const n={...s,balance:s.balance+earned,mined:s.mined+earned,
          energy:Math.max(0,s.energy-earned),last:now};
        save(n); return n;
      });
    },1000);
    return ()=>clearInterval(id);
  },[level.speed]);

  useEffect(()=>{save(state)},[state]);

  useEffect(()=>{
    if(!toast)return;
    const id=setTimeout(()=>setToast(""),1800);
    return()=>clearTimeout(id);
  },[toast]);

  function go(p){setPage(p); window.scrollTo(0,0)}
  function msg(t){setToast(t)}
  function toggleMining(){
    setState(s=>({...s,mining:!s.mining,last:Date.now()}));
    msg(state.mining?"ماینینگ متوقف شد":"ماینینگ شروع شد");
  }
  function upgrade(){
    if(!next) return msg("به آخرین لول رسیدی");
    if(state.balance < next.hold) return msg(`برای لول ${next.level} حداقل ${next.hold.toLocaleString()} PERS لازم است`);
    setState(s=>({...s,level:s.level+1,balance:s.balance-next.hold,mining:false,last:Date.now()}));
    msg(`Level ${next.level} فعال شد`);
  }
  function claim(task,reward){
    if(state.tasks[task]) return msg("قبلاً دریافت شده");
    setState(s=>({...s,tasks:{...s.tasks,[task]:true},balance:s.balance+reward}));
    msg(`+${reward.toLocaleString()} PERS`);
  }

  const screen=PAGES[page];
  const img=`/screens/${screen[0]}.jpg`;

  return <div className="app">
    <div className="phone">
      <div className="screen">
        <img className="art" src={img} onError={e=>e.currentTarget.style.display="none"} />
        <div className="overlay"/>
        <div className="topbar"><span>PERSEPOLIS</span><span>LVL {state.level}</span></div>

        {page==="welcome" && <button className="hit welcome" onClick={()=>go("home")}>Start</button>}

        {page==="home" && <>
          <div className="liveStats">
            <b>{state.balance.toFixed(2)} PERS</b>
            <span>+{level.speed.toFixed(2)} PERS / HOUR</span>
            <small>Energy {Math.floor(state.energy)}/200</small>
          </div>
          <button className="hit mine" onClick={toggleMining}>{state.mining?"Stop Mining":"Start Mining"}</button>
          <button className="hit levelBtn" onClick={()=>go("level")}/>
          <button className="hit walletBtn" onClick={()=>go("wallet")}/>
        </>}

        {page==="level" && <>
          <div className="panel">
            <strong>LEVEL {state.level}</strong>
            <span>{state.balance.toFixed(2)} PERS</span>
            {next && <small>Next: {next.hold.toLocaleString()} PERS → {next.speed.toFixed(2)}/h</small>}
          </div>
          <button className="hit upgrade" onClick={upgrade}>Upgrade</button>
        </>}

        {page==="wallet" && <>
          <div className="walletPanel">
            <b>{state.balance.toFixed(2)} PERS</b>
            <small>{state.wallet || "Wallet not connected"}</small>
          </div>
          <button className="hit buy" onClick={()=>go("buy")}>Buy</button>
          <button className="hit bind" onClick={()=>{
            const w=prompt("TON wallet address");
            if(w){setState(s=>({...s,wallet:w}));msg("Wallet ذخیره شد")}
          }}>Connect</button>
        </>}

        {page==="buy" && <>
          <div className="trade">
            <b>BUY / SELL PERS</b>
            <span>Real swap route must be connected on the backend.</span>
          </div>
          <button className="hit tradeBtn" onClick={()=>msg("Swap route آماده اتصال است")}>BUY PERS</button>
        </>}

        {page==="mining" && <>
          <div className="miningPanel"><b>{level.speed.toFixed(2)} PERS/H</b><span>{Math.floor(state.energy)}/200 Energy</span></div>
          <button className="hit mine2" onClick={toggleMining}>{state.mining?"STOP":"START"}</button>
        </>}

        {page==="tasks" && <>
          <button className="hit task1" onClick={()=>claim("daily",500)}>Claim</button>
          <button className="hit task2" onClick={()=>claim("telegram",1000)}>Claim</button>
          <div className="taskInfo">{state.tasks.daily?"✓ Daily claimed":"Daily task"} · {state.tasks.telegram?"✓ Telegram claimed":"Telegram task"}</div>
        </>}

        {page==="friends" && <>
          <div className="friendsInfo">Referrals: {state.referrals}</div>
          <button className="hit invite" onClick={()=>{
            const link=`https://t.me/PersepolisBot?start=ref_${Date.now()}`;
            navigator.clipboard?.writeText(link); msg("لینک دعوت کپی شد");
          }}>Invite</button>
        </>}

        {page==="leaderboard" && <div className="leaderInfo">Leaderboard آماده اتصال به API است</div>}
        {page==="profile" && <div className="profileInfo">Level {state.level}<br/>{state.balance.toFixed(2)} PERS</div>}

        {page!=="welcome" && <nav>
          {NAV.map(([id,icon,label])=><button key={id} className={page===id?"active":""} onClick={()=>go(id)}>
            <span>{icon}</span><small>{label}</small>
          </button>)}
        </nav>}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  </div>
}
createRoot(document.getElementById("root")).render(<App/>);
