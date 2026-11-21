const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = mod.computeReturnRefund;

test("all fields default to zero or false", () => {
  const r = f({});
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 0);
});

test("ratio is item price divided by subtotal (one third)", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000 });
  assert.equal(r.ratio, 1000 / 3000);
});

test("shares rounded to nearest cent, ratio 1/3 (rounds down cases and up case)", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250 });
  assert.equal(r.feeShare, 33);
  assert.equal(r.shipShare, 167);
  assert.equal(r.taxShare, 83);
});

test("shares rounded to nearest cent, ratio 2/3", () => {
  const r = f({ itemCents: 2000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250 });
  assert.equal(r.feeShare, 67);
  assert.equal(r.shipShare, 333);
  assert.equal(r.taxShare, 167);
});

test("rounding just under half rounds down (1.2 -> 1)", () => {
  const r = f({ itemCents: 3, orderSubtotalCents: 10, serviceFeeLineItemCents: 4 });
  assert.equal(r.feeShare, 1);
});

test("rounding just over half rounds up (1.8 -> 2)", () => {
  const r = f({ itemCents: 3, orderSubtotalCents: 10, serviceFeeLineItemCents: 6 });
  assert.equal(r.feeShare, 2);
});

test("small share under half cent rounds to zero (0.4 -> 0)", () => {
  const r = f({ itemCents: 1, orderSubtotalCents: 5, serviceFeeLineItemCents: 2, shippingCents: 2, taxCents: 2 });
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
});

test("ratio just below cap (999/1000) is not capped", () => {
  const r = f({ itemCents: 999, orderSubtotalCents: 1000, serviceFeeLineItemCents: 100, shippingCents: 200 });
  assert.equal(r.ratio, 0.999);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 200);
});

test("ratio exactly at cap when item equals subtotal", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 1000, serviceFeeLineItemCents: 100, shippingCents: 200, taxCents: 50 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 200);
  assert.equal(r.taxShare, 50);
});

test("ratio capped at 1 when item exceeds subtotal", () => {
  const r = f({ itemCents: 1500, orderSubtotalCents: 1000, serviceFeeLineItemCents: 100, shippingCents: 200, taxCents: 50 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 200);
  assert.equal(r.taxShare, 50);
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 1300);
});

test("capped ratio, seller at fault refunds all", () => {
  const r = f({ itemCents: 1500, orderSubtotalCents: 1000, serviceFeeLineItemCents: 100, shippingCents: 200, taxCents: 50, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 2050);
});

test("missing subtotal falls back to item price (ratio 1)", () => {
  const r = f({ itemCents: 500, serviceFeeLineItemCents: 40, shippingCents: 100, taxCents: 10 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 40);
  assert.equal(r.shipShare, 100);
  assert.equal(r.taxShare, 10);
});

test("zero subtotal falls back to item price (ratio 1)", () => {
  const r = f({ itemCents: 500, orderSubtotalCents: 0, serviceFeeLineItemCents: 40, shippingCents: 100, taxCents: 10 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 40);
  assert.equal(r.shipShare, 100);
  assert.equal(r.taxShare, 10);
});

test("zero subtotal and zero item uses 1 as subtotal, no division by zero", () => {
  const r = f({ itemCents: 0, orderSubtotalCents: 0, serviceFeeLineItemCents: 100, shippingCents: 100, taxCents: 100 });
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.buyerRefundCents, 0);
  assert.ok(Number.isFinite(r.ratio));
});

test("return shipping defaults to shipping share when missing", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, shippingCents: 500 });
  assert.equal(r.returnShipCents, 167);
});

test("return shipping defaults to shipping share when zero", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 1000, shippingCents: 200, returnShippingCents: 0 });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 800);
});

test("supplied return shipping is used instead of default", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 1000, shippingCents: 200, returnShippingCents: 150 });
  assert.equal(r.returnShipCents, 150);
  assert.equal(r.buyerRefundCents, 850);
});

