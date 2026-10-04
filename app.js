const tg = window.Telegram?.WebApp;

tg?.ready();
tg?.expand();

const KEY = "persepolis-v2";
const API = "https://persepolis.ahoon201.workers.dev";

const PERS_MASTER =
  "EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";

const TONAPI = "https://tonapi.io/v2";

let miners = [
  {
    level: 1,
    hold: 0,
    speed: 1
  }
];

let connectedWallet = "";
let walletPersBalance = 0;
let walletBalanceLoading = false;

let state =
  JSON.parse(
    localStorage.getItem(KEY) || "null"
  ) || {
    saved: 0,
    mined: 0,
    level: 1,
    last: Date.now()
  };

function save(){
  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );
}

function fmt(n, d = 4){
  return Number(n || 0).toFixed(d);
}


/* =========================
   400 LEVELS
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

      miners = result.levels;

      if(state.level < 1)
        state.level = 1;

      if(state.level > 400)
        state.level = 400;

      save();
      render();

      console.log(
        "PERSEPOLIS: 400 levels loaded"
      );

    }

  }catch(error){

    console.error(
      "Levels error:",
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

  const now = Date.now();

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
    Number(
      miner.speed || 1
    );

  state.last = now;
}


/* =========================
   REAL PERS BALANCE
========================= */

async function loadWalletPersBalance(){

  if(!connectedWallet){

    walletPersBalance = 0;
    return;

  }

  if(walletBalanceLoading)
    return;

  walletBalanceLoading = true;

  try{

    const address =
      String(
        connectedWallet
      ).trim();

    const response =
      await fetch(
        `${TONAPI}/accounts/${encodeURIComponent(
          address
        )}/jettons`
      );

    if(!response.ok)
      throw new Error(
        `TONAPI ${response.status}`
      );

    const data =
      await response.json();

    const balances =
      Array.isArray(data.balances)
        ? data.balances
        : [];

    let found = null;

    for(const item of balances){

      const master =
        item?.jetton?.address || "";

      if(
        master === PERS_MASTER
      ){

        found = item;
        break;

      }

    }

    if(found){

      const raw =
        BigInt(
          String(
            found.balance || "0"
          )
        );

      const decimals =
        Number(
          found?.jetton?.decimals ?? 9
        );

      walletPersBalance =
        Number(raw) /
        Math.pow(
          10,
          decimals
        );

    }else{

      walletPersBalance = 0;

    }

    console.log(
      "REAL PERS:",
      walletPersBalance
    );

    renderMiners();

  }catch(error){

    console.error(
      "PERS balance error:",
      error
    );

  }finally{

    walletBalanceLoading = false;

  }

}


/* =========================
   MAIN RENDER
========================= */

function render(){

  if(!miners.length)
    return;

  accrue();

  const miner =
    miners[state.level - 1] ||
    miners[0];

  const next =
    miners[state.level] ||
    null;

  const saved =
    document.querySelector(
      "#saved"
    );

  if(saved)
    saved.textContent =
      fmt(state.saved);

  const earned =
    document.querySelector(
      "#earned"
    );

  if(earned)
    earned.textContent =
      fmt(state.mined);

  const level =
    document.querySelector(
      "#level"
    );

  if(level)
    level.textContent =
      state.level;

  const speed =
    document.querySelector(
      "#speed"
    );

  if(speed)
    speed.textContent =
      Number(
        miner.speed || 0
      ).toFixed(2);

  const nextCost =
    document.querySelector(
      "#nextCost"
    );

  if(nextCost){

    nextCost.textContent =
      next
        ? fmt(next.hold, 0)
        : "MAX";

  }

  const firstName =
    tg?.initDataUnsafe?.user?.first_name ||
    "Miner";

  const name =
    document.querySelector(
      "#name"
    );

  if(name){

    name.innerHTML =
      `${firstName} <span>✓</span>`;

  }

  const name2 =
    document.querySelector(
      "#name2"
    );

  if(name2)
    name2.textContent =
      firstName;

  const uid =
    document.querySelector(
      "#uid"
    );

  if(uid){

    uid.textContent =
      tg?.initDataUnsafe?.user?.id
        ? `Telegram ID: ${tg.initDataUnsafe.user.id}`
        : "Telegram user";

  }

  renderMiners();
}


/* =========================
   MINERS
========================= */

function renderMiners(){

  const grid =
    document.querySelector(
      "#minerGrid"
    );

  if(!grid)
    return;

  grid.innerHTML = "";

  miners.forEach(
    (m, i) => {

      const level =
        Number(
          m.level || i + 1
        );

      const hold =
        Number(
          m.hold || 0
        );

      const speed =
        Number(
          m.speed || 0
        );

      const active =
        state.level >= level;

      const nextLevel =
        level ===
        state.level + 1;

      const locked =
        level > state.level;

      const card =
        document.createElement(
          "div"
        );

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
          `HOLD ${fmt(
            hold,
            0
          )} PERS`;

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
              : fmt(hold, 0)
          }

          <small>
            PERS HOLD
          </small>

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

      const button =
        card.querySelector(
          "button"
        );

      if(nextLevel){

        button.onclick =
          () => {

            openLevelModal(
              level,
              hold
            );

          };

      }

      if(
        locked &&
        !nextLevel
      ){

        button.disabled = true;

      }

      grid.appendChild(card);

    }
  );

}


