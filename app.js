const tg=window.Telegram?.WebApp;
tg?.ready(); tg?.expand();

const API="https://persepolis.ahoon201.workers.dev";
const MAX_ENERGY=200;
const FALLBACK_LEVELS=Array.from({length:400},(_,i)=>{
  const level=i+1,t=(level-1)/399;
  const hold=level===1?0:Math.round(100+Math.pow(t,1.42)*149900);
  let speed=level<=12?1+((level-1)/11)*124.6:125.6+Math.pow((level-12)/388,1.15)*374.4;
  if(level===12)speed=125.6;
  if(level===400)speed=500;
  return {level,hold,speed:Number(speed.toFixed(2))};
});

let state=null,levels=[],connectedWallet="",tonUI=null,lastSync=0,tradeMode="buy";

function fmt(n,d=2){return Number(n||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}
function me(){return tg?.initDataUnsafe?.user||{}}
function headers(){return {"Content-Type":"application/json","X-Telegram-Init-Data":tg?.initData||""}}
async function api(path,options={}){
  const r=await fetch(API+path,{...options,headers:{...headers(),...(options.headers||{})},cache:"no-store"});
  let j={};try{j=await r.json()}catch{}
  if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}
function cur(){return levels[(state?.level||1)-1]||FALLBACK_LEVELS[(state?.level||1)-1]}
function next(){return levels[state?.level||1]||FALLBACK_LEVELS[state?.level||1]}
function liveMined(){
  if(!state?.mining||!state?.lastMineAt)return Number(state?.mined||0);
  const elapsed=Math.min(8*3600,Math.max(0,(Date.now()-Number(state.lastMineAt))/1000));
  return Number(state.mined||0)+elapsed*(cur()?.speed||1)/3600;
}
function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v}

function render(){
  if(!state)return;
  const u=me(),c=cur(),n=next(),lm=liveMined(),wallet=Number(state.walletPers||0);
  const energy=Math.max(0,Math.min(MAX_ENERGY,Number(state.energy??MAX_ENERGY)));
  const target=Number(n?.hold||0);
  const progress=target>0?Math.max(0,Math.min(100,(wallet/target)*100)):100;

  set("homeName",(u.first_name||"Miner")+" ✓");
  set("homeLevel",state.level);
  set("homeLevel2",state.level);
  set("homeStatus",state.mining?"MINING":"READY");
  set("homeNextHold",fmt(Math.max(0,target-wallet),0));
  set("saved",fmt(state.saved));
  set("mined",fmt(lm));
  set("homeRate",Number(c?.speed||1).toFixed(2));
  set("homeRate2",Number(c?.speed||1).toFixed(2));
  set("mineTimer",state.mining?new Date(Math.min(28800,Math.floor((Date.now()-Number(state.lastMineAt||Date.now()))/1000))*1000).toISOString().slice(11,19):"07:58:24");
  set("energyBig",Math.floor(energy));
  set("walletPers",fmt(wallet));
  set("walletPers2",fmt(wallet));
  set("walletTotal",`${fmt(wallet)} PERS`);
  set("upgradeLevel",state.level);
  set("energy",`${Math.floor(energy)} / ${MAX_ENERGY}`);
  set("profileName",u.first_name||"Miner");
  set("profileId",u.id?`Telegram ID ${u.id}`:"Telegram");
  set("profileLevel",`LEVEL ${state.level}`);
  set("totalEarned",`${fmt(Number(state.saved||0)+lm)} PERS`);
  set("profileRef",`${fmt(state.referralEarned||0,0)} PERS`);
  set("invited",state.referrals||0);
  set("refEarned",fmt(state.referralEarned||0,0));
  set("refCount",`${state.referrals||0} ACTIVE`);
  set("levelBalance",fmt(wallet,0));
  set("levelTarget",fmt(target,0));

  const ring=document.getElementById("energyRing");
  if(ring)ring.style.background=`conic-gradient(#ef1b16 0deg ${Math.round((energy/MAX_ENERGY)*360)}deg,#3c1210 ${Math.round((energy/MAX_ENERGY)*360)}deg 360deg)`;
  const bar=document.getElementById("levelProgress");
  if(bar)bar.style.width=`${progress}%`;

  const chip=document.getElementById("walletChip");
  if(chip)chip.textContent=connectedWallet?connectedWallet.slice(0,6)+"..."+connectedWallet.slice(-5):"CONNECT WALLET";
  set("walletTon",connectedWallet?connectedWallet.slice(0,6)+"..."+connectedWallet.slice(-5):"CONNECT WALLET");

  const link=document.getElementById("refLink");
  if(link)link.textContent=u.id?`https://t.me/Pirouzi6_bot?startapp=ref_${u.id}`:"Connect Telegram to create your invite link.";

  const mb=document.getElementById("mineBtn");
  if(mb)mb.innerHTML=state.mining?'<span class="cta-icon">Ⅱ</span><span>STOP MINING</span>':'<span class="cta-icon">ϟ</span><span>START MINING</span>';
  const ub=document.getElementById("upgradeBtn");
  if(ub)ub.textContent=n?`UPGRADE TO LEVEL ${n.level}`:"LEVEL 400 REACHED";

  renderMilestones();
  renderTasks();
}

