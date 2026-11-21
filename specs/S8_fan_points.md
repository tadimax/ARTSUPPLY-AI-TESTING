# S8: Fan points

Module: `sut/moneyMath.js` (CommonJS). Money is integer cents.

## Business rules
- Earning: a buyer earns 1 point for every whole dollar paid. Partial dollars earn nothing. Negative or non-numeric amounts earn 0.
- Spending: 500 points take $1 off. Only whole dollars can be redeemed, so points are spent in blocks of 500.
- Cap: points can cover at most 5% of an order's subtotal, and the cap is applied in whole dollars (the cap amount is rounded down to whole cents first, then down to whole dollars).
- A buyer with fewer than 500 available points redeems nothing.
- The number of dollars redeemed is the smaller of the cap in dollars and the number of full 500-point blocks the buyer has. Points redeemed is dollars times 500. Discount is dollars times 100 cents.
- Negative or non-numeric points or subtotal count as 0. Fractional points are rounded down.

## Interface
- `computePointsEarned(amountTotalCents)` returns the points earned.
- `computePointsRedemption(subtotalCents, availablePoints)` returns `{ pointsRedeemed, discountCents }`.
- Exported constants: `POINTS_PER_DOLLAR_EARNED`, `POINTS_PER_DOLLAR_OFF`, `POINTS_MAX_DISCOUNT_BPS`.
