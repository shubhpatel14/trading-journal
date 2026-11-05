# TradeForge: Native Android Trading Journal App

A fully functional, native Android application for **TradeForge & Executive Trading Journal**, built with Jetpack Compose, Material 3, and Kotlin Coroutines, providing bidirectional synchronization with the existing Cloud Firestore backend and Firebase Authentication.

---

## 🚀 Key Features

### 1. Executive Performance Dashboard
- **Live Net PnL Tracking**: Formatted in real time, automatically subtracting calculated broker commissions, financing swaps, and spread fees.
- **Quantitative KPI Metrics**: Average Planned Risk:Reward (R:R), Max Drawdown %, Gross PnL, Total Broker Fees Paid, and Win Rate %.
- **Real-Time Bidirectional Synchronization Indicator**: Direct connection to Google Cloud Firestore with automatic cloud status updates.
- **Recent Executions**: Quick visual trade cards showing direction, setup playbook, session, and execution grade.

### 2. Comprehensive Trade Journal
- **Search & Multi-Filter**: Real-time filtering by asset symbol (e.g. `XAUUSD`, `EURUSD`, `BTCUSD`), execution outcome (`WIN`, `LOSS`, `BREAKEVEN`), setup playbook, and trading session (`LONDON`, `NEW YORK`, `ASIA`).
- **Interactive Trade Cards**: Displays Net PnL, planned R:R, lot size, session badge, and execution grade (`A+`, `A`, `B`, `C`, `Gamble`).
- **Fast Mobile Trade Entry Form**:
  - Live Net PnL and Planned Risk:Reward preview updated as numbers are typed.
  - Quick BUY / SELL toggles.
  - Dedicated numeric decimal keypad for Entry Price, Exit Price, Stop Loss, Take Profit, Lot Size, and Gross PnL.
  - Session & Outcome chips.
  - Psychological Mistake tags (`FOMO`, `Overtrading`, `Left Early`, `Revenge Trading`, `Moved SL`).
  - Screenshots attachment support (LTF, HTF, 15M, 1H, 4H).
  - Permanent deletion and update actions with atomic synchronization.

### 3. Playbook Setup Library
- Reusable trading setups (e.g., *BoS Downside*, *EMA Rejection*, *Liquidity Sweep*).
- Core entry rules, invalidation conditions, and position management rules.
- Per-setup historical performance tracking (execution count, win rate %, and cumulative net PnL).

### 4. Session Trade Planning & Multi-Timeframe Analysis
- Daily pre-market preparation plans with directional bias (`BULLISH`, `BEARISH`, `NEUTRAL`).
- Structural analysis across 4H, 1H, 15M, and 5M timeframes.
- Macro news triggers and execution conditions.

### 5. Quantitative Analytics & Behavioral Insights
- Statistical Expected Value (EV) per trade.
- Average Win size vs Average Loss size.
- Session edge distribution comparing performance across London, New York, and Asia sessions.
- Behavioral mistake ranking to identify emotional leaks.
- Institutional AI Risk Coach insights.

---

## 🔄 Bidirectional Firebase Synchronization

The Android app operates against the exact same Firestore database and user accounts as the web application:
- **Project ID**: `tradingjournalapp-4ed16`
- **Security & User Isolation**: Enforces Firestore rules where documents live under `/users/{userId}/...`
- **Real-time Snapshot Listeners**: Any trade created, edited, or deleted on the web appears immediately in the Android app, and vice versa.
- **Offline Persistence**: SQLite persistence is enabled via `FirebaseFirestoreSettings.Builder().setPersistenceEnabled(true)`. Writes are safely queued when offline and automatically synced once network connectivity is re-established.
- **Guest Demo Mode**: Users can test the app without signing into Firebase, using an isolated in-memory sandbox.

---

## 🛠️ Project Structure

```
android-app/
├── build.gradle.kts                   # Root Gradle build script
├── settings.gradle.kts                # Project & repository settings
├── gradle.properties                  # JVM & AndroidX optimization flags
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties  # Gradle 8.9 wrapper configuration
├── app/
│   ├── build.gradle.kts               # App module dependencies (Compose, Firebase, Coroutines)
│   ├── google-services.json           # Firebase configuration
│   ├── proguard-rules.pro             # Release code obfuscation rules
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml    # App permissions & launcher activity
│       │   ├── res/
│       │   │   └── values/            # Colors, strings, themes matching web design
│       │   └── java/com/tradeforge/journal/
│       │       ├── TradeForgeApp.kt   # Application class initializing Firebase & offline cache
│       │       ├── MainActivity.kt    # Root Compose activity and navigation scaffold
│       │       ├── data/
│       │       │   ├── model/         # Trade, TradingAccount, TradePlan, SetupDefinition, etc.
│       │       │   ├── remote/        # FirestoreService, AuthService
│       │       │   └── repository/    # TradeRepository, AccountRepository, PlanRepository, SetupRepository
│       │       ├── domain/
│       │       │   └── Calculations.kt# Pure financial formulas matching web TypeScript
│       │       └── ui/
│       │           ├── theme/         # Claymorphism colors, typography, theme
│       │           ├── components/    # ClaySurface, KpiCard, TradeCard
│       │           ├── navigation/    # Screen routes & bottom nav bar
│       │           ├── viewmodel/     # MainViewModel with reactive StateFlows
│       │           └── screens/       # Auth, Dashboard, Journal, TradeEdit, Setups, Plans, Insights
│       └── test/java/com/tradeforge/journal/
│           └── CalculationsTest.kt    # Unit tests for financial calculations
└── README.md
```

---

## 🏗️ How to Build and Run

### Prerequisites
- JDK 21 (or JDK 17+)
- Android SDK (Platform 35 or 36)
- Android Studio Ladybug / Meerkat or command line Gradle

### 1. Opening in Android Studio
1. Launch Android Studio.
2. Select **Open** and choose the `android-app` folder inside this repository:
   `c:\Users\WIN 10\Desktop\Journal\android-app`
3. Allow Gradle to sync dependencies.
4. Select an emulator or connected physical Android device and click **Run (Shift + F10)**.

### 2. Building via Command Line (Debug APK)
Open PowerShell inside `android-app/`:
```powershell
.\gradlew.bat assembleDebug
```
The resulting APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

### 3. Running Unit Tests
```powershell
.\gradlew.bat testDebugUnitTest
```

### 4. Generating a Signed Release APK
1. In Android Studio, go to **Build > Generate Signed Bundle / APK**.
2. Select **APK** and click **Next**.
3. Create or select a release keystore, enter key credentials, and select **release**.
4. The signed release APK will be generated at `app/release/app-release.apk`.
