# PERSEPOLIS — AURIX replacement package

این بسته برای جایگزینی مستقیم فایل‌های اصلی Mini App آماده شده است. هدف آن یک نسخه یکپارچه با ظاهر Persepolis و منطق server-authoritative است، نه prototype تصویری.

## فایل‌های جایگزین
این ۴ فایل را در ریشه AURIX جایگزین کن:
- `index.html`
- `style.css`
- `app.js`
- `worker.js`

این فایل‌های فعلی را نگه دار:
- `PERS_logo_final.png`
- `persepolis-bg.png`
- `tonconnect-manifest.json`
- `server.js`
- `admin.html`
- `wrangler.jsonc`

`schema.sql` هم داخل بسته است و برای D1 مرجع ساخت جدول‌هاست؛ Worker در اولین درخواست جدول‌های لازم را نیز می‌سازد.

## امکانات این نسخه
- Telegram Mini App mobile-first با تم مشکی/قرمز/طلایی Persepolis
- Home / Mining / Tasks / Upgrade / Friends / Wallet / Profile / Leaderboard
- 400 Level
- Level 12 = 15,000 PERS holding و 125.6 PERS/hour
- Level 400 = 150,000 PERS holding و 500 PERS/hour
- Mining و Claim در D1 و سمت سرور
- Telegram `initData` validation در Worker
- Referral server-side
- Task claim server-side و Daily قابل تکرار بر اساس روز
- بررسی موجودی PERS از TONAPI هنگام Upgrade
- Withdrawal به‌صورت queue با وضعیت `pending`
- TON Connect حفظ شده
- Leaderboard از داده‌های D1
- هیچ LP جدیدی ساخته نمی‌شود؛ GRAM-PERS LP فعلی باید قبل از فعال‌سازی swap بررسی شود

## الزامات Cloudflare
Worker باید این binding/secretها را داشته باشد:
- D1 binding: `DB`
- Assets binding: `ASSETS`
- Secret: `BOT_TOKEN`
- Secret: `ADMIN_SECRET`
- Variable: `WEBAPP_URL=https://persepolis.ahoon201.workers.dev`

## مهم
Swap واقعی BUY/SELL عمداً در این نسخه غیرفعال است تا LP موجود GRAM-PERS و مسیر قرارداد/DEX تأیید شود. Withdraw نیز توکن را خودکار منتقل نمی‌کند و فقط درخواست `pending` می‌سازد؛ این کار جلوی پرداخت اشتباه قبل از تأیید treasury را می‌گیرد.

TON Connect در این نسخه برای اتصال wallet و خواندن آدرس استفاده می‌شود. برای فعال‌سازی برداشت خودکار یا اثبات مالکیت wallet، TON Proof استاندارد باید قبل از پرداخت نهایی اضافه/تأیید شود.

## بعد از جایگزینی
1. Worker را Deploy کن.
2. `BOT_TOKEN` و `ADMIN_SECRET` را تنظیم کن.
3. `/health` را تست کن.
4. `/api/levels` را تست کن.
5. Mini App را از Telegram باز کن.
6. سپس با هدر `X-Admin-Secret` مسیر `/setup-webhook` را یک بار اجرا کن.
