const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = mod.computeReturnRefund;

const base = {
  itemCents: 2000,
  orderSubtotalCents: 10000,
  serviceFeeLineItemCents: 500,
  shippingCents: 1000,
  taxCents: 800,
};

test("ratio and shares are computed proportionally", () => {
  const r = f({ ...base, returnShippingCents: 300 });
  assert.equal(r.ratio, 0.2);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 200);
  assert.equal(r.taxShare, 160);
  assert.equal(r.returnShipCents, 300);
});

test("change of mind: item price minus explicit return shipping", () => {
  const r = f({ ...base, returnShippingCents: 300 });
  assert.equal(r.buyerRefundCents, 1700);
});

test("return shipping defaults to shipping share when missing", () => {
  const r = f({ ...base });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 1800);
});

test("return shipping of zero defaults to shipping share", () => {
  const r = f({ ...base, returnShippingCents: 0 });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 1800);
});

test("change of mind refund never below zero", () => {
  const r = f({ ...base, itemCents: 100, returnShippingCents: 500 });
  assert.equal(r.buyerRefundCents, 0);
});

test("seller at fault: refund everything including return shipping", () => {
  const r = f({ ...base, returnShippingCents: 300, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 2000 + 100 + 200 + 160 + 300);
});

test("seller at fault with default return shipping", () => {
  const r = f({ ...base, sellerAtFault: true });
  assert.equal(r.returnShipCents, 200);
  assert.equal(r.buyerRefundCents, 2000 + 100 + 200 + 160 + 200);
});

test("ratio capped at 1 when item exceeds subtotal", () => {
  const r = f({
    itemCents: 5000,
    orderSubtotalCents: 2000,
    serviceFeeLineItemCents: 500,
    shippingCents: 400,
    taxCents: 300,
    sellerAtFault: true,
    returnShippingCents: 100,
  });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 500);
  assert.equal(r.shipShare, 400);
  assert.equal(r.taxShare, 300);
  assert.equal(r.buyerRefundCents, 5000 + 500 + 400 + 300 + 100);
});

test("missing subtotal uses item price (ratio 1)", () => {
  const r = f({ itemCents: 1000, serviceFeeLineItemCents: 100, shippingCents: 50, taxCents: 80 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 50);
  assert.equal(r.taxShare, 80);
});

test("zero subtotal uses item price (ratio 1)", () => {
  const r = f({ itemCents: 1000, orderSubtotalCents: 0, shippingCents: 50 });
  assert.equal(r.ratio, 1);
  assert.equal(r.shipShare, 50);
});

test("zero item and zero subtotal: no division by zero", () => {
  const r = f({});
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.returnShipCents, 0);
  assert.equal(r.buyerRefundCents, 0);
  assert.ok(Number.isFinite(r.ratio));
});

test("shares are rounded to nearest cent", () => {
  const r = f({
    itemCents: 1,
    orderSubtotalCents: 3,
    serviceFeeLineItemCents: 100,
    shippingCents: 50,
    taxCents: 10,
  });
  assert.equal(r.feeShare, 33);
  assert.equal(r.shipShare, 17);
  assert.equal(r.taxShare, 3);
});

test("change of mind does not refund fee, shipping or tax", () => {
  const r = f({ ...base, returnShippingCents: 0 });
  assert.ok(r.buyerRefundCents <= base.itemCents);
});

test("result amounts are integers", () => {
  const r = f({
    itemCents: 777,
    orderSubtotalCents: 2333,
    serviceFeeLineItemCents: 199,
    shippingCents: 501,
    taxCents: 123,
    sellerAtFault: true,
  });
  for (const k of ["feeShare", "shipShare", "taxShare", "returnShipCents", "buyerRefundCents"]) {
    assert.ok(Number.isInteger(r[k]), k);
  }
});
