async function initTon(){

  if(!window.TON_CONNECT_UI)
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

        if(wallet?.account?.address){

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

          await updatePersBalance();

        }else{

          connectedWallet = "";

          state.walletPers = 0;

          if(el){
            el.textContent =
              "CONNECT WALLET";
          }

          save();
          render();
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


async function updatePersBalance(){

  if(!connectedWallet){
    state.walletPers = 0;
    save();
    render();
    return;
  }

  try{

    const master =
      "EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX";

    const url =
      "https://tonapi.io/v2/accounts/" +
      encodeURIComponent(
        connectedWallet
      ) +
      "/jettons/" +
      encodeURIComponent(
        master
      );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if(!response.ok){

      throw new Error(
        "PERS balance HTTP " +
        response.status
      );

    }

    const data =
      await response.json();

    console.log(
      "TONAPI PERS DATA:",
      data
    );

    const decimals =
      Number(
        data.jetton?.decimals ?? 9
      );

    const raw =
      Number(
        data.balance || 0
      );

    state.walletPers =
      raw /
      Math.pow(
        10,
        decimals
      );

    save();

    render();

    console.log(
      "REAL PERS BALANCE:",
      state.walletPers
    );

    /*
      اگر مودال Level باز باشد،
      موجودی آن را هم فوراً به‌روز کن.
    */

    if(
      typeof updateOpenLevelModal ===
      "function"
    ){
      updateOpenLevelModal();
    }

  }catch(error){

    console.error(
      "PERS balance error:",
      error
    );

  }
}
