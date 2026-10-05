# PERSEPOLIS — complete Telegram game

This is a real Telegram Mini App project, not a screenshot viewer.

## What is included
- PERSEPOLIS branded game UI
- Telegram Mini App launch
- Telegram initData verification
- Server-authoritative mining
- Energy and mining timer
- 400 levels
- Level upgrades paid from the user's in-app PERS balance
- Daily/task rewards with one-time DB claims
- Referral tracking
- TON wallet binding
- Buy/Sell UI intentionally disabled until a verified DEX route is configured
- Cloudflare D1 schema
- Telegram bot `/start` flow with a Mini App button

## Deploy
1. Create a Cloudflare D1 database and run `worker/schema.sql`.
2. Deploy `worker/worker.js` and serve `web/index.html` as a Worker static asset (or Cloudflare Pages).
3. Set Worker secrets:
   - `BOT_TOKEN` = token from @BotFather
4. Set Worker environment variable:
   - `WEBAPP_URL` = public HTTPS URL of the Mini App.
5. Register webhook:
   `POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://YOUR_DOMAIN/telegram/webhook`
6. Open the bot and send `/start`.

## Important
I did not fake token swaps. Real PERS buy/sell needs a verified TON DEX/pool route and must be wired before enabling the buttons.
