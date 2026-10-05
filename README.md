# PERSEPOLIS — AURIX Final UI Package

This package is the consolidated PERSEPOLIS frontend/backend replacement for the current AURIX repository.

## Replace these files
- index.html
- style.css
- app.js
- worker.js
- schema.sql

Keep the existing project assets:
- PERS_logo_final.png
- persepolis-bg.png
- tonconnect-manifest.json
- server.js
- admin.html
- wrangler.jsonc

## Important
The UI is built around the supplied PERSEPOLIS Design Master: Home, Upgrade, Daily Tasks, Friends, Wallet/Buy-Sell, Leaderboard and Profile.

The backend keeps mining/claim/level/referral state server-authoritative and validates Telegram init data before protected API operations.

### TON swaps
The UI is ready for a real TON swap integration, but the swap transaction itself must not be hard-coded against an unverified pool. Before enabling live Buy/Sell, verify the PERS Jetton master and the current GRAM-PERS/DeDust route on mainnet, then configure the verified route in the deployment. Never send funds to an address copied from a mock screen.

### Withdrawals
Withdrawals are recorded as pending requests. A treasury/admin signer must execute the actual PERS Jetton transfer after reviewing the request. This package does not embed a private key or custodial signing secret in the browser.