test("change of mind: refund is item minus default return shipping, fee/shipping/tax not refunded (ratio 1/3)", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250 });
  assert.equal(r.buyerRefundCents, 833);
  assert.notEqual(r.buyerRefundCents, 1000 - 167 + 33);
});

test("change of mind: ratio 2/3", () => {
  const r = f({ itemCents: 2000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250 });
  assert.equal(r.returnShipCents, 333);
  assert.equal(r.buyerRefundCents, 1667);
});

test("change of mind: fee, tax and outbound shipping make no difference to refund", () => {
  const a = f({ itemCents: 1000, orderSubtotalCents: 1000, returnShippingCents: 100 });
  const b = f({ itemCents: 1000, orderSubtotalCents: 1000, serviceFeeLineItemCents: 300, shippingCents: 400, taxCents: 500, returnShippingCents: 100 });
  assert.equal(a.buyerRefundCents, 900);
  assert.equal(b.buyerRefundCents, 900);
});

test("explicit sellerAtFault false behaves as change of mind", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 1000, serviceFeeLineItemCents: 100, taxCents: 50, returnShippingCents: 100, sellerAtFault: false });
  assert.equal(r.buyerRefundCents, 900);
});

test("change of mind: return shipping one below item gives 1", () => {
  const r = f({ itemCents: 500, orderSubtotalCents: 500, returnShippingCents: 499 });
  assert.equal(r.buyerRefundCents, 1);
});

test("change of mind: return shipping equal to item gives 0", () => {
  const r = f({ itemCents: 500, orderSubtotalCents: 500, returnShippingCents: 500 });
  assert.equal(r.buyerRefundCents, 0);
});

test("change of mind: return shipping one above item is floored at 0", () => {
  const r = f({ itemCents: 500, orderSubtotalCents: 500, returnShippingCents: 501 });
  assert.equal(r.buyerRefundCents, 0);
});

test("change of mind: return shipping far above item is floored at 0, never negative", () => {
  const r = f({ itemCents: 100, orderSubtotalCents: 100, returnShippingCents: 500 });
  assert.equal(r.buyerRefundCents, 0);
});

test("seller at fault: refund is everything with default return shipping (ratio 1/3)", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250, sellerAtFault: true });
  // 1000 + 33 + 167 + 83 + 167
  assert.equal(r.buyerRefundCents, 1450);
});

test("seller at fault: ratio 2/3", () => {
  const r = f({ itemCents: 2000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250, sellerAtFault: true });
  // 2000 + 67 + 333 + 167 + 333
  assert.equal(r.buyerRefundCents, 2900);
});

test("seller at fault: supplied return shipping is added", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250, returnShippingCents: 100, sellerAtFault: true });
  // 1000 + 33 + 167 + 83 + 100
  assert.equal(r.returnShipCents, 100);
  assert.equal(r.buyerRefundCents, 1383);
});

test("seller at fault with zero everything except item returns item", () => {
  const r = f({ itemCents: 700, orderSubtotalCents: 700, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 700);
});

test("seller at fault with only return shipping and zero item", () => {
  const r = f({ itemCents: 0, orderSubtotalCents: 0, returnShippingCents: 50, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 50);
});

test("fault refund exceeds change-of-mind refund for same order", () => {
  const base = { itemCents: 1000, orderSubtotalCents: 3000, serviceFeeLineItemCents: 100, shippingCents: 500, taxCents: 250 };
  const com = f({ ...base, sellerAtFault: false });
  const fault = f({ ...base, sellerAtFault: true });
  assert.equal(com.buyerRefundCents, 833);
  assert.equal(fault.buyerRefundCents, 1450);
  assert.equal(fault.buyerRefundCents - com.buyerRefundCents, 617);
});

test("returned object has the documented fields", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 1000 });
  assert.deepEqual(Object.keys(r).sort(), ["buyerRefundCents", "feeShare", "ratio", "returnShipCents", "shipShare", "taxShare"].sort());
});
