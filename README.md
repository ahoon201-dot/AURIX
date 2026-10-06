# PERSEPOLIS — complete starter
Telegram Mini App for the existing PERSEPOLIS bot.

Includes:
- one-file frontend (`index.html`)
- Cloudflare Worker backend (`worker.js`)
- D1 schema (`schema.sql`)
- 40 levels
- low mining rates
- PERS upgrade costs
- Telegram initData verification
- server-side mining accrual
- wallet binding placeholder

Important:
1. Replace `BOT_TOKEN` in `wrangler.jsonc` with the real BotFather token before deployment.
2. Run the D1 schema against the `persepolis-db` database.
3. Deploy the Worker and set the Telegram Mini App URL to the deployed HTTPS URL.
4. Buy/Sell PERS is intentionally NOT enabled until a verified real DEX route is configured.
5. This package is a clean replacement for the empty repository; test deployment before treating it as production.
