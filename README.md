# PERSEPOLIS — PHASER REAL GAME FOUNDATION

This is the new game-engine version:
Telegram Mini App -> Phaser.js -> Cloudflare Worker -> D1 -> TON/PERS.

## Run locally
1. npm install
2. npm run dev

## Build
npm run build

## Connect backend
Set:
VITE_API_URL=https://YOUR-WORKER-DOMAIN

The UI renders without an API, but real account/mining/level/wallet operations require the Worker + D1.

## Cloudflare
- Worker entry: worker/worker.js
- D1 schema: worker/schema.sql
- Config: wrangler.jsonc
- Secret: BOT_TOKEN
- Deploy the built dist as Worker assets.

## Important
Buy/Sell remains disabled until the real PERS/TON DEX route is independently verified.
No fake balance, fake price, or fake blockchain transfer is implemented.
