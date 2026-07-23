import MetaTrader5 as mt5
from datetime import datetime
from collections import defaultdict, Counter

if not mt5.initialize():
    print("Initialization failed")
    quit()

from_date = datetime(2010, 1, 1)
to_date = datetime.now()

deals = mt5.history_deals_get(from_date, to_date)
positions = defaultdict(list)
for deal in deals:
    positions[deal.position_id].append(deal)

print(f"Total MT5 deals: {len(deals)}")
print(f"Total MT5 positions: {len(positions)}")

trades_by_month = Counter()
skipped_positions = []

for pos_id, pos_deals in positions.items():
    opens = [d for d in pos_deals if d.entry == mt5.DEAL_ENTRY_IN]
    closes = [d for d in pos_deals if d.entry in (mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_INOUT, mt5.DEAL_ENTRY_OUT_BY)]
    
    if not closes:
        # Check all deal entries for this position
        entries = [d.entry for d in pos_deals]
        skipped_positions.append((pos_id, entries, [d.type for d in pos_deals]))
        continue

    # Use first deal or first open
    first_deal = opens[0] if opens else pos_deals[0]
    month = datetime.fromtimestamp(first_deal.time).strftime("%Y-%m")
    trades_by_month[month] += 1

print("\nProcessed Trades by Month:")
for m, c in sorted(trades_by_month.items()):
    print(f"  {m}: {c} trades")

print(f"\nSkipped positions count: {len(skipped_positions)}")
if skipped_positions:
    print("Sample skipped positions (ID, entry_types, order_types):")
    for sp in skipped_positions[:5]:
        print(" ", sp)

mt5.shutdown()