# ভাড়ার হিসাব (Bharar Hisab)

> ✅ **Status: In production (v2)** — API live on Render, DB on Supabase, FCM reminders working, APK built with EAS and in daily use. See [PLAN.md](./PLAN.md) for the original plan.

কোন মালামাল কাকে, কতটি ভাড়া দেওয়া হয়েছে — আর ভাড়ার টাকার হিসাব — সব এক অ্যাপে।

A personal rental-tracking mobile app in Bangla: track the items you rent out (what, to whom, how many), rental rates, payments received, and outstanding dues — with push notification reminders.

## Features

- 📦 **মালামাল** — rentable items with stock, rates (দৈনিক/মাসিক), purchases, investment & profit tracking (including pre-app income)
- 👤 **ভাড়াটিয়া** — renters with contact info, per-renter dues, direct-call buttons
- 📝 **ভাড়া** — step-by-step new-rental wizard:
  - rent **one or many items** to a person in a single flow
  - per-rental billing choice: **দৈনিক / মাসিক / এককালীন** (flat one-time price however long it's kept)
  - auto-detects returning renters by phone number, contact-picker integration
  - advance payment (ক্যাশ/নগদ/বিকাশ) — split automatically across items
  - live হিসাব preview (মোট ভাড়া, অগ্রিম, বাকি) before submitting
- ↩️ **ফেরত** — partial/full returns with stock checks, one-tap full-return & full-dues buttons
- 💰 **পেমেন্ট** — payments and auto-computed dues (মোট ভাড়া − মোট জমা = বাকি), confirmation dialogs before every delete
- 📊 **ড্যাশবোর্ড** — active rentals, units out, total dues, overdue list, investment/income/profit
- 🔔 **Notifications** — FCM daily reminder (9 AM Asia/Dhaka) for due returns and dues
- 🌙 Proper dark mode; 🇧🇩 fully Bangla UI with Bangla digits (০১২৩…) and ৳ formatting

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo (SDK 54), expo-router, TypeScript, React Native Paper, Reanimated, TanStack Query |
| API | Node.js + Express 5 (TypeScript), Zod, JWT auth (single-account) |
| Database | PostgreSQL (Supabase) via Prisma |
| Push | Firebase Cloud Messaging (`firebase-admin` + `expo-notifications`), cron-job.org trigger |
| Hosting | Render (API, free tier) · Supabase (DB) · EAS Build (APK) |

## Repository Structure

```
bharar-hisab/
├── mobile/     # Expo React Native app (Bangla UI, SDK 54)
├── server/     # Node.js + Express + Prisma API
├── render.yaml # Render blueprint for API deployment
├── PLAN.md     # Original project plan
└── README.md
```

## Getting Started

```bash
# API
cd server && npm install
cp .env.example .env   # fill in DATABASE_URL + JWT secrets
npx prisma migrate dev
npm run dev            # http://localhost:4000

# App (test with Expo Go on your phone or emulator)
cd mobile && npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your computer's LAN IP
npx expo start
```

> Note: `EXPO_PUBLIC_API_URL` is baked into the JS bundle at build time — after
> changing `.env` (e.g. your LAN IP changed), restart with `npx expo start --clear`.

## Production build

```bash
cd mobile
npx expo-doctor && npx expo export --platform android   # pre-flight check
eas build -p android --profile production               # APK with Render API baked in
```

## License

MIT — personal project by [@neel-asanulhaquekiron](https://github.com/neel-asanulhaquekiron).
