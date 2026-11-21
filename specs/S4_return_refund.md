# S4: Refund for a returned line item

Module: `sut/moneyMath.js` (CommonJS). All amounts are integer cents.

## Business rules
- A buyer returns one line item from an order. The item's share of the order is its price divided by the order subtotal, capped at 1 (so the share is a ratio between 0 and 1).
- Each order-level amount is shared in that ratio and rounded to the nearest cent: the platform service fee line item, the shipping charged, and the tax charged.
- If the order subtotal is missing or zero, use the item price as the subtotal. If that is also zero, use 1, so no division by zero occurs.
- Return shipping: the amount the buyer pays to send the item back. If none is supplied (missing or zero), it defaults to the item's shipping share.
- Change-of-mind return (seller not at fault): the buyer is refunded the item price minus the return shipping, never below zero. Service fee, outbound shipping and tax are NOT refunded.
- Seller at fault: the buyer is refunded everything: item price plus fee share, shipping share, tax share and the return shipping.

## Interface
- `computeReturnRefund({ itemCents, orderSubtotalCents, serviceFeeLineItemCents, shippingCents, taxCents, returnShippingCents, sellerAtFault })` where every field defaults to 0 (or false) returns `{ ratio, feeShare, shipShare, taxShare, returnShipCents, buyerRefundCents }`.
