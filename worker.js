export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // HEALTH
    // =========================
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          project: "PERSEPOLIS"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // =========================
    // SETUP TELEGRAM WEBHOOK
    // =========================
    if (url.pathname === "/setup-webhook") {
      const webhookUrl =
        "https://persepolis.ahoon201.workers.dev/telegram";

      const response = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: webhookUrl
          })
        }
      );

      const result = await response.text();

      return new Response(result, {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // =========================
    // WITHDRAW API
    // =========================
    if (url.pathname === "/withdraw" && request.method === "POST") {
      try {
        const body = await request.json();

        const amount = Number(body.amount);
        const wallet = String(body.wallet || "");
        const telegramId = String(body.telegramId || "");

        if (!amount || amount < 10) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Minimum withdrawal is 10 PERS"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }

        if (!wallet) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Wallet address is required"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }

        // مرحله فعلی:
        // فقط درخواست برداشت را دریافت می‌کنیم.
        // انتقال واقعی PERS در مرحله بعد اضافه می‌شود.

        return new Response(
          JSON.stringify({
            ok: true,
            status: "pending",
            amount: amount,
            wallet: wallet,
            telegramId: telegramId,
            message: "Withdrawal request received."
          }),
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Invalid withdrawal request"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }
    }

    // =========================
    // TELEGRAM WEBHOOK
    // =========================
    if (url.pathname === "/telegram" && request.method === "POST") {
      try {
        const update = await request.json();

        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text || "";

          if (text === "/start") {
            await fetch(
              `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  chat_id: chatId,
                  text:
                    "🏛️ به PERSEPOLIS خوش آمدی!\n\n⛏️ برای شروع ماینینگ روی دکمه زیر بزن:",
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "🚀 Start PERSEPOLIS Mining",
                          web_app: {
                            url: "https://persepolis.ahoon201.workers.dev/"
                          }
                        }
                      ]
                    ]
                  }
                })
              }
            );
          }
        }

        return new Response("OK");

      } catch (error) {
        return new Response("Webhook error", {
          status: 500
        });
      }
    }

    // =========================
    // SERVE MINI APP
    // =========================
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", {
      status: 404
    });
  }
};
