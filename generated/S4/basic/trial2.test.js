const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const base = {
  itemCents: 2500,
  orderSubtotalCents: 10000,
  serviceFeeLineItemCents: 500,
  shippingCents: 1000,
  taxCents: 800,
};

test("ratio and shares are computed proportionally", () => {
  const r = mod.computeReturnRefund({ ...base, returnShippingCents: 300 });
  assert.equal(r.ratio, 0.25);
  assert.equal(r.feeShare, 125);
  assert.equal(r.shipShare, 250);
  assert.equal(r.taxShare, 200);
  assert.equal(r.returnShipCents, 300);
});

test("change of mind refunds item price minus return shipping only", () => {
  const r = mod.computeReturnRefund({ ...base, returnShippingCents: 300 });
  assert.equal(r.buyerRefundCents, 2200);
});

test("seller at fault refunds everything", () => {
  const r = mod.computeReturnRefund({ ...base, returnShippingCents: 300, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 2500 + 125 + 250 + 200 + 300);
});

test("return shipping defaults to shipping share when missing", () => {
  const r = mod.computeReturnRefund({ ...base });
  assert.equal(r.returnShipCents, 250);
  assert.equal(r.buyerRefundCents, 2250);
});

test("return shipping defaults to shipping share when zero", () => {
  const r = mod.computeReturnRefund({ ...base, returnShippingCents: 0 });
  assert.equal(r.returnShipCents, 250);
});

test("seller at fault with default return shipping", () => {
  const r = mod.computeReturnRefund({ ...base, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 2500 + 125 + 250 + 200 + 250);
});

test("change of mind refund never goes below zero", () => {
  const r = mod.computeReturnRefund({ ...base, itemCents: 100, returnShippingCents: 5000 });
  assert.equal(r.buyerRefundCents, 0);
});

test("shares are rounded to nearest cent", () => {
  const r = mod.computeReturnRefund({
    itemCents: 1000,
    orderSubtotalCents: 3000,
    serviceFeeLineItemCents: 100,
    shippingCents: 500,
    taxCents: 200,
    returnShippingCents: 50,
  });
  assert.ok(Math.abs(r.ratio - 1 / 3) < 1e-9);
  assert.equal(r.feeShare, 33);
  assert.equal(r.shipShare, 167);
  assert.equal(r.taxShare, 67);
  assert.equal(r.buyerRefundCents, 950);
});

test("ratio is capped at 1", () => {
  const r = mod.computeReturnRefund({
    itemCents: 5000,
    orderSubtotalCents: 2000,
    serviceFeeLineItemCents: 100,
    shippingCents: 500,
    taxCents: 200,
    returnShippingCents: 100,
  });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 500);
  assert.equal(r.taxShare, 200);
});

test("missing subtotal uses item price, ratio 1", () => {
  const r = mod.computeReturnRefund({
    itemCents: 4000,
    serviceFeeLineItemCents: 200,
    shippingCents: 400,
    taxCents: 300,
    returnShippingCents: 100,
    sellerAtFault: true,
  });
  assert.equal(r.ratio, 1);
  assert.equal(r.buyerRefundCents, 4000 + 200 + 400 + 300 + 100);
});

test("zero subtotal uses item price", () => {
  const r = mod.computeReturnRefund({ itemCents: 4000, orderSubtotalCents: 0, shippingCents: 400 });
  assert.equal(r.ratio, 1);
  assert.equal(r.shipShare, 400);
});

test("zero item and zero subtotal does not divide by zero", () => {
  const r = mod.computeReturnRefund({});
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 0);
  assert.ok(Number.isFinite(r.ratio));
});

test("zero item with positive subtotal gives zero shares", () => {
  const r = mod.computeReturnRefund({ ...base, itemCents: 0 });
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.buyerRefundCents, 0);
});

test("whole order returned in change of mind excludes fee, shipping and tax", () => {
  const r = mod.computeReturnRefund({ ...base, itemCents: 10000, returnShippingCents: 400 });
  assert.equal(r.ratio, 1);
  assert.equal(r.buyerRefundCents, 9600);
});

test("results are integers", () => {
  const r = mod.computeReturnRefund({
    itemCents: 333,
    orderSubtotalCents: 1999,
    serviceFeeLineItemCents: 77,
    shippingCents: 551,
    taxCents: 123,
    returnShippingCents: 41,
    sellerAtFault: true,
  });
  for (const k of ["feeShare", "shipShare", "taxShare", "returnShipCents", "buyerRefundCents"]) {
    assert.ok(Number.isInteger(r[k]), k);
  }
});
