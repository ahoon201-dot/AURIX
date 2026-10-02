const tg=window.Telegram?.WebApp; tg?.ready(); tg?.expand();
const key="persepolis-demo";
let state=JSON.parse(localStorage.getItem(key)||"null")||{balance:0,level:1,last:Date.now()};
const miners=[{cost:0,speed:1},{cost:100,speed:2},{cost:500,speed:5},{cost:2000,speed:12},{cost:10000,speed:30},{cost:50000,speed:80},{cost:200000,speed:220},{cost:1000000,speed:600}];
function speed(){return miners[state.level-1]?.speed||1}
function accrue(){const now=Date.now();state.balance+=((now-state.last)/3600000)*speed();state.last=now;save()}
function save(){localStorage.setItem(key,JSON.stringify(state))}
function render(){
  document.getElementById("balance").textContent=state.balance.toFixed(4);
  document.getElementById("holding").textContent=state.balance.toFixed(4)+" PERS";
  document.getElementById("pool").textContent=(state.balance*.02).toFixed(4)+" PERS";
  document.getElementById("level").textContent=state.level;
  document.getElementById("speed").textContent=speed().toFixed(2);
  document.getElementById("speed2").textContent=speed().toFixed(2)+" PERS/h";
  document.getElementById("next").textContent=(miners[state.level]?.cost||"MAX")+" PERS";
  document.getElementById("earned").textContent=((Date.now()-state.last)/3600000*speed()).toFixed(4);
}
function renderMiners(){
  const box=document.getElementById("minerGrid"); box.innerHTML="";
  miners.forEach((m,i)=>{
    const lvl=i+1, active=lvl===state.level, locked=lvl>state.level+1;
    const el=document.createElement("div"); el.className="miner "+(active?"active ":"")+(locked?"locked":"");
    el.innerHTML=`<span class="lvl">LVL ${lvl}</span><div class="price">${m.cost?m.cost.toLocaleString():"FREE"} <small>PERS</small></div><div class="mspeed">Speed <b>${m.speed} PERS/h</b></div><button>${active?"ACTIVE":locked?"🔒 LOCKED":`⚡ NEED ${m.cost.toLocaleString()} PERS`}</button>`;
    if(!locked&&!active) el.querySelector("button").onclick=()=>{accrue();if(state.balance>=m.cost){state.balance-=m.cost;state.level=lvl;save();render();renderMiners();}};
    box.appendChild(el);
  });
}
document.getElementById("claim").onclick=()=>{accrue();alert("PERS claimed in demo mode.");state.balance=0;save();render()};
document.getElementById("buy").onclick=()=>alert("Buy PERS will be connected to the Solana token Mint/Swap after the real PERS token is created. This demo does not process payments.");
document.getElementById("share").onclick=()=>{const u=tg?.initDataUnsafe?.user;const link=location.href+"?ref="+(u?.id||"miner");if(navigator.share)navigator.share({title:"PERSEPOLIS",text:"Join PERSEPOLIS Mining",url:link});else navigator.clipboard?.writeText(link);};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));document.getElementById(b.dataset.tab).classList.add("active")});
const u=tg?.initDataUnsafe?.user;if(u){document.getElementById("name").textContent=u.first_name||"Miner";document.getElementById("uid").textContent="@"+(u.username||u.id);document.getElementById("wallet").textContent="TG WALLET";}
setInterval(()=>{accrue();render()},1000); render(); renderMiners();
