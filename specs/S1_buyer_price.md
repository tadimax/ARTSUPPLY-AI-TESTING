# S1: Buyer price for merch

Module: `sut/buyerPrice.js` (CommonJS). All amounts are integer cents.

## Business rules
- A buyer pays the seller's price plus a service fee folded into the displayed price. The seller still earns exactly the price they set.
- The fee on each unit has two percentage parts: a platform share and a card cost estimate of 2.9% of the unit price.
- Platform share depends on the seller tier: default 18%, "pro" 12%, "power" 10%. Any other or missing tier gets the default.
- Each percentage part is rounded to the nearest cent separately, then added.
- A fixed 30 cents is charged once per order, not per item.
- The displayed price for a single unit includes that 30 cents. A unit priced at zero (or less) has no fee at all, including no 30 cents.
- In a multi-line order, the 30 cents is added once, and only if at least one line has a price above zero. A line's quantity multiplies its percentage fee only. A missing or zero quantity counts as 1.

## Interface
Rates are expressed in "bps of 100000": 18000 means 18%, 12000 means 12%, 10000 means 10%, and the card rate 2900 means 2.9%.

- `tierBps(tier, defaultBps = 18000)` returns the platform rate for a tier name.
- `pctFeeCents(unitCents, bps = 18000)` returns the percentage-only fee for one unit.
- `unitFeeCents(unitCents, bps = 18000)` returns the fee included in one displayed unit price.
- `buyerUnitCents(unitCents, bps = 18000)` returns unit price plus unit fee. Negative prices count as zero.
- `orderFeeCents(lines)` where `lines` is an array of `{ unitCents, quantity, bps }` returns the total fee of the order.
- Exported constants: `DEFAULT_BPS`, `TIER_BPS`, `CARD_BPS`, `ORDER_FIXED_CENTS`.
