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

test("ratio is item price divided by order subtotal", () => {
  assert.equal(f({ itemCents: 2500, orderSubtotalCents: 10000 }).ratio, 0.25);
  assert.equal(f({ itemCents: 5000, orderSubtotalCents: 10000 }).ratio, 0.5);
});

test("ratio cap: just below, at, and just above the subtotal", () => {
  assert.equal(f({ itemCents: 99, orderSubtotalCents: 100 }).ratio, 0.99);
  assert.equal(f({ itemCents: 100, orderSubtotalCents: 100 }).ratio, 1);
  assert.equal(f({ itemCents: 101, orderSubtotalCents: 100 }).ratio, 1);
  assert.equal(f({ itemCents: 150, orderSubtotalCents: 100 }).ratio, 1);
});

test("shares are computed in the ratio for fee, shipping and tax", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 400,
    shippingCents: 1000,
    taxCents: 800,
  });
  assert.equal(r.feeShare, 100);
  assert.equal(r.shipShare, 250);
  assert.equal(r.taxShare, 200);
});

test("capped ratio gives full order amounts as shares", () => {
  const r = f({
    itemCents: 150,
    orderSubtotalCents: 100,
    serviceFeeLineItemCents: 10,
    shippingCents: 5,
    taxCents: 3,
  });
  assert.equal(r.feeShare, 10);
  assert.equal(r.shipShare, 5);
  assert.equal(r.taxShare, 3);
});

test("missing subtotal uses item price as subtotal", () => {
  const r = f({ itemCents: 50, serviceFeeLineItemCents: 7, shippingCents: 9, taxCents: 4 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 7);
  assert.equal(r.shipShare, 9);
  assert.equal(r.taxShare, 4);
});

test("zero subtotal uses item price as subtotal", () => {
  const r = f({ itemCents: 50, orderSubtotalCents: 0, serviceFeeLineItemCents: 7 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 7);
});

test("null subtotal uses item price as subtotal", () => {
  const r = f({ itemCents: 50, orderSubtotalCents: null, serviceFeeLineItemCents: 7 });
  assert.equal(r.ratio, 1);
  assert.equal(r.feeShare, 7);
});

test("zero item and zero subtotal: subtotal becomes 1, no division by zero", () => {
  const r = f({ itemCents: 0, orderSubtotalCents: 0, serviceFeeLineItemCents: 100, shippingCents: 100, taxCents: 100 });
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.shipShare, 0);
  assert.equal(r.taxShare, 0);
  assert.equal(r.buyerRefundCents, 0);
});

test("zero item with a real subtotal gives zero ratio", () => {
  const r = f({ itemCents: 0, orderSubtotalCents: 100, serviceFeeLineItemCents: 40 });
  assert.equal(r.ratio, 0);
  assert.equal(r.feeShare, 0);
});

test("rounding to nearest cent: fee just under half (0.25 -> 0)", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 4, serviceFeeLineItemCents: 1 }).feeShare, 0);
});

test("rounding to nearest cent: fee at half (0.5 -> 1)", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 2, serviceFeeLineItemCents: 1 }).feeShare, 1);
});

test("rounding to nearest cent: fee at 1.5 -> 2", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 2, serviceFeeLineItemCents: 3 }).feeShare, 2);
});

test("rounding to nearest cent: fee just over half (0.75 -> 1)", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 4, serviceFeeLineItemCents: 3 }).feeShare, 1);
});

test("rounding: thirds round down below half and up above half", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 3, serviceFeeLineItemCents: 1 }).feeShare, 0);
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 3, serviceFeeLineItemCents: 2 }).feeShare, 1);
});

test("rounding applies to shipping share", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 3, shippingCents: 1 }).shipShare, 0);
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 3, shippingCents: 2 }).shipShare, 1);
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 2, shippingCents: 1 }).shipShare, 1);
});

test("rounding applies to tax share", () => {
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 3, taxCents: 1 }).taxShare, 0);
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 3, taxCents: 2 }).taxShare, 1);
  assert.equal(f({ itemCents: 1, orderSubtotalCents: 4, taxCents: 3 }).taxShare, 1);
});

test("return shipping supplied is used as is", () => {
  const r = f({ itemCents: 2500, orderSubtotalCents: 10000, shippingCents: 1000, returnShippingCents: 300 });
  assert.equal(r.returnShipCents, 300);
});

test("return shipping missing defaults to shipping share", () => {
  const r = f({ itemCents: 2500, orderSubtotalCents: 10000, shippingCents: 1000 });
  assert.equal(r.returnShipCents, 250);
});

test("return shipping zero defaults to shipping share", () => {
  const r = f({ itemCents: 2500, orderSubtotalCents: 10000, shippingCents: 1000, returnShippingCents: 0 });
  assert.equal(r.returnShipCents, 250);
});

test("return shipping null defaults to shipping share", () => {
  const r = f({ itemCents: 2500, orderSubtotalCents: 10000, shippingCents: 1000, returnShippingCents: null });
  assert.equal(r.returnShipCents, 250);
});

