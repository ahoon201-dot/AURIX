const tg = window.Telegram?.WebApp;

tg?.ready();
tg?.expand();

const KEY = "persepolis-v2";

const API =
  "https://persepolis.ahoon201.workers.dev";

let miners = [
  {
    level: 1,
    hold: 0,
    speed: 1
  }
];

let connectedWallet = "";

let state =
  JSON.parse(
    localStorage.getItem(KEY) || "null"
  ) ||
  {
    saved: 0,
    mined: 0,
    level: 1,
    last: Date.now()
  };


/* =========================
   SAVE
========================= */

function save(){

  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );
}


/* =========================
   FORMAT
========================= */

function fmt(n, d = 4){

  return Number(n || 0)
    .toFixed(d);
}


/* =========================
   LOAD 400 LEVELS
========================= */

async function loadLevels(){

  try{

    const response =
      await fetch(
        `${API}/api/levels?ts=${Date.now()}`
      );

    const result =
      await response.json();

    if(
      result.ok &&
      Array.isArray(result.levels) &&
      result.levels.length === 400
    ){

      miners =
        result.levels;

      if(state.level < 1)
        state.level = 1;

      if(state.level > 400)
        state.level = 400;

      save();

      render();

      console.log(
        "PERSEPOLIS: 400 levels loaded"
      );

    }else{

      console.error(
        "Invalid levels response",
        result
      );
    }

  }catch(error){

    console.error(
      "Failed to load levels",
      error
    );
  }
}


/* =========================
   MINING
========================= */

function accrue(){

  if(!miners.length)
    return;

  const now =
    Date.now();

  const elapsed =
    Math.max(
      0,
      now -
      (state.last || now)
    );

  const miner =
    miners[state.level - 1] ||
    miners[0];

  state.mined +=
    elapsed /
    3600000 *
    Number(miner.speed || 1);

  state.last =
    now;

  save();
}


/* =========================
   MAIN RENDER
========================= */

function render(){

  if(!miners.length)
    return;

  accrue();

  const m =
    miners[state.level - 1] ||
    miners[0];

  const next =
    miners[state.level] ||
    null;


  const savedEl =
    document.querySelector("#saved");

  if(savedEl)
    savedEl.textContent =
      fmt(state.saved);


  const earnedEl =
    document.querySelector("#earned");

  if(earnedEl)
    earnedEl.textContent =
      fmt(state.mined);


  const levelEl =
    document.querySelector("#level");

  if(levelEl)
    levelEl.textContent =
      state.level;


  const speedEl =
    document.querySelector("#speed");

  if(speedEl)
    speedEl.textContent =
      Number(m.speed || 0)
        .toFixed(2);


  const nextCostEl =
    document.querySelector("#nextCost");

  if(nextCostEl){

    nextCostEl.textContent =
      next
        ? fmt(next.hold)
        : "MAX";
  }


  const firstName =
    tg?.initDataUnsafe?.user?.first_name ||
    "Miner";


  const nameEl =
    document.querySelector("#name");

  if(nameEl){

    nameEl.innerHTML =
      `${firstName} <span>✓</span>`;
  }


  const name2El =
    document.querySelector("#name2");

  if(name2El)
    name2El.textContent =
      firstName;


  const uidEl =
    document.querySelector("#uid");

  if(uidEl){

    uidEl.textContent =
      tg?.initDataUnsafe?.user?.id
        ? `Telegram ID: ${tg.initDataUnsafe.user.id}`
        : "Telegram user";
  }


  renderMiners();
}


/* =========================
   MINERS — 400 LEVELS
========================= */

function renderMiners(){

  const grid =
    document.querySelector(
      "#minerGrid"
    );

  if(!grid)
    return;

  grid.innerHTML = "";


  miners.forEach((m, i)=>{

    const level =
      Number(m.level || i + 1);

    const hold =
      Number(m.hold || 0);

    const speed =
      Number(m.speed || 0);


    const active =
      state.level >= level;

    const nextLevel =
      level === state.level + 1;

    const locked =
      level > state.level;


    const card =
      document.createElement("div");


    card.className =
      "miner " +
      (
        active
          ? "active"
          : "locked"
      );


    let buttonText;


    if(active){

      buttonText =
        "ACTIVE";

    }else if(nextLevel){

      buttonText =
        `HOLD ${fmt(hold,0)} PERS`;

    }else{

      buttonText =
        `LVL ${level}`;
    }


    card.innerHTML = `
      <span class="lvl">
        LVL ${level}
      </span>

      <div class="price">
        ${
          hold === 0
            ? "FREE"
            : fmt(hold,0)
        }

        <small>PERS HOLD</small>
      </div>

      <div class="mspeed">
        SPEED

        <b>
          ${speed.toFixed(2)} PERS/h
        </b>
      </div>

      <button>
        ${buttonText}
      </button>
    `;


    const btn =
      card.querySelector(
        "button"
      );


    if(nextLevel){

      btn.onclick = ()=>{

        /*
          IMPORTANT:
          PERS IS NOT SPENT.

          The current saved balance is used
          only as the holding requirement
          for this stage.
        */

        if(
          Number(state.saved) <
          hold
        ){

          alert(
            `You need to hold ${fmt(
              hold,
              0
            )} PERS to unlock LVL ${level}.`
          );

          return;
        }


        state.level =
          level;

        state.last =
          Date.now();

        save();

        render();
      };
    }


    if(locked){

      btn.disabled =
        true;
    }


    grid.appendChild(
      card
    );

  });
}


