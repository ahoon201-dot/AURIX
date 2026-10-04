const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const KEY = "persepolis-v2";

const miners = [
  {cost:0,speed:1},
  {cost:100,speed:2},
  {cost:500,speed:5},
  {cost:2000,speed:12},
  {cost:10000,speed:30},
  {cost:50000,speed:80},
  {cost:200000,speed:220},
  {cost:1000000,speed:600}
];

let connectedWallet = "";

let state =
  JSON.parse(localStorage.getItem(KEY) || "null") ||
  {
    saved:0,
    mined:0,
    level:1,
    last:Date.now()
  };

function save(){
  localStorage.setItem(KEY, JSON.stringify(state));
}

function accrue(){
  const now = Date.now();
  const elapsed = Math.max(
    0,
    now - (state.last || now)
  );

  state.mined +=
    elapsed / 3600000 *
    miners[state.level - 1].speed;

  state.last = now;

  save();
}

function fmt(n,d=4){
  return Number(n || 0).toFixed(d);
}

function render(){

  accrue();

  const m = miners[state.level - 1];
  const next = miners[state.level] || null;

  document.querySelector("#saved").textContent =
    fmt(state.saved);

  document.querySelector("#earned").textContent =
    fmt(state.mined);

  document.querySelector("#level").textContent =
    state.level;

  document.querySelector("#speed").textContent =
    m.speed.toFixed(2);

  document.querySelector("#nextCost").textContent =
    next ? fmt(next.cost) : "MAX";

  document.querySelector("#name").innerHTML =
    `${tg?.initDataUnsafe?.user?.first_name || "Miner"} <span>✓</span>`;

  document.querySelector("#name2").textContent =
    tg?.initDataUnsafe?.user?.first_name || "Miner";

  document.querySelector("#uid").textContent =
    tg?.initDataUnsafe?.user?.id
      ? `Telegram ID: ${tg.initDataUnsafe.user.id}`
      : "Telegram user";

  renderMiners();
}

function renderMiners(){

  const grid =
    document.querySelector("#minerGrid");

  grid.innerHTML = "";

  miners.forEach((m,i)=>{

    const unlocked =
      state.level >= i + 1;

    const card =
      document.createElement("div");

    card.className =
      "miner " +
      (unlocked ? "active" : "locked");

    card.innerHTML = `
      <span class="lvl">
        LVL ${i + 1}
      </span>

      <div class="price">
        ${m.cost === 0 ? "FREE" : fmt(m.cost,0)}
        <small>PERS</small>
      </div>

      <div class="mspeed">
        SPEED
        <b>${m.speed.toFixed(2)} PERS/h</b>
      </div>

      <button>
        ${
          unlocked
            ? "ACTIVE"
            : `UNLOCK ${fmt(m.cost,0)} PERS`
        }
      </button>
    `;

    const btn =
      card.querySelector("button");

    if(!unlocked){

      btn.onclick = ()=>{

        if(state.saved < m.cost){

          alert("Not enough saved PERS.");

          return;
        }

        state.saved -= m.cost;

        state.level = i + 1;

        state.last = Date.now();

        save();

        render();
      };
    }

    grid.appendChild(card);
  });
}

document.querySelector("#claim").onclick = ()=>{

  accrue();

  state.saved += state.mined;

  state.mined = 0;

  state.last = Date.now();

  save();

  render();
};

document.querySelectorAll(".nav").forEach(btn=>{

  btn.onclick = ()=>{

    const tab = btn.dataset.tab;

    document
      .querySelectorAll(".nav")
      .forEach(x =>
        x.classList.toggle(
          "active",
          x === btn
        )
      );

    document
      .querySelectorAll(".panel")
      .forEach(x =>
        x.classList.toggle(
          "active",
          x.id === tab
        )
      );

    document.querySelector("#mine").style.display =
      tab === "mine"
        ? "block"
        : "none";
  };
});

document.querySelectorAll("[data-reward]").forEach(btn=>{

  btn.onclick = ()=>{

    state.saved +=
      Number(btn.dataset.reward);

    save();

    render();

    btn.disabled = true;

    btn.textContent = "CLAIMED";
  };
});

