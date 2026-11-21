const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = mod.computeReturnRefund;

test("exports computeReturnRefund function", () => {
  assert.equal(typeof f, "function");
});

test("all defaults returns zeros without throwing", () => {
  const r = f({});
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 0);
});

test("change of mind: full single item order", () => {
  const r = f({
    itemCents: 2000,
    orderSubtotalCents: 2000,
    serviceFeeLineItemCents: 200,
    shippingCents: 500,
    taxCents: 160,
    returnShippingCents: 300,
  });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 200);
  assert.equal(r.shipShare, 500);
  assert.equal(r.taxShare, 160);
  assert.equal(r.returnShipCents, 300);
  assert.equal(r.buyerRefundCents, 1700);
});

test("proportional shares with a partial item", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 800,
    shippingCents: 1000,
    taxCents: 400,
    returnShippingCents: 100,
  });
  assert.equal(r.ratio, 0.25);
  assert.equal(r.feeShare, 200);
  assert.equal(r.shipShare, 250);
  assert.equal(r.taxShare, 100);
  assert.equal(r.buyerRefundCents, 2400);
});

test("shares are rounded to nearest cent", () => {
  const r = f({
    itemCents: 1000,
    orderSubtotalCents: 3000,
    serviceFeeLineItemCents: 100,
    shippingCents: 200,
    taxCents: 400,
  });
  // ratio 1/3: 33.33 -> 33, 66.67 -> 67, 133.33 -> 133
  assert.equal(r.feeShare, 33);
  assert.equal(r.shipShare, 67);
  assert.equal(r.taxShare, 133);
  assert.ok(Number.isInteger(r.feeShare));
});

test("ratio is capped at 1 when item exceeds subtotal", () => {
  const r = f({
    itemCents: 5000,
    orderSubtotalCents: 2000,
    serviceFeeLineItemCents: 100,
    shippingCents: 300,
    taxCents: 50,
    returnShippingCents: 10,
  });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 300);
  assert.equal(r.taxShare, 50);
});

test("missing subtotal falls back to item price (ratio 1)", () => {
  const r = f({ itemCents: 1500, shippingCents: 200, serviceFeeLineItemCents: 90 });
  assert.equal(r.ratio, 1);
  assert.equal(r.shipShare, 200);
  assert.equal(r.feeShare, 90);
});

test("zero subtotal falls back to item price", () => {
  const r = f({ itemCents: 1500, orderSubtotalCents: 0, taxCents: 120 });
  assert.equal(r.ratio, 1);
  assert.equal(r.taxShare, 120);
});

test("subtotal and item both zero: no division by zero, no NaN", () => {
  const r = f({ itemCents: 0, orderSubtotalCents: 0, shippingCents: 500, taxCents: 50 });
  assert.equal(r.ratio, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  for (const k of Object.keys(r)) {
    assert.ok(Number.isFinite(r[k]), k + " should be finite");
  }
});

test("return shipping defaults to shipping share when missing", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 2000, shippingCents: 600 });
  assert.equal(r.shipShare, 300);
  assert.equal(r.returnShipCents, 300);
  assert.equal(r.buyerRefundCents, 700);
});

test("return shipping defaults to shipping share when zero", () => {
  const r = f({
    itemCents: 1000,
    orderSubtotalCents: 2000,
    shippingCents: 600,
    returnShippingCents: 0,
  });
  assert.equal(r.returnShipCents, 300);
  assert.equal(r.buyerRefundCents, 700);
});

test("explicit return shipping overrides the default", () => {
  const r = f({
    itemCents: 1000,
    orderSubtotalCents: 2000,
    shippingCents: 600,
    returnShippingCents: 450,
  });
  assert.equal(r.returnShipCents, 450);
  assert.equal(r.buyerRefundCents, 550);
});

test("change of mind refund never goes below zero", () => {
  const r = f({
    itemCents: 500,
    orderSubtotalCents: 500,
    returnShippingCents: 900,
  });
  assert.equal(r.buyerRefundCents, 0);
});

test("change of mind does not refund fee, shipping or tax", () => {
  const r = f({
    itemCents: 1000,
    orderSubtotalCents: 1000,
    serviceFeeLineItemCents: 999,
    shippingCents: 999,
    taxCents: 999,
    returnShippingCents: 100,
    sellerAtFault: false,
  });
  assert.equal(r.buyerRefundCents, 900);
});

test("seller at fault refunds everything", () => {
  const r = f({
    itemCents: 2000,
    orderSubtotalCents: 2000,
    serviceFeeLineItemCents: 200,
    shippingCents: 500,
    taxCents: 160,
    returnShippingCents: 300,
    sellerAtFault: true,
  });
  assert.equal(r.buyerRefundCents, 2000 + 200 + 500 + 160 + 300);
});

test("seller at fault with proportional shares and default return shipping", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 800,
    shippingCents: 1000,
    taxCents: 400,
    sellerAtFault: true,
  });
  // 2500 + 200 + 250 + 100 + return ship (defaults to 250)
  assert.equal(r.returnShipCents, 250);
  assert.equal(r.buyerRefundCents, 3300);
});

test("seller at fault with rounded shares", () => {
  const r = f({
    itemCents: 1000,
    orderSubtotalCents: 3000,
    serviceFeeLineItemCents: 100,
    shippingCents: 200,
    taxCents: 400,
    returnShippingCents: 50,
    sellerAtFault: true,
  });
  assert.equal(r.buyerRefundCents, 1000 + 33 + 67 + 133 + 50);
});

test("seller at fault refund exceeds change of mind refund", () => {
  const base = {
    itemCents: 1200,
    orderSubtotalCents: 3000,
    serviceFeeLineItemCents: 150,
    shippingCents: 400,
    taxCents: 240,
    returnShippingCents: 100,
  };
  const a = f({ ...base, sellerAtFault: false });
  const b = f({ ...base, sellerAtFault: true });
  assert.ok(b.buyerRefundCents > a.buyerRefundCents);
});

test("result values are integers", () => {
  const r = f({
    itemCents: 777,
    orderSubtotalCents: 2999,
    serviceFeeLineItemCents: 133,
    shippingCents: 457,
    taxCents: 211,
    sellerAtFault: true,
  });
  for (const k of ["feeShare", "shipShare", "taxShare", "returnShipCents", "buyerRefundCents"]) {
    assert.ok(Number.isInteger(r[k]), k);
  }
});
