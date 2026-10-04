export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* =========================
       HEALTH
    ========================= */

    if (url.pathname === "/health") {
      return json({
        status: "ok",
        project: "PERSEPOLIS",
        version: "400-LEVEL"
      });
    }


    /* =========================
       400 LEVELS
       HOLDING ONLY
    ========================= */

    if (url.pathname === "/api/levels") {

      const levels = [];

      for (let i = 1; i <= 400; i++) {

        let hold;

        if (i === 1) {
          hold = 0;
        } else {
          /*
           * Smooth progression:
           * LVL 2  ≈ 100 PERS
           * LVL 400 = 50,000 PERS
           */

          const t = (i - 1) / 399;

          hold = Math.round(
            100 +
            Math.pow(t, 1.65) * 49900
          );
        }

        /*
         * LVL 400 ≈ 41.67 PERS/hour
         */

        const speed =
          1 +
          ((i - 1) / 399) *
          (41.6666667 - 1);

        levels.push({
          level: i,
          hold: hold,
          speed: Number(speed.toFixed(4))
        });
      }

      levels[399] = {
        level: 400,
        hold: 50000,
        speed: 41.6667
      };

      return json({
        ok: true,
        count: 400,
        levels
      });
    }


    /* =========================
       PAYOUT CONFIG
    ========================= */

    if (url.pathname === "/api/payout-config") {

      return json({
        ok: true,

        master:
          "EQBxwHlh-mqsszryIRQeFpvaG91EqS3HWtiQo4h2-UzYlBAX",

        payoutWallet:
          env.PAYOUT_WALLET_ADDRESS || "",

        decimals: 9,

        minimum: 10
      });
    }


    /* =========================
       WITHDRAW REQUEST
       NO PRIVATE KEY USED HERE
    ========================= */

    if (
      url.pathname === "/withdraw" &&
      request.method === "POST"
    ) {

      try {

        const body =
          await request.json();

        const amount =
          Number(body.amount);

        const wallet =
          String(body.wallet || "").trim();

        const telegramId =
          String(body.telegramId || "").trim();


        if (
          !Number.isFinite(amount) ||
          amount < 10
        ) {

          return json({
            ok: false,
            error:
              "Minimum withdrawal is 10 PERS"
          }, 400);
        }


        if (!wallet) {

          return json({
            ok: false,
            error:
              "Wallet address is required"
          }, 400);
        }


        if (!telegramId) {

          return json({
            ok: false,
            error:
              "Telegram ID is required"
          }, 400);
        }


        /*
         * Save request to D1 if available.
         */

        if (env.DB) {

          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS withdrawals (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              telegram_id TEXT NOT NULL,
              wallet TEXT NOT NULL,
              amount REAL NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
          `).run();


          await env.DB.prepare(`
            INSERT INTO withdrawals
            (
              telegram_id,
              wallet,
              amount,
              status,
              created_at
            )
            VALUES (?, ?, ?, ?, ?)
          `)
          .bind(
            telegramId,
            wallet,
            amount,
            "pending",
            new Date().toISOString()
          )
          .run();
        }


        return json({
          ok: true,
          status: "pending",
          amount,
          wallet,
          telegramId,
          message:
            "Withdrawal request received."
        });

      } catch (error) {

        return json({
          ok: false,
          error:
            error?.message ||
            "Invalid withdrawal request"
        }, 400);
      }
    }


    /* =========================
       WITHDRAW LIST
       ADMIN
    ========================= */

    if (
      url.pathname === "/api/withdrawals" &&
      request.method === "GET"
    ) {

      if (!env.DB) {

        return json({
          ok: true,
          withdrawals: []
        });
      }


      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id TEXT NOT NULL,
          wallet TEXT NOT NULL,
          amount REAL NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `).run();


      const result =
        await env.DB.prepare(`
          SELECT *
          FROM withdrawals
          ORDER BY id DESC
          LIMIT 100
        `).all();


      return json({
        ok: true,
        withdrawals:
          result.results || []
      });
    }


    /* =========================
       TELEGRAM WEBHOOK
    ========================= */

    if (
      url.pathname === "/telegram" &&
      request.method === "POST"
    ) {

      try {

        const update =
          await request.json();


        if (update.message) {

          const chatId =
            update.message.chat.id;

          const text =
            update.message.text || "";


          if (text === "/start") {

            await fetch(
              `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({

                  chat_id: chatId,

                  text:
                    "🏛️ به PERSEPOLIS خوش آمدی!\n\n⛏️ برای شروع ماینینگ روی دکمه زیر بزن:",

                  reply_markup: {

                    inline_keyboard: [[

                      {
                        text:
                          "🚀 Start PERSEPOLIS Mining",

                        web_app: {
                          url:
                            "https://persepolis.ahoon201.workers.dev/"
                        }
                      }

                    ]]
                  }
                })
              }
            );
          }
        }


        return new Response("OK");

      } catch (error) {

        return new Response(
          "Webhook error",
          { status: 500 }
        );
      }
    }


    /* =========================
       SET WEBHOOK
    ========================= */

    if (
      url.pathname === "/setup-webhook"
    ) {

      const webhookUrl =
        "https://persepolis.ahoon201.workers.dev/telegram";


      const response =
        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              url: webhookUrl
            })
          }
        );


      const result =
        await response.text();


      return new Response(
        result,
        {
          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );
    }


    /* =========================
       ASSETS
       INCLUDING admin.html
    ========================= */

    if (env.ASSETS) {

      return env.ASSETS.fetch(request);
    }


    return new Response(
      "Not found",
      { status: 404 }
    );
  }
};


/* =========================
   JSON HELPER
========================= */

function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );
}
