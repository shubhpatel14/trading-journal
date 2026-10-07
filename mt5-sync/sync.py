import os
from datetime import datetime, timedelta, timezone
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
DEFAULT_ACCOUNT_ID = "acc-1784784270970"

def resolve_target_account(db_client, user_uid: str, fallback_acc_id: str):
    """
    Dynamically finds the target MT5 account in Firestore:
    1. Looks for any account under users/{USER_UID}/accounts where isPrimary == True.
    2. If found, uses that account ID and preserves its custom name.
    3. If none is marked isPrimary, falls back to fallback_acc_id.
    """
    accounts_ref = db_client.collection("users").document(user_uid).collection("accounts")
    try:
        primary_docs = list(accounts_ref.where("isPrimary", "==", True).limit(1).stream())
        if primary_docs:
            p_doc = primary_docs[0]
            p_data = p_doc.to_dict() or {}
            p_id = p_doc.id
            p_name = p_data.get("name", "MT5")
            p_broker = p_data.get("broker", "BLUEBERRY")
            print(f"[INFO] Primary MT5 Account detected: '{p_name}' ({p_id}) [{p_broker}]")
            return p_id, p_name, p_doc.reference
    except Exception as e:
        print(f"[WARNING] Could not query primary account: {e}")

    fallback_ref = accounts_ref.document(fallback_acc_id)
    doc_snap = fallback_ref.get()
    if doc_snap.exists:
        data = doc_snap.to_dict() or {}
        name = data.get("name", "MT5")
        fallback_ref.set({"isActive": True, "isPrimary": True}, merge=True)
        print(f"[INFO] Using configured account: '{name}' ({fallback_acc_id})")
        return fallback_acc_id, name, fallback_ref

    fallback_ref.set({
        "id": fallback_acc_id,
        "name": "MT5",
        "broker": "BLUEBERRY",
        "currency": "USD",
        "initialBalance": 5000,
        "isActive": True,
        "isPrimary": True
    }, merge=True)
    return fallback_acc_id, "MT5", fallback_ref

ACCOUNT_ID, ACCOUNT_NAME, account_ref = resolve_target_account(db, USER_UID, DEFAULT_ACCOUNT_ID)
print(f"Target Sync Account: {ACCOUNT_NAME} ({ACCOUNT_ID})")

# ============================================================
# MT5
# ============================================================

if not mt5.initialize():
    print("❌ MT5 Initialization Failed")
    quit()

from datetime import timedelta

from_date = datetime(2000, 1, 1)
to_date = datetime.now() + timedelta(days=2)

deals = mt5.history_deals_get(from_date, to_date)

if deals is None:
    # Try fetching with epoch 0
    deals = mt5.history_deals_get(0, int(to_date.timestamp()))

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
    if abs(commission) < 0.001:
        commission = total_volume * 7.0
    swap = sum(d.swap for d in position_deals)
    fee = sum(getattr(d, "fee", 0) for d in position_deals)

    total_profit += net_profit

    from datetime import timezone

    open_dt = datetime.fromtimestamp(first_open.time, tz=timezone.utc)
    close_dt = datetime.fromtimestamp(last_close.time, tz=timezone.utc)

    trade_date = close_dt.strftime("%Y-%m-%d")
    trade_month = close_dt.strftime("%Y-%m")

    journal_defaults = {
        "setup": "MT5 Import",
        "session": "",
        "notes": "",
        "journalingStatus": "PENDING",
        "mistakes": [],
        "htfScreenshot": "",
        "ltfScreenshot": "",
    }

    # MT5-owned execution fields. User-owned journal fields are only written
    # when the trade is first created so re-imports cannot erase notes/images.
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
        "time": open_dt.strftime("%H:%M"),
        "openTime": open_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "closeTime": close_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "source": "MT5"
    }

    trade_ref = db.collection("users") \
      .document(USER_UID) \
      .collection("trades") \
      .document(str(position_id))

    payload = dict(trade)
    if not trade_ref.get().exists:
        payload.update(journal_defaults)

    trade_ref.set(payload, merge=True)

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
