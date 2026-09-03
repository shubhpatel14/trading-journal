<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# TradeForge Journal

A local-first trading journal with trade plans, screenshots, reviews, discipline tracking, MT5 sync, optional Firebase sync, and exportable backups.

## Run locally

Prerequisites: Node.js 20+ and npm.

1. Install dependencies with `npm install`.
2. Optionally copy `.env.example` to `.env` and add `GEMINI_API_KEY=...`. You can also configure the key from the AI Chat tab; UI-entered keys stay only in the running server process.
3. Start the app with `npm run dev`, then open `http://localhost:3000`.

Use `npm run build` to create a production build and `npm start` to serve it.

## Keeping your journal safe

The app stores data locally in IndexedDB and keeps a local `trades_backup.json` when run through the included server. In the Journal page:

- **Backup JSON** exports a complete restorable journal.
- **Restore JSON** safely merges a TradeForge JSON export (or a legacy array backup) by trade ID, so unrelated current trades stay intact.
- **Export CSV** creates a spreadsheet-ready report with gross P&L, each fee, and net P&L.

Firebase and MT5 are optional. Firebase requires the configured project in `src/lib/firebase.ts`; MT5 sync requires an open, logged-in MT5 terminal on the same computer running the server.

## Grounded AI Chat

The AI Chat tab builds a compact snapshot from the currently selected account's trades, plans, playbooks, and reviews. Gemini requests go through `/api/ai/chat`; the browser bundle never contains the API key. The automatic overview and follow-up answers are grounded in that snapshot, and screenshots are excluded.
