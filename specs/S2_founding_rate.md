# S2: Founding-artist rate

Module: `sut/buyerPrice.js` (CommonJS). Rates in "bps of 100000" (18000 = 18%).

## Business rules
- An admin can give a founding artist a reduced platform rate. It is stored on the seller's user record as `foundingFee: { bps, until }` where `until` is an ISO date string.
- The founding rate is active only while `until` is strictly in the future relative to the supplied current time. At the exact expiry instant it is no longer active.
- A founding rate is only valid if `bps` is a finite non-negative number. A zero rate is valid. A missing record, missing `foundingFee`, non-numeric `bps` or unparseable `until` means not active.
- The effective platform rate is the tier rate (default 18%, "pro" 12%, "power" 10%). If a founding rate is active, the effective rate is the lower of the tier rate and the founding rate. A founding rate never raises the rate above what the tier already gives.

## Interface
- `foundingActive(user, nowMs = Date.now())` returns a boolean.
- `bpsFor(user, defaultBps = 18000, nowMs = Date.now())` returns the effective platform rate in bps of 100000. `user` may be null or undefined, and has optional `sellerTier` and `foundingFee`.
