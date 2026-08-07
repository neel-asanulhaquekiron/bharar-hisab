# ভাড়ার হিসাব (Bharar Hisab)

> 🚧 **Status: Planning stage** — see [PLAN.md](./PLAN.md) for the full project plan.

কোন মালামাল কাকে, কতটি ভাড়া দেওয়া হয়েছে — আর ভাড়ার টাকার হিসাব — সব এক অ্যাপে।

A personal rental-tracking mobile app in Bangla: track the items you rent out (what, to whom, how many), rental rates, payments received, and outstanding dues — with push notification reminders.

## Features

- 📦 **মালামাল** — manage rentable items with quantity and rates (দৈনিক/মাসিক)
- 👤 **ভাড়াটিয়া** — renters with contact info and per-renter dues
- 📝 **ভাড়া** — rentals with quantity, dates, partial/full returns, stock checks
- 💰 **পেমেন্ট** — payments and auto-computed dues (মোট ভাড়া − মোট জমা = বাকি)
- 📊 **ড্যাশবোর্ড** — active rentals, total dues, overdue list
- 🔔 **Notifications** — FCM reminders for due returns and overdue payments
- 🇧🇩 Fully Bangla UI, including Bangla digits (০১২৩…) and ৳ formatting

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo, expo-router, TypeScript, React Native Paper |
| API | Node.js + Express (TypeScript), Zod, JWT auth |
| Database | PostgreSQL (Supabase) via Prisma |
| Push | Firebase Cloud Messaging (`firebase-admin` + `expo-notifications`) |
| Hosting | Railway/Render (API) · Supabase (DB) |

## Repository Structure

```
bharar-hisab/
├── mobile/     # Expo React Native app (Bangla UI)   — coming in M1
├── server/     # Node.js + Express + Prisma API      — coming in M1
├── PLAN.md     # Full project plan
└── README.md
```

## Getting Started

Setup instructions will land as the milestones in [PLAN.md](./PLAN.md) are built. Planned flow:

```bash
# API
cd server && npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, Firebase service account
npx prisma migrate dev
npm run dev

# App
cd mobile && npm install
npx expo start
```

## License

MIT — personal project by [@neel-asanulhaquekiron](https://github.com/neel-asanulhaquekiron).
