const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = mod.computeReturnRefund;

const base = {
  itemCents: 2500,
  orderSubtotalCents: 10000,
  serviceFeeLineItemCents: 1000,
  shippingCents: 800,
  taxCents: 400,
  returnShippingCents: 300,
};

test("change of mind: refund is item price minus return shipping, shares computed", () => {
  const r = f({ ...base, sellerAtFault: false });
  assert.equal(r.ratio, 0.25);
  assert.equal(r.feeShare, 250);
  assert.equal(r.shipShare, 200);
  assert.equal(r.taxShare, 100);
  assert.equal(r.returnShipCents, 300);
  assert.equal(r.buyerRefundCents, 2200);
});

test("sellerAtFault defaults to false (change of mind)", () => {
  const r = f({ ...base });
  assert.equal(r.buyerRefundCents, 2200);
});

test("change of mind does NOT refund fee, shipping or tax", () => {
  const r = f({ ...base, sellerAtFault: false });
  assert.equal(r.buyerRefundCents, base.itemCents - base.returnShippingCents);
  assert.notEqual(r.buyerRefundCents, 2200 + r.feeShare);
  assert.notEqual(r.buyerRefundCents, 2200 + r.shipShare);
  assert.notEqual(r.buyerRefundCents, 2200 + r.taxShare);
});

test("seller at fault: refund is item + fee share + ship share + tax share + return shipping", () => {
  const r = f({ ...base, sellerAtFault: true });
  assert.equal(r.feeShare, 250);
  assert.equal(r.shipShare, 200);
  assert.equal(r.taxShare, 100);
  assert.equal(r.returnShipCents, 300);
  assert.equal(r.buyerRefundCents, 3350);
});

test("return shipping missing defaults to ship share (change of mind)", () => {
  const r = f({ ...base, returnShippingCents: undefined, sellerAtFault: false });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 2300);
});

test("return shipping zero defaults to ship share (change of mind)", () => {
  const r = f({ ...base, returnShippingCents: 0, sellerAtFault: false });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 2300);
});

test("return shipping missing defaults to ship share (seller at fault)", () => {
  const r = f({ ...base, returnShippingCents: undefined, sellerAtFault: true });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 3250);
});

test("return shipping zero defaults to ship share (seller at fault)", () => {
  const r = f({ ...base, returnShippingCents: 0, sellerAtFault: true });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 3250);
});

test("supplied return shipping is used instead of ship share", () => {
  const r = f({ ...base, returnShippingCents: 1, sellerAtFault: false });
  assert.equal(r.returnShipCents, 1);
  assert.equal(r.buyerRefundCents, 2499);
});

test("ratio cap: item just below subtotal is not capped", () => {
  const r = f({ itemCents: 9999, orderSubtotalCents: 10000, serviceFeeLineItemCents: 1000, shippingCents: 0, taxCents: 0 });
  assert.equal(r.ratio, 9999 / 10000);
  assert.equal(r.feeShare, 1000);
});

test("ratio cap: item exactly equal to subtotal gives ratio 1", () => {
  const r = f({ itemCents: 10000, orderSubtotalCents: 10000, serviceFeeLineItemCents: 1000, shippingCents: 800, taxCents: 400, returnShippingCents: 100 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 1000);
  assert.equal(r.shipShare, 800);
  assert.equal(r.taxShare, 400);
});

test("ratio cap: item above subtotal is capped at 1", () => {
  const r = f({ itemCents: 12000, orderSubtotalCents: 10000, serviceFeeLineItemCents: 1000, shippingCents: 800, taxCents: 400, returnShippingCents: 100, sellerAtFault: true });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 1000);
  assert.equal(r.shipShare, 800);
  assert.equal(r.taxShare, 400);
  assert.equal(r.buyerRefundCents, 12000 + 1000 + 800 + 400 + 100);
});

test("ratio is 0.5 when item is half of subtotal", () => {
  const r = f({ itemCents: 500, orderSubtotalCents: 1000 });
  assert.equal(r.ratio, 0.5);
});

test("rounding: thirds round to nearest cent (33.33 -> 33, 66.67 -> 67, 16.67 -> 17)", () => {
  const r = f({ itemCents: 1, orderSubtotalCents: 3, serviceFeeLineItemCents: 100, shippingCents: 200, taxCents: 50, returnShippingCents: 10, sellerAtFault: true });
  assert.equal(r.feeShare, 33);
  assert.equal(r.shipShare, 67);
  assert.equal(r.taxShare, 17);
  assert.equal(r.buyerRefundCents, 1 + 33 + 67 + 17 + 10);
});

