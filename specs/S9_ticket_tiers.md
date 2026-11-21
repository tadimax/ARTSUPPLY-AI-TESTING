# S9: Ticket tier from trailing ticket volume

Module: `sut/ticketTiers.js` (CommonJS). Only the pure functions below are in scope (not any database function).

## Business rules
- An artist's ticket tier is set only by the number of tickets they sold in the trailing 30 days.
- Fewer than 40 tickets: "free". 40 to 89 tickets: "growth". 90 or more: "scale". The lower bound of each band is inclusive.
- A missing or non-numeric count counts as 0.
- Tickets until the next tier: from "free", the number needed to reach 40. From "growth", the number needed to reach 90. From "scale", 0.

## Interface
- `tierForCount(ticketCount30d)` returns `"free"`, `"growth"` or `"scale"`.
- `ticketsUntilNextTier(ticketCount30d)` returns a non-negative integer.
- Exported constant: `TICKET_TIER_THRESHOLDS` with keys `growth` and `scale`.
