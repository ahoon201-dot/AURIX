const tg=window.Telegram?.WebApp; tg?.ready(); tg?.expand();
const PERS_MASTER="EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";
const TONCENTER="https://toncenter.com/api/v3/jetton/wallets";
const key="persepolis-demo-v3";
let state=JSON.parse(localStorage.getItem(key)||"null")||{balance:0,level:1,last:Date.now()};
const miners=[{cost:0,speed:1},{cost:100,speed:2},{cost:500,speed:5},{cost:2000,speed:12},{cost:10000,speed:30},{cost:50000,speed:80},{cost:200000,speed:220},{cost:1000000,speed:600}];
function speed(){return miners[state.level-1]?.speed||1}
function save(){localStorage.setItem(key,JSON.stringify(state))}
function accrue(){const now=Date.now();state.balance+=((now-state.last)/3600000)*speed();state.last=now;save()}
function shortAddress(a){return a?a.slice(0,6)+"…"+a.slice(-5):"CONNECT WALLET"}
async function loadPersBalance(address){
  if(!address)return;
  try{
    const q=new URLSearchParams({owner_address:address,jetton_address:PERS_MASTER,limit:"10"});
    const r=await fetch(TONCENTER+"?"+q.toString()); if(!r.ok)throw new Error("balance request failed");
    const data=await r.json(); const row=(data.jetton_wallets||[])[0];
    const raw=BigInt(row?.balance||0); const amount=Number(raw)/1e9;
    document.getElementById("holding").textContent=amount.toLocaleString(undefined,{maximumFractionDigits:4})+" PERS";
  }catch(e){console.error(e);document.getElementById("holding").textContent="Unavailable"}
}
function render(){
  accrue();
  document.getElementById("balance").textContent=state.balance.toFixed(4);
  document.getElementById("level").textContent=state.level;
  document.getElementById("level2").textContent=state.level;
  document.getElementById("speed").textContent=speed().toFixed(2);
  document.getElementById("speed2").textContent=speed().toFixed(2)+" PERS/h";
  const next=miners[state.level]?.cost;
  document.getElementById("next").textContent=next?next.toLocaleString()+" PERS":"MAX";
  document.getElementById("nextCost").textContent=next?next.toLocaleString():"MAX";
  document.getElementById("earned").textContent=(((Date.now()-state.last)/3600000)*speed()).toFixed(3);
}
function renderMiners(){
  const box=document.getElementById("minerGrid");box.innerHTML="";
  miners.forEach((m,i)=>{const lvl=i+1,active=lvl===state.level,locked=lvl>state.level+1;const el=document.createElement("div");el.className="miner "+(active?"active ":"")+(locked?"locked":"");el.innerHTML=`<span class="lvl">LVL ${lvl}</span><div class="price">${m.cost?m.cost.toLocaleString():"FREE"} <small>PERS</small></div><div class="mspeed">Speed <b>${m.speed} PERS/h</b></div><button>${active?"ACTIVE":locked?"🔒 LOCKED":`⚡ NEED ${m.cost.toLocaleString()} PERS`}</button>`;if(!locked&&!active)el.querySelector("button").onclick=()=>{accrue();if(state.balance>=m.cost){state.balance-=m.cost;state.level=lvl;save();render();renderMiners()}};box.appendChild(el)})
}
const tonConnectUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:location.origin+"/tonconnect-manifest.json",buttonRootId:"ton-connect"});
tonConnectUI.onStatusChange(wallet=>{const address=wallet?.account?.address||null;document.getElementById("walletAddress").textContent=shortAddress(address);if(address)loadPersBalance(address);else document.getElementById("holding").textContent="0.0000 PERS"});
function share(){const u=tg?.initDataUnsafe?.user;const link=location.href.split("?")[0]+"?ref="+(u?.id||"miner");if(navigator.share)navigator.share({title:"PERSEPOLIS",text:"Join PERSEPOLIS Mining",url:link});else navigator.clipboard?.writeText(link)}
document.getElementById("claim").onclick=()=>{accrue();alert("Mining balance claimed in app mode.");state.balance=0;save();render()};
document.getElementById("share").onclick=share;document.getElementById("share2").onclick=share;
document.querySelector(".gift").onclick=()=>switchTab("tasks");
document.querySelector(".help").onclick=()=>alert("PERSEPOLIS: mine PERS, upgrade your miner and connect your TON wallet.");
function switchTab(tab){document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));document.querySelectorAll(".panel").forEach(x=>x.classList.toggle("active",x.id===tab));document.querySelector(".hero").style.display=tab==="mine"?"block":"none"}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
const u=tg?.initDataUnsafe?.user;if(u){const nm=u.first_name||"Miner";document.getElementById("name").innerHTML=nm+" <span>✓</span>";document.getElementById("name2").textContent=nm;document.getElementById("uid").textContent="@"+(u.username||u.id)}
render();renderMiners();setInterval(render,1000);