test("return shipping default is the rounded shipping share", () => {
  const r = f({ itemCents: 1, orderSubtotalCents: 3, shippingCents: 2 });
  assert.equal(r.returnShipCents, 1);
});

test("change of mind with default return shipping: item minus shipping share", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 400,
    shippingCents: 1000,
    taxCents: 800,
  });
  assert.equal(r.buyerRefundCents, 2250);
});

test("change of mind with explicit return shipping", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 400,
    shippingCents: 1000,
    taxCents: 800,
    returnShippingCents: 300,
    sellerAtFault: false,
  });
  assert.equal(r.buyerRefundCents, 2200);
});

test("change of mind does NOT refund fee, outbound shipping or tax", () => {
  const withExtras = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 4000,
    shippingCents: 0,
    taxCents: 9000,
    returnShippingCents: 100,
  });
  const without = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    returnShippingCents: 100,
  });
  assert.equal(withExtras.buyerRefundCents, 2400);
  assert.equal(without.buyerRefundCents, 2400);
  assert.equal(withExtras.feeShare, 1000);
  assert.equal(withExtras.taxShare, 2250);
});

test("change of mind with no shipping at all refunds the full item price", () => {
  assert.equal(f({ itemCents: 1000, orderSubtotalCents: 1000 }).buyerRefundCents, 1000);
});

test("change of mind refund never below zero: just below, at, just above item price", () => {
  assert.equal(f({ itemCents: 100, returnShippingCents: 99 }).buyerRefundCents, 1);
  assert.equal(f({ itemCents: 100, returnShippingCents: 100 }).buyerRefundCents, 0);
  assert.equal(f({ itemCents: 100, returnShippingCents: 101 }).buyerRefundCents, 0);
  assert.equal(f({ itemCents: 100, returnShippingCents: 500 }).buyerRefundCents, 0);
});

test("change of mind with zero item and return shipping gives zero, not negative", () => {
  assert.equal(f({ itemCents: 0, returnShippingCents: 250 }).buyerRefundCents, 0);
});

test("seller at fault refunds item plus fee, shipping, tax shares and return shipping", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 400,
    shippingCents: 1000,
    taxCents: 800,
    returnShippingCents: 300,
    sellerAtFault: true,
  });
  assert.equal(r.buyerRefundCents, 3350);
});

test("seller at fault with default return shipping uses shipping share", () => {
  const r = f({
    itemCents: 2500,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 400,
    shippingCents: 1000,
    taxCents: 800,
    sellerAtFault: true,
  });
  assert.equal(r.buyerRefundCents, 3300);
});

test("seller at fault with capped ratio refunds full order amounts", () => {
  const r = f({
    itemCents: 150,
    orderSubtotalCents: 100,
    serviceFeeLineItemCents: 10,
    shippingCents: 5,
    taxCents: 3,
    returnShippingCents: 2,
    sellerAtFault: true,
  });
  assert.equal(r.buyerRefundCents, 170);
});

test("seller at fault uses rounded shares", () => {
  const r = f({
    itemCents: 1,
    orderSubtotalCents: 3,
    serviceFeeLineItemCents: 2,
    shippingCents: 1,
    taxCents: 2,
    returnShippingCents: 4,
    sellerAtFault: true,
  });
  // 1 + 1 + 0 + 1 + 4
  assert.equal(r.buyerRefundCents, 7);
});

test("seller at fault with only item price refunds the item", () => {
  assert.equal(f({ itemCents: 1234, sellerAtFault: true }).buyerRefundCents, 1234);
});

test("seller at fault is never reduced by return shipping larger than item", () => {
  const r = f({ itemCents: 100, returnShippingCents: 500, sellerAtFault: true });
  assert.equal(r.buyerRefundCents, 600);
});

test("sellerAtFault defaults to false", () => {
  const base = { itemCents: 1000, orderSubtotalCents: 1000, serviceFeeLineItemCents: 50, taxCents: 80, returnShippingCents: 20 };
  assert.equal(f(base).buyerRefundCents, 980);
  assert.equal(f({ ...base, sellerAtFault: false }).buyerRefundCents, 980);
  assert.equal(f({ ...base, sellerAtFault: true }).buyerRefundCents, 1150);
});

test("fault refund exceeds change-of-mind refund by fee, tax shares and shipping", () => {
  const base = {
    itemCents: 5000,
    orderSubtotalCents: 10000,
    serviceFeeLineItemCents: 200,
    shippingCents: 600,
    taxCents: 400,
    returnShippingCents: 100,
  };
  assert.equal(f({ ...base, sellerAtFault: false }).buyerRefundCents, 4900);
  // 5000 + 100 + 300 + 200 + 100
  assert.equal(f({ ...base, sellerAtFault: true }).buyerRefundCents, 5700);
});

test("result contains all documented fields", () => {
  const r = f({ itemCents: 100, orderSubtotalCents: 200 });
  assert.deepEqual(Object.keys(r).sort(), ["buyerRefundCents", "feeShare", "ratio", "returnShipCents", "shipShare", "taxShare"]);
});