test("rounding: just under half cent rounds down (0.333 -> 0)", () => {
  const r = f({ itemCents: 1, orderSubtotalCents: 3, serviceFeeLineItemCents: 1, shippingCents: 1, taxCents: 1 });
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
});

test("rounding: just over half cent rounds up (0.667 -> 1)", () => {
  const r = f({ itemCents: 2, orderSubtotalCents: 3, serviceFeeLineItemCents: 1, shippingCents: 1, taxCents: 1 });
  assert.equal(r.feeShare, 1);
  assert.equal(r.shipShare, 1);
  assert.equal(r.taxShare, 1);
});

test("rounding: exact half cent rounds to nearest (up)", () => {
  const r = f({ itemCents: 1, orderSubtotalCents: 2, serviceFeeLineItemCents: 1, shippingCents: 3, taxCents: 5 });
  assert.equal(r.feeShare, 1);
  assert.equal(r.shipShare, 2);
  assert.equal(r.taxShare, 3);
});

test("rounded ship share is the default return shipping and reduces change-of-mind refund", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 200, taxCents: 50, sellerAtFault: false });
  assert.equal(r.shipShare, 67);
  assert.equal(r.returnShipCents, 67);
  assert.equal(r.buyerRefundCents, 933);
});

test("subtotal missing uses item price as subtotal (ratio 1)", () => {
  const r = f({ itemCents: 500, serviceFeeLineItemCents: 100, shippingCents: 50, taxCents: 20, returnShippingCents: 10, sellerAtFault: true });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 50);
  assert.equal(r.taxShare, 20);
  assert.equal(r.buyerRefundCents, 500 + 100 + 50 + 20 + 10);
});

test("subtotal zero uses item price as subtotal (ratio 1)", () => {
  const r = f({ itemCents: 500, orderSubtotalCents: 0, serviceFeeLineItemCents: 100, shippingCents: 50, taxCents: 20, returnShippingCents: 10 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 50);
  assert.equal(r.taxShare, 20);
  assert.equal(r.buyerRefundCents, 490);
});

test("subtotal and item both zero: no division by zero, all zero", () => {
  const r = f({ itemCents: 0, orderSubtotalCents: 0, serviceFeeLineItemCents: 100, shippingCents: 50, taxCents: 20 });
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 0);
});

test("all defaults: empty object gives zeros", () => {
  const r = f({});
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 0);
});

test("all defaults at fault: still zero", () => {
  const r = f({ sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 0);
});

test("item only: subtotal falls back to item, other amounts default to 0", () => {
  const r = f({ itemCents: 1000, sellerAtFault: true });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 1000);
});

test("change of mind: refund never below zero when return shipping exceeds item", () => {
  const r = f({ itemCents: 100, orderSubtotalCents: 100, returnShippingCents: 500, sellerAtFault: false });
  assert.equal(r.buyerRefundCents, 0);
});

test("change of mind clamp: return shipping just below, at, and just above item price", () => {
  const below = f({ itemCents: 500, orderSubtotalCents: 500, returnShippingCents: 499 });
  const at = f({ itemCents: 500, orderSubtotalCents: 500, returnShippingCents: 500 });
  const above = f({ itemCents: 500, orderSubtotalCents: 500, returnShippingCents: 501 });
  assert.equal(below.buyerRefundCents, 1);
  assert.equal(at.buyerRefundCents, 0);
  assert.equal(above.buyerRefundCents, 0);
});

test("change of mind with default return shipping can clamp to zero", () => {
  const r = f({ itemCents: 100, orderSubtotalCents: 100, shippingCents: 300, sellerAtFault: false });
  assert.equal(r.shipShare, 300);
  assert.equal(r.returnShipCents, 300);
  assert.equal(r.buyerRefundCents, 0);
});

test("seller at fault with partial ratio and rounding on all components", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 200, taxCents: 50, returnShippingCents: 400, sellerAtFault: true });
  assert.equal(r.feeShare, 33);
  assert.equal(r.shipShare, 67);
  assert.equal(r.taxShare, 17);
  assert.equal(r.buyerRefundCents, 1000 + 33 + 67 + 17 + 400);
});

test("change of mind and fault differ by exactly fee + ship + tax shares plus return shipping", () => {
  const a = f({ ...base, sellerAtFault: false });
  const b = f({ ...base, sellerAtFault: true });
  assert.equal(b.buyerRefundCents - a.buyerRefundCents, 250 + 200 + 100 + 300 + 300);
});
