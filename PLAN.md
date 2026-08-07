# ভাড়ার হিসাব (Bharar Hisab) — Project Plan

A personal-use mobile app, fully in Bangla, to keep track of items rented out — what, to whom, how many — along with rental rates, payments received, and outstanding dues.

> ব্যক্তিগত ব্যবহারের জন্য একটি মোবাইল অ্যাপ — কোন মালামাল কাকে, কতটি ভাড়া দেওয়া হয়েছে, ভাড়ার টাকা কত জমা হয়েছে আর কত বাকি আছে — সবকিছুর হিসাব এক জায়গায়।

---

## 1. Overview

- **App name:** ভাড়ার হিসাব (Bharar Hisab)
- **Language:** Bangla UI throughout (Bangla digits ০১২৩… and ৳ currency formatting)
- **Users:** Single owner account (personal use), but built with proper auth anyway
- **Platform:** Android first (personal APK via EAS build); iOS possible later since it's Expo

### Core idea

The owner logs in → manages a catalog of rentable items (মালামাল) → keeps a list of renters (ভাড়াটিয়া) → records each rental (item + renter + quantity + dates + rate) → records returns and payments → always sees who has what and who owes how much. FCM push notifications remind about due returns and overdue payments.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Mobile app | React Native + **Expo** (SDK 53+), **expo-router**, TypeScript |
| UI | React Native Paper, Bangla font (Noto Sans Bengali / Hind Siliguri) |
| Data fetching | TanStack Query + Axios; `expo-secure-store` for JWT storage |
| API server | **Node.js + Express** (TypeScript), Zod for request validation |
| Database | **PostgreSQL hosted on Supabase**, accessed from Express via **Prisma** (direct connection string — no Supabase client SDK) |
| Auth | Email/password with bcrypt + **JWT** (access + refresh tokens), implemented in Express |
| Push notifications | **FCM** via `firebase-admin` on the server; `expo-notifications` in the app (requires an EAS dev build for native FCM config); `node-cron` for scheduled reminders |
| Hosting | API on Railway/Render free tier; database on Supabase free tier |

---

## 3. Features (v1)

### 🔐 Auth
- One-time registration, login, logout
- JWT access token (short-lived) + refresh token flow
- Tokens stored in `expo-secure-store`

### 📦 মালামাল (Items)
- CRUD: name, description, total quantity owned, rental rate, rate unit (দৈনিক / মাসিক)
- Shows available vs rented-out quantity per item

### 👤 ভাড়াটিয়া (Renters)
- CRUD: name, phone, address, notes
- Renter detail view: active rentals, rental history, total dues (মোট বাকি)

### 📝 ভাড়া (Rentals)
- Create rental: renter + item + quantity + start date + expected return date + rate
- Available-quantity check (can't rent more than is in stock)
- Partial or full returns; status: চলমান (ACTIVE) / আংশিক ফেরত (PARTIAL) / ফেরত সম্পন্ন (RETURNED)

### 💰 পেমেন্ট (Payments)
- Record payments against a rental (amount, date, method, notes)
- Dues auto-computed: মোট ভাড়া − মোট জমা = বাকি

### 📊 ড্যাশবোর্ড
- Active rentals count, total items out, total dues, overdue list

### 🔔 Notifications (FCM)
- Return-date reminders (আজ ফেরতের তারিখ)
- Overdue alerts (মেয়াদ পার হয়ে গেছে)
- Payment received confirmations

---

## 4. Database Schema (Prisma → Supabase PostgreSQL)

```
users
  id, name, email (unique), password_hash, created_at

items
  id, user_id → users, name, description, total_quantity,
  rate, rate_unit (DAILY | MONTHLY), created_at

renters
  id, user_id → users, name, phone, address, notes, created_at

rentals
  id, user_id → users, renter_id → renters, item_id → items,
  quantity, rate, start_date, expected_return_date,
  returned_quantity (default 0),
  status (ACTIVE | PARTIAL | RETURNED), notes, created_at

payments
  id, rental_id → rentals, amount, paid_at, method, notes

device_tokens
  id, user_id → users, fcm_token (unique), platform, created_at
```

---

## 5. API Design (prefix `/api/v1`)

### Auth
- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me`

### Items
- `GET /items` · `POST /items` · `GET /items/:id` · `PATCH /items/:id` · `DELETE /items/:id`

### Renters
- `GET /renters` · `POST /renters` · `GET /renters/:id` · `PATCH /renters/:id` · `DELETE /renters/:id`
- `GET /renters/:id/summary` — rentals & dues for one renter

### Rentals
- `GET /rentals` · `POST /rentals` · `GET /rentals/:id` · `PATCH /rentals/:id`
- `POST /rentals/:id/return` — body: `{ quantity }` (partial or full return)

### Payments
- `GET /payments?rentalId=&renterId=` · `POST /payments`

### Misc
- `GET /dashboard/summary`
- `POST /devices` — register FCM device token

### Background jobs
- Daily `node-cron` job: find rentals due today / overdue → send FCM via `firebase-admin`

---

## 6. App Screens (all labels in Bangla)

```
লগইন / নিবন্ধন
└── (tabs)
    ├── ড্যাশবোর্ড        — summary cards, overdue list
    ├── মালামাল           — item list → item form (add/edit)
    ├── ভাড়াটিয়া          — renter list → renter detail (dues) → renter form
    ├── ভাড়া              — rental list → নতুন ভাড়া form → ভাড়ার বিবরণ
    │                        (return action + payment action)
    └── সেটিংস            — logout, notification toggle
পেমেন্ট history           — reachable from rental detail & renter detail
```

---

## 7. Milestones

| # | Milestone | What gets done |
|---|---|---|
| M1 | **Foundation** | Monorepo scaffold (`mobile/`, `server/`), Supabase project, Prisma schema + first migration |
| M2 | **API** | Auth (register/login/refresh), all CRUD endpoints, Zod validation, error handling |
| M3 | **App core** | Expo app with auth flow, items, renters, rentals screens in Bangla |
| M4 | **Money** | Payments, dues computation, dashboard |
| M5 | **FCM** | Firebase project, device token registration, cron reminders, EAS dev build |
| M6 | **Polish** | Bangla digit/৳ formatting, empty states, app icon & splash, EAS APK for personal install |

---

## 8. Environment Variables (planned)

### `server/.env`
```
DATABASE_URL=            # Supabase Postgres connection string
JWT_SECRET=
JWT_REFRESH_SECRET=
FIREBASE_SERVICE_ACCOUNT= # path or base64 of service account JSON
PORT=4000
```

### `mobile/.env`
```
EXPO_PUBLIC_API_URL=     # deployed API base URL
```