function renderMilestones(){
  const box=document.getElementById("levelMilestones");if(!box)return;
  box.innerHTML="";
  [1,5,12,25,50,100,200,300,400].forEach(l=>{
    const x=levels[l-1]||FALLBACK_LEVELS[l-1];
    box.insertAdjacentHTML("beforeend",`<div class="milestone"><span>LEVEL ${l}</span><b>${fmt(x.hold,0)} PERS</b><span>${Number(x.speed).toFixed(2)} PERS/h</span></div>`);
  });
}
function renderTasks(){
  const box=document.getElementById("taskList");if(!box)return;
  const tasks=[["daily","🎁","Check in daily",500],["telegram","✈️","Join Telegram",1000],["x","𝕏","Follow X",1000],["invite3","♙","Invite 3 friends",5000],["watch","▶","Watch video",1000],["swap","↔","Swap PERS",2000]];
  const done=state?.tasks||[];
  box.innerHTML=tasks.map(t=>{
    const key=t[0]==="daily"?`daily:${new Date().toISOString().slice(0,10)}`:t[0];
    const claimed=done.includes(key)||done.includes(t[0]);
    return `<div class="task"><div>${t[1]} ${t[2]}<small>+${t[3].toLocaleString()} PERS</small></div><button class="${claimed?"done":""}" data-task="${t[0]}">${claimed?"CLAIMED":"CLAIM"}</button></div>`;
  }).join("");
  box.querySelectorAll("[data-task]").forEach(b=>b.onclick=()=>claimTask(b.dataset.task));
}
async function claimTask(id){try{await api("/api/tasks/claim",{method:"POST",body:JSON.stringify({taskId:id})});await sync()}catch(e){alert(e.message)}}

async function sync(){
  try{
    const j=await api("/api/bootstrap",{method:"POST",body:JSON.stringify({ref:tg?.initDataUnsafe?.start_param||"",wallet:connectedWallet})});
    state=j.state;
    levels=j.levels?.length?j.levels:FALLBACK_LEVELS;
    lastSync=Date.now();
    render();
  }catch(e){
    console.warn(e);
    if(!state){
      state={level:1,saved:0,mined:0,walletPers:0,energy:200,mining:false,lastMineAt:null,referrals:0,referralEarned:0,tasks:[]};
      levels=FALLBACK_LEVELS;
      render();
    }
  }
}
function show(name,btn){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+name)?.classList.add("active");
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n===btn));
  if(name==="leaderboard")loadLeaderboard();
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>show(b.dataset.screen,b));
document.getElementById("leaderboardBtn")?.addEventListener("click",()=>show("leaderboard"));
document.getElementById("masterUpgrade")?.addEventListener("click",()=>show("upgrade",document.querySelector('[data-screen="upgrade"]')));

document.getElementById("mineBtn").onclick=async()=>{
  try{await api(state.mining?"/api/mine/stop":"/api/mine/start",{method:"POST"});await sync()}
  catch(e){alert(e.message)}
};
document.getElementById("claimBtn").onclick=async()=>{
  try{await api("/api/mine/claim",{method:"POST"});await sync()}
  catch(e){alert(e.message)}
};
document.getElementById("upgradeBtn").onclick=async()=>{
  const n=next();
  if(!n)return;
  if(!connectedWallet){alert("Connect your TON wallet first.");return}
  try{await api("/api/level/upgrade",{method:"POST",body:JSON.stringify({level:n.level,wallet:connectedWallet})});await sync()}
  catch(e){alert(e.message)}
};

