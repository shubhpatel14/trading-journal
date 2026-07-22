from datetime import datetime
from collections import defaultdict
import MetaTrader5 as mt5
import firebase_admin
from firebase_admin import credentials, firestore

# ============================================================
# FIREBASE
# ============================================================

cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

USER_UID = "uK5R8qDV1EQgg7Uvn8oemjKHiFy2"
ACCOUNT_ID = "acc-1"

# ============================================================
# MT5
# ============================================================

if not mt5.initialize():
    print("❌ MT5 Initialization Failed")
    quit()

from_date = datetime(2024, 1, 1)
to_date = datetime.now()

deals = mt5.history_deals_get(from_date, to_date)

if deals is None:
    print("No history")
    mt5.shutdown()
    quit()

print(f"Loaded {len(deals)} MT5 deals")

# ============================================================
# GROUP ALL DEALS BY POSITION
# ============================================================

positions = defaultdict(list)

for deal in deals:
    positions[deal.position_id].append(deal)

uploaded = 0
total_profit = 0

# ============================================================
# PROCESS EACH POSITION
# ============================================================

for position_id, position_deals in positions.items():

    opens = []
    closes = []

    for d in position_deals:

        if d.entry == mt5.DEAL_ENTRY_IN:
            opens.append(d)

        elif d.entry == mt5.DEAL_ENTRY_OUT:
            closes.append(d)

    if len(opens) == 0 or len(closes) == 0:
        continue

    opens.sort(key=lambda x: x.time)
    closes.sort(key=lambda x: x.time)

    first_open = opens[0]
    last_close = closes[-1]

    total_volume = sum(d.volume for d in opens)

    net_profit = sum(d.profit for d in closes)
    commission = sum(d.commission for d in position_deals)
    swap = sum(d.swap for d in position_deals)
    fee = sum(getattr(d, "fee", 0) for d in position_deals)

    total_profit += net_profit

    trade = {

        "id": str(position_id),

        "accountId": ACCOUNT_ID,

        "positionId": position_id,

        "asset": first_open.symbol.replace(".pi", ""),

        "direction": "BUY"
        if first_open.type == mt5.ORDER_TYPE_BUY
        else "SELL",

        "entryPrice": first_open.price,

        "exitPrice": last_close.price,

        "size": total_volume,

        "sl": 0,
        "tp": 0,

        "pnl": round(net_profit, 2),

        "commission": round(commission, 2),

        "swap": round(swap, 2),

        "fee": round(fee, 2),

        "status": "WIN" if net_profit > 0 else "LOSS",

        "date": datetime.fromtimestamp(first_open.time).strftime("%Y-%m-%d"),

        "time": datetime.fromtimestamp(first_open.time).strftime("%H:%M"),

        "openTime": datetime.fromtimestamp(first_open.time),

        "closeTime": datetime.fromtimestamp(last_close.time),

        "setup": "MT5 Import",

        "session": "",

        "notes": "Imported automatically from MT5",

        "mistakes": [],

        "htfScreenshot": "",

        "ltfScreenshot": "",

        "source": "MT5"

    }

    db.collection("users") \
      .document(USER_UID) \
      .collection("trades") \
      .document(str(position_id)) \
      .set(trade)

    uploaded += 1

    print(
        f"{uploaded:03d} | "
        f"{trade['asset']:10} | "
        f"{trade['direction']:4} | "
        f"{trade['pnl']:8.2f}"
    )

print("\n========================================")
print("UPLOAD COMPLETE")
print("========================================")
print(f"Trades Uploaded : {uploaded}")
print(f"Net Profit      : {total_profit:.2f}")
print("========================================")

mt5.shutdown()