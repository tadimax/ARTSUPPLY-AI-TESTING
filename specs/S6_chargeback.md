# S6: Chargeback split between artists and the platform

Module: `sut/moneyMath.js` (CommonJS). All amounts are integer cents.

## Business rules
- A buyer disputes an order (chargeback). The disputed amount and the bank's chargeback fee are shared among the artists on the order. Each artist has a `share` between 0 and 1. Each share is rounded to the nearest cent.
- The artist owes the disputed amount only if they have already been paid out for that order. If they have not been paid, they owe nothing (the payout is simply never made).
- The chargeback fee is never the artist's debt. The platform recovers it from the artist's Stripe balance first through a transfer reversal, and the platform absorbs whatever the reversal cannot reach.
- When a reversal recovers some money from a paid-out artist: it goes to the disputed amount first, and only what is left goes to the fee. The disputed amount still unrecovered is the artist's shortfall (their debt). The fee not recovered is absorbed by the platform.
- If the artist was not paid out, nothing is recovered, there is no shortfall, and the platform absorbs the whole fee share.
- Negative recovered amounts count as 0.

## Interface
- `computeChargebackDebt({ disputedCents, feeCents, share, alreadyPaid })` where numeric fields default to 0 and `alreadyPaid` to false returns `{ dispShare, feeShare, debtShare }`.
- `splitChargebackReversal({ dispShare, feeShare, reversedCents, alreadyPaid })` returns `{ disputeReversed, feeReversed, disputeShortfall, feeAbsorbed }`.
