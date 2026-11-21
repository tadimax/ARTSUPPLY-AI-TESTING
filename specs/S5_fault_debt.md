# S5: Seller debt for an at-fault return

Module: `sut/moneyMath.js` (CommonJS). All amounts are integer cents.

## Business rules
- Card processing cost estimate for an amount: 2.9% of the amount rounded to the nearest cent, plus a flat 30 cents. A missing or non-numeric amount counts as 0 (the 30 cents still applies).
- When a return is the seller's fault, the seller owes the platform for costs it had to cover.
- First offence: outbound shipping share + return shipping + the card processing cost estimate of the buyer refund.
- Repeat offender (second offence or later): the same, plus the platform fee share of that order.
- Missing or non-numeric inputs count as 0.

## Interface
- `estimateStripeFeeCents(amountCents)` returns the card processing cost estimate.
- `computeFaultDebt({ shipShare, returnShipCents, buyerRefundCents, feeShare, repeatOffender })` where fields default to 0 or false returns the debt in cents as a number.