function inviteFriends(){

  const userId =
    tg?.initDataUnsafe?.user?.id ||
    "miner";

  const inviteUrl =
    `https://t.me/Pirouzi6_bot?startapp=ref_${userId}`;

  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("🚀 Join PERSEPOLIS Mining")}`;

  if(tg?.openTelegramLink){

    tg.openTelegramLink(shareUrl);

  }else{

    window.open(
      shareUrl,
      "_blank"
    );
  }
}

document.querySelector("#share2").onclick =
  inviteFriends;

async function initTon(){

  if(!window.TON_CONNECT_UI)
    return;

  try{

    const tonConnectUI =
      new TON_CONNECT_UI.TonConnectUI({

        manifestUrl:
          "https://persepolis.ahoon201.workers.dev/tonconnect-manifest.json?v=3",

        buttonRootId:
          "ton-connect"
      });

    tonConnectUI.onStatusChange(wallet=>{

      const el =
        document.querySelector(
          "#walletAddress"
        );

      if(wallet?.account?.address){

        connectedWallet =
          wallet.account.address;

        const a =
          wallet.account.address;

        el.textContent =
          a.slice(0,6) +
          "..." +
          a.slice(-6);

      }else{

        connectedWallet = "";

        el.textContent =
          "CONNECT WALLET";
      }
    });

  }catch(e){

    console.error(e);
  }
}

render();

initTon();

setInterval(
  render,
  1000
);


/* =========================
   WITHDRAW MODAL
========================= */

const withdrawModal =
  document.createElement("div");

withdrawModal.id =
  "withdrawModal";

withdrawModal.innerHTML = `
  <div class="withdraw-box">

    <h2>Withdraw PERS</h2>

    <p>
      Transfer Pool to Wallet
    </p>

    <div class="withdraw-info">

      <span>
        Available Pool
      </span>

      <b id="withdrawAvailable">
        0.0000 PERS
      </b>

    </div>

    <div class="withdraw-info">

      <span>
        Minimum withdrawal
      </span>

      <b>
        10 PERS
      </b>

    </div>

    <div class="withdraw-info">

      <span>
        Fee
      </span>

      <b>
        0 PERS
      </b>

    </div>

    <input
      id="withdrawAmount"
      type="number"
      placeholder="Amount PERS"
    >

    <div class="withdraw-actions">

      <button id="withdrawCancel">
        CANCEL
      </button>

      <button id="withdrawConfirm">
        CONFIRM
      </button>

    </div>

  </div>
`;

document.body.appendChild(
  withdrawModal
);


/* OPEN WITHDRAW */

document.querySelector(
  "#withdrawBtn"
).onclick = ()=>{

  accrue();

  document.querySelector(
    "#withdrawAvailable"
  ).textContent =
    fmt(state.saved) +
    " PERS";

  withdrawModal.style.display =
    "flex";
};


/* CANCEL */

document.querySelector(
  "#withdrawCancel"
).onclick = ()=>{

  withdrawModal.style.display =
    "none";
};


/* CONFIRM WITHDRAW */

document.querySelector(
  "#withdrawConfirm"
).onclick = async ()=>{

  const amount =
    Number(
      document.querySelector(
        "#withdrawAmount"
      ).value
    );

  if(!amount || amount < 10){

    alert(
      "Minimum withdrawal is 10 PERS."
    );

    return;
  }

  accrue();

  if(amount > state.saved){

    alert(
      "Insufficient PERS balance."
    );

    return;
  }

  if(!connectedWallet){

    alert(
      "Please connect your TON wallet first."
    );

    return;
  }

  try{

    const response =
      await fetch(
        "https://persepolis.ahoon201.workers.dev/withdraw",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            amount:amount,

            wallet:
              connectedWallet,

            telegramId:
              tg?.initDataUnsafe?.user?.id ||
              ""
          })
        }
      );

    const result =
      await response.json();

    if(!result.ok){

      alert(
        result.error ||
        "Withdrawal failed."
      );

      return;
    }

    alert(
      `Withdrawal request received.\n\n` +
      `${amount} PERS\n\n` +
      `Status: Pending`
    );

    document.querySelector(
      "#withdrawAmount"
    ).value = "";

    withdrawModal.style.display =
      "none";

  }catch(error){

    console.error(error);

    alert(
      "Connection error. Please try again."
    );
  }
};
