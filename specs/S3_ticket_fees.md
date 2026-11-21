# S3: Event ticket fees

Module: `sut/moneyMath.js` (CommonJS). All amounts are integer cents.

## Business rules
- The buyer pays two fees on top of the ticket price. The artist receives the full ticket face value.
- Platform fee: a percentage of the ticket subtotal that depends on the artist's ticket tier: "free" 5%, "growth" 3.5%, "scale" 2%. An unknown tier is treated as "free". Rounded to the nearest cent.
- Processing fee: 2.9% of the subtotal, rounded to the nearest cent, plus a flat 58 cents. This is the same for every tier.
- Payout: subtotal minus platform fee minus processing fee, and never below zero.
- The result also reports the platform rate used as `marginBps` in bps of 10000 (500 for 5%).

## Interface
- `computeTicketFees({ grossCents = 0, tier = "free" } = {})` returns `{ marginBps, platformFeeCents, processingFeeCents, payoutCents }`. A missing or non-numeric `grossCents` counts as 0.
- Exported constants: `TICKET_PLATFORM_MARGIN_BPS`, `TICKET_PROCESSING_PCT_BPS`, `TICKET_PROCESSING_FLAT_CENTS`.
