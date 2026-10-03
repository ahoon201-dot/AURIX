const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const KEY = "persepolis-v2";
const miners = [
  {cost:0,speed:1},{cost:100,speed:2},{cost:500,speed:5},
  {cost:2000,speed:12},{cost:10000,speed:30},{cost:50000,speed:80},
  {cost:200000,speed:220},{cost:1000000,speed:600}
];

let state = JSON.parse(localStorage.getItem(KEY) || "null") ||
  {saved:0,mined:0,level:1,last:Date.now()};

function save(){localStorage.setItem(KEY,JSON.stringify(state));}

function accrue(){
  const now = Date.now();
  const elapsed = Math.max(0, now - (state.last || now));
  state.mined += elapsed / 3600000 * miners[state.level-1].speed;
  state.last = now;
  save();
}

function fmt(n,d=4){return Number(n||0).toFixed(d);}

function render(){
  accrue();
  const m = miners[state.level-1];
  const next = miners[state.level] || null;
  document.querySelector("#saved").textContent = fmt(state.saved);
  document.querySelector("#earned").textContent = fmt(state.mined);
  document.querySelector("#level").textContent = state.level;
  document.querySelector("#speed").textContent = m.speed.toFixed(2);
  document.querySelector("#nextCost").textContent = next ? fmt(next.cost) : "MAX";
  document.querySelector("#name").innerHTML =
    `${tg?.initDataUnsafe?.user?.first_name || "Miner"} <span>✓</span>`;
  document.querySelector("#name2").textContent =
    tg?.initDataUnsafe?.user?.first_name || "Miner";
  document.querySelector("#uid").textContent =
    tg?.initDataUnsafe?.user?.id ? `Telegram ID: ${tg.initDataUnsafe.user.id}` : "Telegram user";
  renderMiners();
}

function renderMiners(){
  const grid=document.querySelector("#minerGrid");
  grid.innerHTML="";
  miners.forEach((m,i)=>{
    const unlocked=state.level>=i+1;
    const card=document.createElement("div");
    card.className="miner "+(unlocked?"active":"locked");
    card.innerHTML=`
      <span class="lvl">LVL ${i+1}</span>
      <div class="price">${m.cost===0?"FREE":fmt(m.cost,0)} <small>PERS</small></div>
      <div class="mspeed">SPEED <b>${m.speed.toFixed(2)} PERS/h</b></div>
      <button>${unlocked?"ACTIVE":`UNLOCK ${fmt(m.cost,0)} PERS`}</button>`;
    const btn=card.querySelector("button");
    if(!unlocked) btn.onclick=()=>{
      if(state.saved < m.cost) return alert("Not enough saved PERS.");
      state.saved-=m.cost;
      state.level=i+1;
      state.last=Date.now();
      save(); render();
    };
    grid.appendChild(card);
  });
}

document.querySelector("#claim").onclick=()=>{
  accrue();
  state.saved += state.mined;
  state.mined=0;
  state.last=Date.now();
  save(); render();
};

document.querySelectorAll(".nav").forEach(btn=>{
  btn.onclick=()=>{
    const tab=btn.dataset.tab;
    document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x===btn));
    document.querySelectorAll(".panel").forEach(x=>x.classList.toggle("active",x.id===tab));
    document.querySelector("#mine").style.display = tab==="mine" ? "block" : "none";
  };
});

document.querySelectorAll("[data-reward]").forEach(btn=>{
  btn.onclick=()=>{
    state.saved += Number(btn.dataset.reward);
    save(); render();
    btn.disabled=true;
    btn.textContent="CLAIMED";
  };
});

function inviteFriends(){
  const userId = tg?.initDataUnsafe?.user?.id || "miner";

  const inviteUrl =
    `https://t.me/Pirouzi6_bot?startapp=ref_${userId}`;

  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("🚀 Join PERSEPOLIS Mining")}`;

  if(tg?.openTelegramLink){
    tg.openTelegramLink(shareUrl);
  }else{
    window.open(shareUrl,"_blank");
  }
}

document.querySelector("#share2").onclick = inviteFriends;

async function initTon(){
  if(!window.TON_CONNECT_UI) return;
  try{
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl:"https://persepolis.ahoon201.workers.dev/tonconnect-manifest.json?v=3",
      buttonRootId:"ton-connect"
    });
    tonConnectUI.onStatusChange(wallet=>{
      const el=document.querySelector("#walletAddress");
      if(wallet?.account?.address){
        const a=wallet.account.address;
        el.textContent=a.slice(0,6)+"..."+a.slice(-6);
      }else{
        el.textContent="CONNECT WALLET";
      }
    });
  }catch(e){console.error(e);}
}

render();
initTon();
setInterval(render,1000);
