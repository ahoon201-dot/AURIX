const tg=window.Telegram?.WebApp;
tg?.ready(); tg?.expand();

const API="https://persepolis.ahoon201.workers.dev";
const PERS_MASTER="EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";
const MAX_ENERGY=200;
let state=null, levels=[], connectedWallet="", tonUI=null, lastServerSync=0;

const fallbackLevels=Array.from({length:400},(_,i)=>{
  const l=i+1;
  const t=(l-1)/399;
  const hold=l===1?0:Math.round(100+Math.pow(t,1.42)*149900);
  const speed=l<=12 ? 1+((l-1)/11)*124.6 : 125.6+Math.pow((l-12)/388,1.15)*374.4;
  return {level:l,hold,speed:Number(speed.toFixed(2))};
});

function headers(){
  return {"Content-Type":"application/json","X-Telegram-Init-Data":tg?.initData||""};
}
function fmt(n,d=4){return Number(n||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}
function user(){return tg?.initDataUnsafe?.user||{}}
function refParam(){return tg?.initDataUnsafe?.start_param||""}

async function api(path,options={}){
  const r=await fetch(API+path,{...options,headers:{...headers(),...(options.headers||{})},cache:"no-store"});
  let j={}; try{j=await r.json()}catch{}
  if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}

function currentLevel(){return levels[(state?.level||1)-1]||fallbackLevels[(state?.level||1)-1]}
function nextLevel(){return levels[state?.level||1]||null}

function localMineEstimate(){
  if(!state||!state.mining||!state.lastMineAt)return 0;
  const elapsed=Math.min(8*3600,Math.max(0,(Date.now()-state.lastMineAt)/1000));
  return elapsed*(currentLevel()?.speed||1)/3600;
}

function render(){
  if(!state)return;
  const me=user(), cur=currentLevel(), next=nextLevel();
  const liveMined=Number(state.mined||0)+localMineEstimate();
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set("userName",(me.first_name||"Miner")+" ✓"); set("profileName",me.first_name||"Miner");
  set("profileId",me.id?`Telegram ID ${me.id}`:"Telegram");
  set("level",state.level); set("upgradeLevel",state.level); set("profileLevel",`LEVEL ${state.level}`);
  set("saved",fmt(state.saved)); set("mined",fmt(liveMined));
  set("speed",Number(cur?.speed||1).toFixed(2)); set("upgradeSpeed",`${Number(cur?.speed||1).toFixed(2)} PERS/h`);
  set("upgradeHold",next?`${fmt(next.hold,0)} PERS`:"MAX LEVEL");
  set("nextHold",next?fmt(Math.max(0,next.hold-(state.walletPers||0)),0):"0");
  set("walletPers",fmt(state.walletPers||0)); set("walletPers2",fmt(state.walletPers||0));
  set("walletTotal",`${fmt(state.walletPers||0)} PERS`); set("profileWallet",`${fmt(state.walletPers||0)} PERS`);
  set("totalEarned",`${fmt(Number(state.saved||0)+liveMined)} PERS`);
  set("refEarned",fmt(state.referralEarned||0,0)); set("profileRef",`${fmt(state.referralEarned||0,0)} PERS`);
  set("invited",state.referrals||0); set("refCount",`${state.referrals||0} ACTIVE`);
  set("energy",`${Math.floor(state.energy||0)} / ${MAX_ENERGY}`);
  const progress=document.getElementById("progress"); if(progress)progress.style.width=`${((state.level||1)/400)*100}%`;
  const ms=document.getElementById("miningState"); if(ms)ms.textContent=state.mining?"MINING":"READY";
  const mb=document.getElementById("mineBtn"); if(mb)mb.textContent=state.mining?"STOP MINING":"START MINING";
  const ub=document.getElementById("upgradeBtn"); if(ub)ub.textContent=next?`UPGRADE TO LEVEL ${next.level}`:"LEVEL 400 REACHED";
  const timer=document.getElementById("mineTimer");
  if(timer){
    const sec=state.mining?Math.min(28800,Math.max(0,Math.floor((Date.now()-state.lastMineAt)/1000))):0;
    timer.textContent=new Date(sec*1000).toISOString().slice(11,19);
  }
  const chip=document.getElementById("walletChip"); if(chip)chip.textContent=connectedWallet?connectedWallet.slice(0,6)+"..."+connectedWallet.slice(-6):"CONNECT WALLET";
  const link=document.getElementById("refLink"); if(link&&me.id)link.textContent=`https://t.me/Pirouzi6_bot?startapp=ref_${me.id}`;
  set("profileSpeed",`${Number(cur?.speed||1).toFixed(2)} PERS/h`);
  renderMilestones(); renderTasks();
}

function renderMilestones(){
  const box=document.getElementById("levelMilestones"); if(!box)return;
  [1,5,12,25,50,100,200,300,400].forEach(l=>{
    const x=levels[l-1]||fallbackLevels[l-1];
    const el=document.createElement("div");el.className="milestone";
    el.innerHTML=`<span>LEVEL ${l}</span><b>${fmt(x.hold,0)} PERS</b><span>${Number(x.speed).toFixed(2)} PERS/h</span>`;
    box.appendChild(el);
  });
}
function renderTasks(){
  const box=document.getElementById("taskList"); if(!box||!state)return;
  const tasks=[
    ["daily","🎁","Check in daily",500],
    ["telegram","✈️","Join Telegram",1000],
    ["x","𝕏","Follow X",1000],
    ["invite3","♙","Invite 3 friends",5000],
    ["watch","▶","Watch video",1000],
    ["swap","↔","Swap PERS",2000]
  ];
  box.innerHTML=tasks.map(t=>{
    const todayKey=`daily:${new Date().toISOString().slice(0,10)}`;
    const done=t[0]==="daily"?((state.tasks||[]).includes(todayKey)||(state.tasks||[]).includes("daily")):(state.tasks||[]).includes(t[0]);
    return `<div class="task"><div>${t[1]} ${t[2]}<small>+${t[3].toLocaleString()} PERS</small></div><button class="${done?"done":""}" data-task="${t[0]}">${done?"CLAIMED":"CLAIM"}</button></div>`;
  }).join("");
  box.querySelectorAll("[data-task]").forEach(b=>b.onclick=()=>claimTask(b.dataset.task));
}
async function claimTask(id){
  try{await api("/api/tasks/claim",{method:"POST",body:JSON.stringify({taskId:id})});await sync()}catch(e){alert(e.message)}
}

async function loadLeaderboard(){
  const box=document.getElementById("leaderboardList"); if(!box)return;
  box.innerHTML='<div class="loading">LOADING LEADERBOARD…</div>';
  try{
    const j=await api("/api/leaderboard");
    box.innerHTML=(j.rows||[]).map((r,i)=>`<div class="leader-row"><span class="rank">#${i+1}</span><span class="leader-name">${escapeHtml(r.first_name||r.username||"Miner")}</span><span class="leader-level">LVL ${r.level}</span><b>${fmt(r.total,0)}</b></div>`).join("")||'<div class="loading">NO DATA YET</div>';
  }catch(e){box.innerHTML=`<div class="loading">${escapeHtml(e.message)}</div>`}
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\'":"&#39;"}[c]||c))}


async function sync(){
  try{const j=await api("/api/bootstrap",{method:"POST",body:JSON.stringify({ref:refParam(),wallet:connectedWallet})});state=j.state;levels=j.levels||fallbackLevels;lastServerSync=Date.now();render()}catch(e){console.error(e);if(!state){state={level:1,saved:0,mined:0,walletPers:0,energy:200,mining:false,referrals:0,referralEarned:0,tasks:[],lastMineAt:null};levels=fallbackLevels;render()}}
}

function showScreen(name, navButton=null){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const target=document.getElementById("screen-"+name); if(target)target.classList.add("active");
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x===navButton));
  if(name==="leaderboard")loadLeaderboard();
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen,b));
document.querySelector(".profile-mini")?.addEventListener("click",()=>showScreen("profile"));
document.getElementById("leaderboardBtn")?.addEventListener("click",()=>showScreen("leaderboard"));