/* =========================
   CLAIM
========================= */

const claimBtn =
  document.querySelector(
    "#claim"
  );


if(claimBtn){

  claimBtn.onclick = ()=>{

    accrue();

    state.saved +=
      state.mined;

    state.mined =
      0;

    state.last =
      Date.now();

    save();

    render();
  };
}


/* =========================
   NAVIGATION
========================= */

document
  .querySelectorAll(".nav")
  .forEach(btn=>{

    btn.onclick = ()=>{

      const tab =
        btn.dataset.tab;


      document
        .querySelectorAll(".nav")
        .forEach(x=>{

          x.classList.toggle(
            "active",
            x === btn
          );

        });


      document
        .querySelectorAll(".panel")
        .forEach(x=>{

          x.classList.toggle(
            "active",
            x.id === tab
          );

        });


      const mine =
        document.querySelector(
          "#mine"
        );

      if(mine){

        mine.style.display =
          tab === "mine"
            ? "block"
            : "none";
      }

    };

  });


/* =========================
   TASK REWARDS
========================= */

document
  .querySelectorAll(
    "[data-reward]"
  )
  .forEach(btn=>{

    btn.onclick = ()=>{

      state.saved +=
        Number(
          btn.dataset.reward
        );

      save();

      render();

      btn.disabled =
        true;

      btn.textContent =
        "CLAIMED";
    };

  });


/* =========================
   REFERRAL
========================= */

function inviteFriends(){

  const userId =
    tg?.initDataUnsafe?.user?.id ||
    "miner";


  const inviteUrl =
    `https://t.me/Pirouzi6_bot?startapp=ref_${userId}`;


  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(
      inviteUrl
    )}&text=${encodeURIComponent(
      "🚀 Join PERSEPOLIS Mining"
    )}`;


  if(tg?.openTelegramLink){

    tg.openTelegramLink(
      shareUrl
    );

  }else{

    window.open(
      shareUrl,
      "_blank"
    );

  }
}


const shareBtn =
  document.querySelector(
    "#share2"
  );


if(shareBtn){

  shareBtn.onclick =
    inviteFriends;
}


/* =========================
   TON CONNECT
========================= */

async function initTon(){

  if(!window.TON_CONNECT_UI)
    return;


  try{

    const tonConnectUI =
      new TON_CONNECT_UI.TonConnectUI({

        manifestUrl:
          `${API}/tonconnect-manifest.json?v=6`,

        buttonRootId:
          "ton-connect"

      });


    tonConnectUI.onStatusChange(
      wallet=>{

        const el =
          document.querySelector(
            "#walletAddress"
          );


        if(
          wallet?.account?.address
        ){

          connectedWallet =
            wallet.account.address;


          const a =
            wallet.account.address;


          if(el){

            el.textContent =
              a.slice(0,6) +
              "..." +
              a.slice(-6);

          }

        }else{

          connectedWallet =
            "";


          if(el){

            el.textContent =
              "CONNECT WALLET";

          }

        }

      }
    );


  }catch(error){

    console.error(
      "TON Connect error",
      error
    );

  }
}


/* =========================
   WITHDRAW MODAL
========================= */

const withdrawModal =
  document.createElement(
    "div"
  );


withdrawModal.id =
  "withdrawModal";


withdrawModal.innerHTML = `

  <div class="withdraw-box">

    <h2>
      Withdraw PERS
    </h2>

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

      <button
        id="withdrawCancel"
      >
        CANCEL
      </button>


      <button
        id="withdrawConfirm"
      >
        CONFIRM
      </button>

    </div>

  </div>
`;


document.body.appendChild(
  withdrawModal
);


/* =========================
   OPEN WITHDRAW
========================= */

const withdrawBtn =
  document.querySelector(
    "#withdrawBtn"
  );


if(withdrawBtn){

  withdrawBtn.onclick = ()=>{

    accrue();


    const available =
      document.querySelector(
        "#withdrawAvailable"
      );


    if(available){

      available.textContent =
        fmt(state.saved) +
        " PERS";

    }


    withdrawModal.style.display =
      "flex";

  };

}


/* =========================
   CANCEL WITHDRAW
========================= */

const withdrawCancel =
  document.querySelector(
    "#withdrawCancel"
  );


if(withdrawCancel){

  withdrawCancel.onclick =
    ()=>{

      withdrawModal.style.display =
        "none";

    };

}


/* =========================
   CONFIRM WITHDRAW
========================= */

const withdrawConfirm =
  document.querySelector(
    "#withdrawConfirm"
  );


if(withdrawConfirm){

  withdrawConfirm.onclick =
    async ()=>{

      const input =
        document.querySelector(
          "#withdrawAmount"
        );


      const amount =
        Number(
          input?.value || 0
        );


      if(
        !amount ||
        amount < 10
      ){

        alert(
          "Minimum withdrawal is 10 PERS."
        );

        return;
      }


      accrue();


      if(
        amount >
        state.saved
      ){

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
            `${API}/withdraw`,
            {
              method:
                "POST",

              headers:{
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  amount:
                    amount,

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


        if(input)
          input.value =
            "";


        withdrawModal.style.display =
          "none";


      }catch(error){

        console.error(
          error
        );


        alert(
          "Connection error. Please try again."
        );

      }

    };

}


/* =========================
   START
========================= */

render();

initTon();

loadLevels();


/* =========================
   LIVE MINING
========================= */

setInterval(
  render,
  1000
);
