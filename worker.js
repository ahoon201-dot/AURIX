export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          project: "AURIX"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

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
                  text: "🚀 به AURIX خوش آمدی!\n\n⛏️ ماینینگ شما آماده است."
                })
              }
            );
          }
        }

        return new Response("OK");
      } catch (error) {
        return new Response("Webhook error", { status: 500 });
      }
    }

    return new Response("AURIX Backend is running 🚀");
  }
};
