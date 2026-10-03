export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
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

    // Setup Telegram webhook
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

    // Telegram webhook
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

    // Serve PERSEPOLIS Mini App
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", {
      status: 404
    });
  }
};
