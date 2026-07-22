import MetaTrader5 as mt5
from datetime import datetime
from pprint import pprint

if not mt5.initialize():
    print("Initialization failed:", mt5.last_error())
    quit()

# Get all history from Jan 1, 2024 until now
from_date = datetime(2024, 1, 1)
to_date = datetime.now()

deals = mt5.history_deals_get(from_date, to_date)

if deals is None:
    print("No trade history found")
else:
    print(f"Found {len(deals)} deals\n")

    for deal in deals[-5:]:
        pprint(deal._asdict())
        print("-" * 80)

mt5.shutdown()