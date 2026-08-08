# ExpenseTracker

A personal finance web app: accounts, transactions, budgets, reports, and recurring
transactions, backed by Firebase/Firestore with Google Sign-In. Includes Google Drive
backup/restore, multi-currency display (fiat + crypto), and four themes including a
Cyberpunk terminal mode.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) (build tool, rolldown-based)
- [Firebase](https://firebase.google.com/) (Auth + Firestore)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) for charts
- Deployed on [Cloudflare Pages](https://pages.cloudflare.com/) via git integration

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase project config and a Google OAuth Web Client ID
(see [Environment variables](#environment-variables) below), then:

```bash
npm run dev
```

## Environment variables

All variables are required — the app reads them via `import.meta.env`.

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GOOGLE_CLIENT_ID` | Google Identity Services OAuth Web Client ID, used for the Google Drive backup feature (`drive.file` scope). Create one under Google Cloud Console → APIs & Services → Credentials. |

Get the Firebase values from Project Settings → General → Your apps in the
[Firebase console](https://console.firebase.google.com/).

## Firebase setup

Firestore security rules and composite indexes are checked into this repo and need to
be deployed to your Firebase project with the [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Deploy

The app deploys to Cloudflare Pages via git integration — pushes to `main` build and
deploy automatically. No CLI deploy step is needed locally.

Build settings (configured in the Cloudflare Pages dashboard):
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** set the same `VITE_*` variables listed above in the
  Pages project's settings.

Routing uses `HashRouter`, so no server-side SPA-fallback/rewrite rules are needed.

## Features

- **Accounts** — multiple account types, running balances, swipe gestures on mobile
- **Transactions** — categories, tags, receipt photos (stored on Google Drive), filters, search
- **Budgets** — overall budget with per-category allocations, burn-rate tracking, overshoot warnings
- **Reports** — date-range summaries, category breakdown, CSV export
- **Recurring transactions** — weekly/monthly rules with day-of-week or nth-weekday scheduling, due-date reminders
- **Google Drive backup/restore** — manual and automatic weekly backups of your data
- **Multi-currency display** — 10 fiat currencies + top 10 crypto, with a 24h rate cache
- **Themes** — light, dark, OLED, and Cyberpunk terminal
- **Global search** — search across all transactions from anywhere in the app

## Known limitations

- Cyberpunk theme doesn't reskin chart colors (recharts palette stays default) or empty-state icons
- Recurring-transaction confirm/skip is manual — there's no auto-confirm option
- The transaction list itself has no CSV export (only Reports does)
- PWA install/offline support is not wired up yet
