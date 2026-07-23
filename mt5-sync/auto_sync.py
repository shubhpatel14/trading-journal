import os
from datetime import datetime
from collections import defaultdict
import MetaTrader5 as mt5
import firebase_admin
from firebase_admin import credentials, firestore

# ============================================================
# CONFIGURATION
# ============================================================

USER_UID = "bu8j28sFuSOqssYhCR9uNamFox92"
ACCOUNT_ID = "acc-1784784270970"

# ============================================================
# FIREBASE INITIALIZATION
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(SCRIPT_DIR, "firebase-key.json")

if not os.path.exists(KEY_PATH):
    print(f"[ERROR] Firebase key file missing at {KEY_PATH}")
    exit()

try:
    cred = credentials.Certificate(KEY_PATH)
    firebase_admin.initialize_app(cred)
except ValueError:
    # Already initialized
    pass

db = firestore.client()

# Register / Update Account Document
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

print("=" * 60)
print("              MT5 ONE-TIME SYNC")
print(f"Account : {ACCOUNT_ID}")
print("Broker  : BLUEBERRY")
print("=" * 60)


# ============================================================
# SYNC FUNCTION
# ============================================================

def run_sync():
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not mt5.initialize():
        print(f"[{now_str}] [ERROR] Failed to connect to MT5.")
        return

    deals = mt5.history_deals_get(datetime(2000, 1, 1), datetime.now())

    if deals is None:
        deals = mt5.history_deals_get(0, int(datetime.now().timestamp()))

    if deals is None:
        print(f"[{now_str}] [ERROR] No MT5 deal history found.")
        mt5.shutdown()
        return

    positions = defaultdict(list)

    for deal in deals:
        positions[deal.position_id].append(deal)

    uploaded_count = 0
    total_net_pnl = 0.0

    for position_id, position_deals in positions.items():

        opens = []
        closes = []

        for d in position_deals:
            if d.entry == mt5.DEAL_ENTRY_IN:
                opens.append(d)
            elif d.entry in (
                mt5.DEAL_ENTRY_OUT,
                mt5.DEAL_ENTRY_INOUT,
                mt5.DEAL_ENTRY_OUT_BY,
            ):
                closes.append(d)

        if not closes:
            continue

        opens.sort(key=lambda x: x.time)
        closes.sort(key=lambda x: x.time)

        first_open = opens[0] if opens else position_deals[0]
        last_close = closes[-1]

        total_volume = sum(d.volume for d in (opens if opens else position_deals))
        net_profit = sum(d.profit for d in closes)
        commission = sum(d.commission for d in position_deals)
        swap = sum(d.swap for d in position_deals)
        fee = sum(getattr(d, "fee", 0) for d in position_deals)

        total_net_pnl += net_profit

        trade = {
            "id": str(position_id),
            "accountId": ACCOUNT_ID,
            "positionId": position_id,
            "asset": first_open.symbol.replace(".pi", "")
            if getattr(first_open, "symbol", None)
            else "TRADE",
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
            "openTime": datetime.fromtimestamp(first_open.time).strftime("%Y-%m-%d %H:%M:%S"),
            "closeTime": datetime.fromtimestamp(last_close.time).strftime("%Y-%m-%d %H:%M:%S"),
            "setup": "MT5 Import",
            "session": "",
            "notes": "Imported automatically via MT5",
            "mistakes": [],
            "htfScreenshot": "",
            "ltfScreenshot": "",
            "source": "MT5 Auto-Sync",
        }

        db.collection("users") \
          .document(USER_UID) \
          .collection("trades") \
          .document(str(position_id)) \
          .set(trade)

        uploaded_count += 1

    mt5.shutdown()

    print("\n" + "=" * 60)
    print("SYNC COMPLETED")
    print("=" * 60)
    print(f"Trades Synced : {uploaded_count}")
    print(f"Net PnL       : ${total_net_pnl:,.2f}")
    print(f"Completed At  : {now_str}")
    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    run_sync()