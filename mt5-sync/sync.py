import os
from datetime import datetime
from collections import defaultdict
import MetaTrader5 as mt5
import firebase_admin
from firebase_admin import credentials, firestore

# ============================================================
# FIREBASE
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(SCRIPT_DIR, "firebase-key.json")

cred = credentials.Certificate(KEY_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

USER_UID = "bu8j28sFuSOqssYhCR9uNamFox92"
ACCOUNT_ID = "acc-1784784270970"

# Save / update account details in Firestore
db.collection("users") \
  .document(USER_UID) \
  .collection("accounts") \
  .document(ACCOUNT_ID) \
  .set({
      "id": ACCOUNT_ID,
      "name": "MT5",
      "broker": "BLUEBERRY",
      "currency": "USD",
      "initialBalance": 5000,
      "isActive": True
  }, merge=True)
print(f"Registered account {ACCOUNT_ID} (BLUEBERRY - MT5)")

# ============================================================
# MT5
# ============================================================

if not mt5.initialize():
    print("❌ MT5 Initialization Failed")
    quit()

from_date = datetime(2000, 1, 1)
to_date = datetime.now()

deals = mt5.history_deals_get(from_date, to_date)

if deals is None:
    # Try fetching with epoch 0
    deals = mt5.history_deals_get(0, int(datetime.now().timestamp()))

if deals is None:
    print("❌ No MT5 deal history found")
    mt5.shutdown()
    quit()

print(f"Loaded {len(deals)} MT5 deals from history")

# ============================================================
# GROUP ALL DEALS BY POSITION
# ============================================================

positions = defaultdict(list)

for deal in deals:
    positions[deal.position_id].append(deal)

uploaded = 0
total_profit = 0
uploaded_by_month = defaultdict(int)

# ============================================================
# PROCESS EACH POSITION
# ============================================================

for position_id, position_deals in positions.items():

    opens = []
    closes = []

    for d in position_deals:
        if d.entry == mt5.DEAL_ENTRY_IN:
            opens.append(d)
        elif d.entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_INOUT, mt5.DEAL_ENTRY_OUT_BY):
            closes.append(d)

    if len(closes) == 0:
        continue

    opens.sort(key=lambda x: x.time)
    closes.sort(key=lambda x: x.time)

    first_open = opens[0] if len(opens) > 0 else position_deals[0]
    last_close = closes[-1]

    total_volume = sum(d.volume for d in (opens if opens else position_deals))

    net_profit = sum(d.profit for d in closes)
    commission = sum(d.commission for d in position_deals)
    swap = sum(d.swap for d in position_deals)
    fee = sum(getattr(d, "fee", 0) for d in position_deals)

    total_profit += net_profit

    trade_date = datetime.fromtimestamp(first_open.time).strftime("%Y-%m-%d")
    trade_month = datetime.fromtimestamp(first_open.time).strftime("%Y-%m")

    trade = {
        "id": str(position_id),
        "accountId": ACCOUNT_ID,
        "positionId": position_id,
        "asset": first_open.symbol.replace(".pi", "") if hasattr(first_open, "symbol") and first_open.symbol else "TRADE",
        "direction": "BUY" if first_open.type == mt5.ORDER_TYPE_BUY else "SELL",
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
        "date": trade_date,
        "time": datetime.fromtimestamp(first_open.time).strftime("%H:%M"),
        "openTime": datetime.fromtimestamp(first_open.time).strftime("%Y-%m-%d %H:%M:%S"),
        "closeTime": datetime.fromtimestamp(last_close.time).strftime("%Y-%m-%d %H:%M:%S"),
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
    uploaded_by_month[trade_month] += 1

    print(
        f"{uploaded:03d} | "
        f"{trade['date']} | "
        f"{trade['asset']:10} | "
        f"{trade['direction']:4} | "
        f"{trade['pnl']:8.2f}"
    )

print("\n========================================")
print("UPLOAD COMPLETE")
print("========================================")
print(f"Trades Uploaded : {uploaded}")
print(f"Net Profit      : {total_profit:.2f}")
print("Monthly Breakdown:")
for m, count in sorted(uploaded_by_month.items()):
    print(f"  {m}: {count} trades")
print("========================================")

mt5.shutdown()