document.getElementById("mineBtn").onclick=async()=>{
  try{
    if(state.mining){await api("/api/mine/stop",{method:"POST"})}
    else{await api("/api/mine/start",{method:"POST"})}
    await sync()
  }catch(e){alert(e.message)}
};
document.getElementById("claimBtn").onclick=async()=>{
  try{await api("/api/mine/claim",{method:"POST"});await sync()}catch(e){alert(e.message)}
};
document.getElementById("upgradeBtn").onclick=async()=>{
  const n=nextLevel(); if(!n)return;
  if(Number(state.walletPers||0)<Number(n.hold||0)){alert(`You need to hold ${fmt(n.hold,0)} PERS in your connected wallet.`);return}
  try{await api("/api/level/upgrade",{method:"POST",body:JSON.stringify({level:n.level,wallet:connectedWallet})});await sync()}catch(e){alert(e.message)}
};

document.getElementById("shareBtn").onclick=()=>{
  const me=user();if(!me.id)return;
  const link=`https://t.me/Pirouzi6_bot?startapp=ref_${me.id}`;
  const share=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("🏛️ Join PERSEPOLIS Mining")}`;
  tg?.openTelegramLink?tg.openTelegramLink(share):location.href=share;
};

function setupTrade(){
  const pay=document.getElementById("payInput"),receive=document.getElementById("receiveInput");
  pay.oninput=()=>{ const sell=document.getElementById("tradeTitle").textContent.includes("SELL"); receive.value=(sell?(Number(pay.value||0)/100000):(Number(pay.value||0)*100000)).toLocaleString("en-US"); };
  document.getElementById("buyBtn").onclick=()=>{document.getElementById("tradeTitle").textContent="BUY PERS";document.getElementById("tradeAction").textContent="BUY PERS";pay.value=10;pay.oninput();};
  document.getElementById("sellBtn").onclick=()=>{document.getElementById("tradeTitle").textContent="SELL PERS";document.getElementById("tradeAction").textContent="SELL PERS";pay.value=100000;pay.oninput();};
  document.getElementById("tradeAction").onclick=()=>alert("Swap execution is intentionally locked until the existing GRAM-PERS LP is verified.");
  document.getElementById("sendBtn").onclick=openWithdraw;
  document.getElementById("receiveBtn").onclick=()=>alert(connectedWallet?`Your connected TON wallet:\n${connectedWallet}`:"Connect a TON wallet first.");
}
async function openWithdraw(){
  if(!connectedWallet){alert("Connect your TON wallet first.");return}
  document.getElementById("withdrawAvailable").textContent=`${fmt(state.saved)} PERS`;
  document.getElementById("withdrawModal").style.display="flex";
}
document.getElementById("withdrawCancel").onclick=()=>document.getElementById("withdrawModal").style.display="none";
document.getElementById("withdrawConfirm").onclick=async()=>{
  const amount=Number(document.getElementById("withdrawAmount").value||0);
  try{await api("/api/withdraw",{method:"POST",body:JSON.stringify({amount,wallet:connectedWallet})});alert("Withdrawal request submitted.");document.getElementById("withdrawModal").style.display="none";await sync()}catch(e){alert(e.message)}
};

async function initTon(){
  if(!window.TON_CONNECT_UI)return;
  try{
    tonUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:`${API}/tonconnect-manifest.json?v=10`,buttonRootId:"ton-connect"});
    tonUI.onStatusChange(async wallet=>{
      connectedWallet=wallet?.account?.address||"";
      if(connectedWallet){try{await api("/api/wallet/bind",{method:"POST",body:JSON.stringify({wallet:connectedWallet})})}catch(e){console.warn(e.message)}}
      await sync();
    });
  }catch(e){console.error("TON Connect",e)}
}
setupTrade(); sync(); initTon();
setInterval(()=>render(),1000);
setInterval(()=>{if(Date.now()-lastServerSync>30000)sync()},10000);
