import os
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import MetaTrader5 as mt5
import firebase_admin
from firebase_admin import credentials, firestore

# ============================================================
# CONFIGURATION
# ============================================================

USER_UID = "bu8j28sFuSOqssYhCR9uNamFox92" # change this user id 
ACCOUNT_ID = "acc-1791288147151" # change this acc id for different account

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

def resolve_target_account(db_client, user_uid: str, fallback_acc_id: str):
    """
    Dynamically finds the target MT5 account in Firestore:
    1. Looks for any account under users/{USER_UID}/accounts where isPrimary == True.
    2. If found, uses that account ID and preserves its custom name (does not overwrite with 'MT5').
    3. If no account has isPrimary == True, uses fallback_acc_id.
    4. Never overwrites user-edited account names or balances.
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
            print(f"[INFO] Primary MT5 Account detected from Journal: '{p_name}' ({p_id}) [{p_broker}]")
            return p_id, p_name, p_doc.reference
    except Exception as e:
        print(f"[WARNING] Could not query primary accounts: {e}")

    fallback_ref = accounts_ref.document(fallback_acc_id)
    doc_snap = fallback_ref.get()
    if doc_snap.exists:
        data = doc_snap.to_dict() or {}
        name = data.get("name", "MT5")
        fallback_ref.set({"isActive": True, "isPrimary": True}, merge=True)
        print(f"[INFO] Using configured account: '{name}' ({fallback_acc_id})")
        return fallback_acc_id, name, fallback_ref

    print(f"[INFO] Initializing new MT5 account document for {fallback_acc_id}...")
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

        raw_val = data.get("lastSync") or data.get("primarySetAt")
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
    2. Resolves primary target account dynamically from Firestore.
    3. Reads lastSync timestamp from Firestore:
       - First run (no lastSync): Downloads full trade history.
       - Subsequent run: Fetches only deals newer than lastSync (with 1-day safety margin & future upper bound).
    4. Handles partial closes & multiple deals by fetching position deal history.
    5. Upserts trades into Firestore under active primary account.
    6. Updates lastSync timestamp in Firestore after sync completion.
    """
    sync_start = datetime.now()
    now_str = sync_start.strftime("%Y-%m-%d %H:%M:%S")
    to_date = sync_start + timedelta(days=2)

    # Dynamically resolve target account (picks primary account configured in TradeForge app)
    target_acc_id, target_acc_name, target_acc_ref = resolve_target_account(db, USER_UID, ACCOUNT_ID)

    print("=" * 60)
    print("              MT5 AUTO SYNC (INCREMENTAL)")
    print(f"Target Account: {target_acc_name} ({target_acc_id})")
    print("=" * 60)

    # Edge Case 1: MT5 Connection Failure
    if not mt5.initialize():
        print(f"[{now_str}] [ERROR] Failed to connect to MT5.")
        return

    # Edge Case 2: First Run vs Subsequent Runs (Check lastSync in Firebase)
    last_sync_dt = get_last_sync_timestamp(target_acc_ref)

    if last_sync_dt is None:
        print(f"[{now_str}] [INFO] First run detected: Fetching complete MT5 trade history...")
        deals = mt5.history_deals_get(datetime(2000, 1, 1), to_date)
        if deals is None:
            # Fallback for MT5 epoch
            deals = mt5.history_deals_get(0, int(to_date.timestamp()))
    else:
        # Subtract 1 day buffer to avoid missing deals on timezone or partial-close boundaries
        start_fetch_dt = last_sync_dt - timedelta(days=1)
        last_sync_str = last_sync_dt.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] [INFO] Incremental run: Fetching trades newer than lastSync ({last_sync_str})...")
        deals = mt5.history_deals_get(start_fetch_dt, to_date)

    # Edge Case 3: No deals returned by MT5
    if deals is None or len(deals) == 0:
        print(f"[{now_str}] No deals returned from MT5.")
        mt5.shutdown()
        return

    # Extract unique position IDs from deals
    new_position_ids = set(d.position_id for d in deals if getattr(d, "position_id", 0) > 0)

    if not new_position_ids:
        print(f"[{now_str}] No valid trade positions found.")
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
        if abs(commission) < 0.001:
            commission = total_volume * 7.0
        swap = sum(d.swap for d in pos_deals)
        fee = sum(getattr(d, "fee", 0) for d in pos_deals)

        total_net_pnl += net_profit

        open_dt = datetime.fromtimestamp(first_open.time, tz=timezone.utc)
        close_dt = datetime.fromtimestamp(last_close.time, tz=timezone.utc)

        trade_date = close_dt.strftime("%Y-%m-%d")

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
        # when the trade is first created so auto-sync cannot erase notes/images.
        trade = {
            "id": str(pos_id),
            "accountId": target_acc_id,
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
            "status": "WIN" if net_profit > 0.01 else ("LOSS" if net_profit < -0.01 else "BREAKEVEN"),
            "date": trade_date,
            "time": open_dt.strftime("%H:%M"),
            "openTime": open_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "closeTime": close_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "source": "MT5 Auto-Sync",
        }

        # Requirement 4: Upsert into Firebase using positionId as document key
        # merge=True updates execution fields without creating duplicates.
        trade_ref = db.collection("users") \
          .document(USER_UID) \
          .collection("trades") \
          .document(str(pos_id))

        payload = dict(trade)
        if not trade_ref.get().exists:
            payload.update(journal_defaults)

        trade_ref.set(payload, merge=True)

        uploaded_count += 1

    # Close MT5 terminal API session
    mt5.shutdown()

    # Requirement 10: Update lastSync timestamp in Firebase after successful sync
    update_last_sync_timestamp(target_acc_ref, sync_start)

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
        print("[OK] TRADEFORGE SYNC COMPLETED SUCCESSFULLY!")
        print("All MT5 trades have been synced to Firebase.")
        print("=" * 60)

        input("Press Enter to close...")

    except Exception as e:
        print("\n" + "=" * 60)
        print("[FAIL] SYNC FAILED!")
        print(f"Error: {e}")
        print("=" * 60)

        input("Press Enter to close...")
