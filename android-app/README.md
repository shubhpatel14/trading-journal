# TradeForge: Android Trading Journal App (Same-to-Same UI & Features)

A production-grade Android application for **TradeForge Trading Journal** that delivers **100% strictly identical UI, mobile navigation, and complete feature parity** with the web journal on mobile phones.

---

## 🚀 Overview

The Android app packages the complete TradeForge application shell directly into the APK assets, loading it via **AndroidX WebKit `WebViewAssetLoader`** under the secure origin `https://appassets.androidplatform.net/`.

### Key Advantages:
- **Strictly Identical Mobile UI**: Uses the same responsive claymorphism layout, color schemes, animations, and typography as seen on mobile browsers.
- **Identical Mobile Bottom Dock**: Persistent bottom navigation bar with Dashboard, Journal Logs, PnL Calendar, Tactical Insights, Planning & Reviews, Playbooks, and Trade Review.
- **Offline + Cloud Firestore Sync**: Powered by Cloud Firestore with bidirectional offline persistence and local `IndexedDB` screenshot storage.
- **Native Android Polish**:
  - Edge-to-edge window matching `#0F172A` theme color.
  - Native file chooser integration (`WebChromeClient.onShowFileChooser`) allowing direct photo gallery and camera selection for trade screenshots.
  - Hardware back-button management.
  - Hardware-accelerated rendering.

---

## 📱 Features Included (100% Feature Parity)

1. **Trade Journaling & Execution Logging**:
   - Filter by Asset, Setup, Status, Session, Day of Week, and Date.
   - Expandable trade rows with fee breakdowns (Gross PnL, Commission, Swap, Net PnL).
   - Execution grade rating (A+, A, B, C, Gamble).
   - **Copy Trade Screenshots** button (copies 1M, 5M, 15M, 1HR, 4HR, DXY links to clipboard & storage).
   - **Paste Copied Screenshots** directly to another trade or in the trade form.
   - Dedicated **DXY Screenshot (Dollar Index)** uploader.

2. **Executive Performance Dashboard**:
   - Live Net PnL, Win Rate %, Profit Factor, Max Drawdown %, and Planned R:R.
   - Forge Score Card with live discipline rating breakdown.
   - Account switcher with custom commission rates.

3. **PnL Calendar**:
   - Interactive monthly calendar with daily PnL badges, win/loss breakdown, and trade count.

4. **Tactical Insights & Analytics**:
   - Interactive PnL equity curve, drawdowns, session edge, and psychological mistake ranking.

5. **Trade Planning & Setup Library**:
   - Pre-market session plans and multi-timeframe structural mapping.
   - Reusable trading setups with quality gate score tracking.

6. **Trade Review View**:
   - Multi-timeframe carousel (1M, 5M, 15M, 1HR, 4HR, DXY) with fullscreen zoom lightbox.

---

## 📦 Ready-to-Install APK Location

The compiled debug APK is located at:
- **Root Directory**: `TradeForge-Journal.apk`
- **Gradle Build Output**: `android-app/app/build/outputs/apk/debug/app-debug.apk`

---

## 🛠️ How to Build New Versions

Whenever you make changes to the React source code (`src/`):

1. **One-Command Build**:
   ```bash
   npm run build:android
   ```
   This will:
   - Build the production web bundle with Vite.
   - Copy all assets into `android-app/app/src/main/assets/www/`.
   - Compile and package the Android APK using Gradle.
   - Copy the output APK to `TradeForge-Journal.apk` in the root folder.

2. **Manual Gradle Build**:
   ```bash
   npm run build
   cd android-app
   gradle assembleDebug
   ```

---

## 📲 Installing on Your Android Phone

1. Transfer `TradeForge-Journal.apk` to your phone via USB cable, Google Drive, WhatsApp, Telegram, or email.
2. Tap the file on your phone to install (allow "Install Unknown Apps" for your file manager if prompted).
3. Open **TradeForge** to enjoy the exact same trading journal experience on your phone!