/* =========================
   LEVEL MODAL
========================= */

function createLevelModal(){

  if(
    document.querySelector(
      "#levelModal"
    )
  )
    return;

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "levelModal";

  modal.innerHTML = `

    <div
      id="levelModalBackdrop"
      style="
        position:fixed;
        inset:0;
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:22px;
        background:rgba(0,0,0,.82);
      "
    >

      <div
        style="
          width:100%;
          max-width:430px;
          background:#120f0b;
          border:1px solid #d7aa27;
          border-radius:24px;
          padding:24px;
          box-shadow:0 0 40px rgba(218,171,39,.25);
        "
      >

        <div
          style="
            text-align:center;
            color:#f3cf4a;
            font-size:25px;
            font-weight:800;
            margin-bottom:8px;
          "
        >
          UNLOCK LEVEL
        </div>

        <div
          id="levelModalTitle"
          style="
            text-align:center;
            color:white;
            font-size:20px;
            margin-bottom:22px;
          "
        >
          LVL 2
        </div>

        <div
          style="
            background:#1c1711;
            border-radius:16px;
            padding:16px;
            margin-bottom:10px;
          "
        >

          <div
            style="
              color:#aaa;
              font-size:13px;
            "
          >
            REQUIRED HOLDING
          </div>

          <div
            id="modalRequired"
            style="
              color:#f3cf4a;
              font-size:25px;
              font-weight:800;
              margin-top:5px;
            "
          >
            0 PERS
          </div>

        </div>

        <div
          style="
            background:#1c1711;
            border-radius:16px;
            padding:16px;
            margin-bottom:10px;
          "
        >

          <div
            style="
              color:#aaa;
              font-size:13px;
            "
          >
            YOUR ASSETS
          </div>

          <div
            id="modalAssets"
            style="
              color:#20e59a;
              font-size:25px;
              font-weight:800;
              margin-top:5px;
            "
          >
            0 PERS
          </div>

        </div>

        <div
          style="
            background:#1c1711;
            border-radius:16px;
            padding:16px;
            margin-bottom:22px;
          "
        >

          <div
            style="
              color:#aaa;
              font-size:13px;
            "
          >
            MISSING
          </div>

          <div
            id="modalMissing"
            style="
              color:#ff5a4f;
              font-size:25px;
              font-weight:800;
              margin-top:5px;
            "
          >
            0 PERS
          </div>

        </div>

        <button
          id="levelBuyButton"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            padding:17px;
            font-size:18px;
            font-weight:800;
            background:#ed1c16;
            color:white;
            margin-bottom:10px;
          "
        >
          BUY LEVEL
        </button>

        <button
          id="levelCancelButton"
          style="
            width:100%;
            border:0;
            border-radius:16px;
            padding:14px;
            font-size:16px;
            font-weight:700;
            background:#2a251f;
            color:#aaa;
          "
        >
          CANCEL
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  /*
    IMPORTANT:
    Modal MUST be hidden
    when the app starts.
  */

  modal.style.display =
    "none";

  document
    .querySelector(
      "#levelCancelButton"
    )
    ?.addEventListener(
      "click",
      closeLevelModal
    );

  document
    .querySelector(
      "#levelModalBackdrop"
    )
    ?.addEventListener(
      "click",
      event => {

        if(
          event.target.id ===
          "levelModalBackdrop"
        ){

          closeLevelModal();

        }

      }
    );

}


/* =========================
   OPEN MODAL
========================= */

async function openLevelModal(
  level,
  required
){

  createLevelModal();

  /*
    Refresh real wallet
    before showing assets.
  */

  await loadWalletPersBalance();

  const missing =
    Math.max(
      0,
      required -
      walletPersBalance
    );

  const title =
    document.querySelector(
      "#levelModalTitle"
    );

  const requiredEl =
    document.querySelector(
      "#modalRequired"
    );

  const assetsEl =
    document.querySelector(
      "#modalAssets"
    );

  const missingEl =
    document.querySelector(
      "#modalMissing"
    );

  const buy =
    document.querySelector(
      "#levelBuyButton"
    );

  if(title)
    title.textContent =
      `LVL ${level}`;

  if(requiredEl)
    requiredEl.textContent =
      `${fmt(
        required,
        0
      )} PERS`;

  if(assetsEl)
    assetsEl.textContent =
      `${fmt(
        walletPersBalance,
        4
      )} PERS`;

  if(missingEl)
    missingEl.textContent =
      missing > 0
        ? `${fmt(
            missing,
            4
          )} PERS`
        : "0 PERS";

  if(buy){

    if(
      walletPersBalance >=
      required
    ){

      buy.disabled = false;
      buy.style.opacity = "1";
      buy.textContent =
        "BUY LEVEL";

      buy.onclick =
        () => {

          unlockLevel(
            level,
            required
          );

        };

    }else{

      buy.disabled = true;
      buy.style.opacity = ".55";
      buy.textContent =
        "INSUFFICIENT PERS";

    }

  }

  const modal =
    document.querySelector(
      "#levelModal"
    );

  if(modal)
    modal.style.display =
      "block";

}


/* =========================
   CLOSE MODAL
========================= */

function closeLevelModal(){

  const modal =
    document.querySelector(
      "#levelModal"
    );

  if(modal)
    modal.style.display =
      "none";

}


/* =========================
   UNLOCK
========================= */

async function unlockLevel(
  level,
  required
){

  await loadWalletPersBalance();

  if(
    walletPersBalance <
    required
  ){

    alert(
      `You need to hold ${fmt(
        required,
        0
      )} PERS in your wallet.`
    );

    return;

  }

  /*
    HOLD ONLY.
    PERS IS NOT SPENT.
  */

  state.level =
    level;

  state.last =
    Date.now();

  save();

  closeLevelModal();

  render();

}


/* =========================
   CLAIM
========================= */

const claimBtn =
  document.querySelector(
    "#claim"
  );

if(claimBtn){

  claimBtn.onclick =
    () => {

      accrue();

      state.saved +=
        state.mined;

      state.mined = 0;

      state.last =
        Date.now();

      save();

      render();

    };

}


/* =========================
   NAV
========================= */

document
  .querySelectorAll(
    ".nav"
  )
  .forEach(
    btn => {

      btn.onclick =
        () => {

          const tab =
            btn.dataset.tab;

          document
            .querySelectorAll(
              ".nav"
            )
            .forEach(
              x => {

                x.classList.toggle(
                  "active",
                  x === btn
                );

              }
            );

          document
            .querySelectorAll(
              ".panel"
            )
            .forEach(
              x => {

                x.classList.toggle(
                  "active",
                  x.id === tab
                );

              }
            );

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

    }
  );


/* =========================
   TASK REWARDS
========================= */

document
  .querySelectorAll(
    "[data-reward]"
  )
  .forEach(
    btn => {

      btn.onclick =
        () => {

          state.saved +=
            Number(
              btn.dataset.reward
            );

          save();

          render();

          btn.disabled = true;

          btn.textContent =
            "CLAIMED";

        };

    }
  );


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

  if(
    tg?.openTelegramLink
  ){

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

if(shareBtn)
  shareBtn.onclick =
    inviteFriends;


/* =========================
   TON CONNECT
========================= */

async function initTon(){

  if(
    !window.TON_CONNECT_UI
  )
    return;

  try{

    const tonConnectUI =
      new TON_CONNECT_UI.TonConnectUI({

        manifestUrl:
          `${API}/tonconnect-manifest.json?v=8`,

        buttonRootId:
          "ton-connect"

      });

    tonConnectUI.onStatusChange(
      async wallet => {

        const el =
          document.querySelector(
            "#walletAddress"
          );

        if(
          wallet?.account?.address
        ){

          connectedWallet =
            wallet.account.address;

          if(el){

            const a =
              connectedWallet;

            el.textContent =
              a.slice(0,6) +
              "..." +
              a.slice(-6);

          }

          await loadWalletPersBalance();

          render();

        }else{

          connectedWallet = "";

          walletPersBalance = 0;

          if(el)
            el.textContent =
              "CONNECT WALLET";

        }

      }
    );

  }catch(error){

    console.error(
      "TON Connect error:",
      error
    );

  }

}


/* =========================
   WITHDRAW
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

const withdrawBtn =
  document.querySelector(
    "#withdrawBtn"
  );

if(withdrawBtn){

  withdrawBtn.onclick =
    () => {

      accrue();

      const available =
        document.querySelector(
          "#withdrawAvailable"
        );

      if(available)
        available.textContent =
          fmt(
            state.saved
          ) +
          " PERS";

      withdrawModal.style.display =
        "flex";

    };

}

const withdrawCancel =
  document.querySelector(
    "#withdrawCancel"
  );

if(withdrawCancel){

  withdrawCancel.onclick =
    () => {

      withdrawModal.style.display =
        "none";

    };

}

const withdrawConfirm =
  document.querySelector(
    "#withdrawConfirm"
  );

if(withdrawConfirm){

  withdrawConfirm.onclick =
    async () => {

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
              method: "POST",

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
          input.value = "";

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

createLevelModal();

render();

initTon();

loadLevels();


/*
  Refresh wallet every 15 seconds
*/

setInterval(
  () => {

    if(connectedWallet)
      loadWalletPersBalance();

  },
  15000
);


/*
  Mining display
*/

setInterval(
  () => {

    render();

  },
  1000
);
