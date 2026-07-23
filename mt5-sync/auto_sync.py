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

# Reference to the account document in Firestore: users/{USER_UID}/accounts/{ACCOUNT_ID}
account_ref = db.collection("users") \
  .document(USER_UID) \
  .collection("accounts") \
  .document(ACCOUNT_ID)

# Register / Update Account Document (preserves existing properties)
account_ref.set({
    "id": ACCOUNT_ID,
    "name": "MT5",
    "broker": "BLUEBERRY",
    "currency": "USD",
    "initialBalance": 5000,
    "isActive": True
}, merge=True)

print("=" * 60)
print("              MT5 AUTO SYNC (INCREMENTAL)")
print(f"Account : {ACCOUNT_ID}")
print("Broker  : BLUEBERRY")
print("=" * 60)


# ============================================================
# HELPER FUNCTIONS FOR LAST SYNC TIMESTAMP
# ============================================================

def get_last_sync_timestamp(account_doc_ref) -> datetime:
    """
    Fetch the lastSync timestamp from the Firestore account document.
    
    Handles multiple stored data formats:
    - datetime objects / Firestore Timestamps
    - ISO strings (e.g. "YYYY-MM-DD HH:MM:SS")
    - Unix numeric timestamps (int/float)
    
    Returns:
        datetime object if lastSync exists, otherwise None (First Run).
    """
    try:
        doc = account_doc_ref.get()
        if not doc.exists:
            return None

        data = doc.to_dict()
        if not data or "lastSync" not in data:
            return None

        raw_val = data["lastSync"]
        if raw_val is None:
            return None

        # Case 1: Already a datetime object or Firestore DatetimeWithNanoseconds
        if isinstance(raw_val, datetime):
            return raw_val.replace(tzinfo=None) if raw_val.tzinfo else raw_val

        # Case 2: Numeric Unix timestamp (seconds or milliseconds)
        if isinstance(raw_val, (int, float)):
            if raw_val > 32503680000:  # If millisecond timestamp
                raw_val = raw_val / 1000.0
            return datetime.fromtimestamp(raw_val)

        # Case 3: ISO String format
        if isinstance(raw_val, str):
            clean_str = raw_val.strip().replace("Z", "").replace("T", " ")
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d"):
                try:
                    return datetime.strptime(clean_str, fmt)
                except ValueError:
                    continue
            try:
                return datetime.fromisoformat(raw_val)
            except Exception:
                pass
    except Exception as e:
        print(f"[WARNING] Could not read/parse lastSync from Firebase: {e}")

    return None


def update_last_sync_timestamp(account_doc_ref, sync_time: datetime):
    """
    Update the lastSync field in Firebase under users/{USER_UID}/accounts/{ACCOUNT_ID}.
    Stores timestamp in standard format "YYYY-MM-DD HH:MM:SS".
    """
    sync_str = sync_time.strftime("%Y-%m-%d %H:%M:%S")
    account_doc_ref.set({
        "lastSync": sync_str
    }, merge=True)


# ============================================================
# SYNC FUNCTION
# ============================================================