document.querySelectorAll(".boost-card").forEach(b=>b.onclick=()=>{
  const kind=b.dataset.boost;
  if(kind==="energy"){
    if(state){state.energy=Math.min(MAX_ENERGY,Number(state.energy||0)+50);render()}
    alert("Energy boost selected. Final boost inventory can be wired server-side when the boost economy is enabled.");
  }else if(kind==="speed"){
    alert("2× Speed boost selected. Final boost inventory can be wired server-side when the boost economy is enabled.");
  }else{
    alert("Auto Mining selected. Final boost inventory can be wired server-side when the boost economy is enabled.");
  }
});

document.getElementById("shareBtn").onclick=()=>{
  const id=me().id;
  if(!id){alert("Open this app from Telegram first.");return}
  const link=`https://t.me/Pirouzi6_bot?startapp=ref_${id}`;
  const url=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("🏛️ Join PERSEPOLIS Mining")}`;
  tg?.openTelegramLink?tg.openTelegramLink(url):location.href=url;
};

function setTrade(mode){
  tradeMode=mode;
  document.getElementById("tradeBuy").classList.toggle("active",mode==="buy");
  document.getElementById("tradeSell").classList.toggle("active",mode==="sell");
  set("tradeTitle",mode==="buy"?"BUY PERS":"SELL PERS");
  document.getElementById("tradeAction").textContent=mode==="buy"?"BUY PERS":"SELL PERS";
  updateTrade();
}
function updateTrade(){
  document.getElementById("receiveInput").value="—";
}
document.getElementById("tradeBuy").onclick=()=>setTrade("buy");
document.getElementById("tradeSell").onclick=()=>setTrade("sell");
document.getElementById("payInput").oninput=updateTrade;
document.getElementById("buyBtn").onclick=()=>{show("wallet",document.querySelector('[data-screen="wallet"]'));setTrade("buy")};
document.getElementById("sellBtn").onclick=()=>{show("wallet",document.querySelector('[data-screen="wallet"]'));setTrade("sell")};
document.getElementById("tradeAction").onclick=()=>alert("Live swap is disabled until the verified PERS liquidity route is configured.");
document.getElementById("sendBtn").onclick=()=>openWithdraw();
document.getElementById("receiveBtn").onclick=()=>alert(connectedWallet?`TON wallet:\n${connectedWallet}`:"Connect a TON wallet first.");

function openWithdraw(){
  if(!connectedWallet){alert("Connect your TON wallet first.");return}
  set("withdrawAvailable",`${fmt(state.saved)} PERS`);
  document.getElementById("withdrawModal").style.display="flex";
}
document.getElementById("withdrawCancel").onclick=()=>document.getElementById("withdrawModal").style.display="none";
document.getElementById("withdrawConfirm").onclick=async()=>{
  const amount=Number(document.getElementById("withdrawAmount").value||0);
  try{
    await api("/api/withdraw",{method:"POST",body:JSON.stringify({amount,wallet:connectedWallet})});
    document.getElementById("withdrawModal").style.display="none";
    alert("Withdrawal request submitted.");
    await sync();
  }catch(e){alert(e.message)}
};

async function loadLeaderboard(){
  const box=document.getElementById("leaderboardList");
  box.innerHTML="<div class='task'>Loading…</div>";
  try{
    const j=await api("/api/leaderboard");
    box.innerHTML=(j.rows||[]).map((r,i)=>`<div class="leader-row"><span>#${i+1}</span><strong>${esc(r.first_name||r.username||"Miner")}</strong><span class="leader-level">LVL ${r.level||1}</span><b>${fmt(r.total,0)}</b></div>`).join("")||"<div class='task'>No data yet.</div>";
  }catch(e){box.innerHTML=`<div class='task'>${esc(e.message)}</div>`}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}

async function initTon(){
  if(!window.TON_CONNECT_UI)return;
  try{
    tonUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:`${API}/tonconnect-manifest.json?v=12`,buttonRootId:"ton-connect"});
    tonUI.onStatusChange(async w=>{
      connectedWallet=w?.account?.address||"";
      if(connectedWallet){
        try{await api("/api/wallet/bind",{method:"POST",body:JSON.stringify({wallet:connectedWallet})})}
        catch(e){console.warn(e)}
      }
      await sync();
    });
  }catch(e){console.error(e)}
}

setTrade("buy");
sync();
initTon();
setInterval(render,1000);
setInterval(()=>{if(Date.now()-lastSync>30000)sync()},10000);