def run_sync():
    """
    Main sync logic:
    1. Checks for MT5 connection.
    2. Reads lastSync timestamp from Firestore:
       - First run (no lastSync): Downloads full trade history.
       - Subsequent run: Fetches only deals newer than lastSync.
    3. Handles partial closes & multiple deals by fetching position deal history.
    4. Upserts trades into Firestore (users/{USER_UID}/trades/{positionId}).
    5. Updates lastSync timestamp in Firestore after sync completion.
    """
    sync_start = datetime.now()
    now_str = sync_start.strftime("%Y-%m-%d %H:%M:%S")

    # Edge Case 1: MT5 Connection Failure
    if not mt5.initialize():
        print(f"[{now_str}] [ERROR] Failed to connect to MT5.")
        return

    # Edge Case 2: First Run vs Subsequent Runs (Check lastSync in Firebase)
    last_sync_dt = get_last_sync_timestamp(account_ref)

    if last_sync_dt is None:
        print(f"[{now_str}] [INFO] First run detected: Fetching complete MT5 trade history...")
        deals = mt5.history_deals_get(datetime(2000, 1, 1), sync_start)
        if deals is None:
            # Fallback for MT5 epoch
            deals = mt5.history_deals_get(0, int(sync_start.timestamp()))
    else:
        last_sync_str = last_sync_dt.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] [INFO] Incremental run: Fetching trades newer than lastSync ({last_sync_str})...")
        deals = mt5.history_deals_get(last_sync_dt, sync_start)

    # Edge Case 3: No new deals returned by MT5
    if deals is None or len(deals) == 0:
        print(f"[{now_str}] No new trades found.")
        # Update lastSync timestamp in Firebase
        update_last_sync_timestamp(account_ref, sync_start)
        mt5.shutdown()
        return

    # Edge Case 4 & 5: Extract unique position IDs from new deals
    # Fetching history by position ID ensures complete position details (open & close deals)
    # even for partial closes or trades opened before lastSync but closed after lastSync.
    new_position_ids = set(d.position_id for d in deals if getattr(d, "position_id", 0) > 0)

    if not new_position_ids:
        print(f"[{now_str}] No new trades found.")
        update_last_sync_timestamp(account_ref, sync_start)
        mt5.shutdown()
        return

    uploaded_count = 0
    total_net_pnl = 0.0

    for pos_id in new_position_ids:
        # Retrieve all deals associated with this position ID for full accuracy
        pos_deals = mt5.history_deals_get(position=pos_id)

        if not pos_deals:
            pos_deals = [d for d in deals if d.position_id == pos_id]

        if not pos_deals:
            continue

        opens = []
        closes = []

        for d in pos_deals:
            if d.entry == mt5.DEAL_ENTRY_IN:
                opens.append(d)
            elif d.entry in (
                mt5.DEAL_ENTRY_OUT,
                mt5.DEAL_ENTRY_INOUT,
                mt5.DEAL_ENTRY_OUT_BY,
            ):
                closes.append(d)

        # Skip positions with no exit deals (still open)
        if not closes:
            continue

        opens.sort(key=lambda x: x.time)
        closes.sort(key=lambda x: x.time)

        first_open = opens[0] if opens else pos_deals[0]
        last_close = closes[-1]

        total_volume = sum(d.volume for d in (opens if opens else pos_deals))
        net_profit = sum(d.profit for d in closes)
        commission = sum(d.commission for d in pos_deals)
        swap = sum(d.swap for d in pos_deals)
        fee = sum(getattr(d, "fee", 0) for d in pos_deals)

        total_net_pnl += net_profit

        # Maintain exact trade dictionary structure
        trade = {
            "id": str(pos_id),
            "accountId": ACCOUNT_ID,
            "positionId": pos_id,
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

        # Requirement 4: Upsert into Firebase using positionId as document key
        # merge=True updates existing document without creating duplicates or clearing custom fields
        db.collection("users") \
          .document(USER_UID) \
          .collection("trades") \
          .document(str(pos_id)) \
          .set(trade, merge=True)

        uploaded_count += 1

    # Close MT5 terminal API session
    mt5.shutdown()

    # Requirement 10: Update lastSync timestamp in Firebase after successful sync
    update_last_sync_timestamp(account_ref, sync_start)

    print("\n" + "=" * 60)
    print("SYNC COMPLETED")
    print("=" * 60)

    # Requirement 10: Print count of new trades synced or "No new trades found."
    if uploaded_count > 0:
        print(f"Trades Synced : {uploaded_count}")
        print(f"Net PnL       : ${total_net_pnl:,.2f}")
    else:
        print("No new trades found.")

    print(f"Last Sync     : {sync_start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Completed At  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


# ============================================================
# MAIN ENTRY POINT
# ============================================================

if __name__ == "__main__":
    try:
        run_sync()

        print("\n" + "=" * 60)
        print("✅ TRADEFORGE SYNC COMPLETED SUCCESSFULLY!")
        print("All MT5 trades have been synced to Firebase.")
        print("=" * 60)

        input("Press Enter to close...")

    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ SYNC FAILED!")
        print(f"Error: {e}")
        print("=" * 60)

        input("Press Enter to close...")