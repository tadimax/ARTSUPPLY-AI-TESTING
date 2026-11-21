const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { estimateStripeFeeCents, computeFaultDebt } = mod;

test("estimateStripeFeeCents: typical amounts", () => {
  assert.equal(estimateStripeFeeCents(1000), 59);
  assert.equal(estimateStripeFeeCents(2000), 88);
  assert.equal(estimateStripeFeeCents(10000), 320);
});

test("estimateStripeFeeCents: rounds percentage to nearest cent", () => {
  assert.equal(estimateStripeFeeCents(1050), 60); // 30.45 -> 30
  assert.equal(estimateStripeFeeCents(1060), 61); // 30.74 -> 31
  assert.equal(estimateStripeFeeCents(50), 31); // 1.45 -> 1
  assert.equal(estimateStripeFeeCents(20), 31); // 0.58 -> 1
});

test("estimateStripeFeeCents: zero, missing and non-numeric count as 0", () => {
  assert.equal(estimateStripeFeeCents(0), 30);
  assert.equal(estimateStripeFeeCents(), 30);
  assert.equal(estimateStripeFeeCents(undefined), 30);
  assert.equal(estimateStripeFeeCents(null), 30);
  assert.equal(estimateStripeFeeCents("abc"), 30);
  assert.equal(estimateStripeFeeCents(NaN), 30);
});

test("estimateStripeFeeCents: returns integer", () => {
  for (const a of [1, 33, 777, 1234, 9999, 123457]) {
    assert.ok(Number.isInteger(estimateStripeFeeCents(a)));
  }
});

test("computeFaultDebt: first offence = ship + return ship + stripe fee of refund", () => {
  const d = computeFaultDebt({
    shipShare: 500,
    returnShipCents: 700,
    buyerRefundCents: 2000,
    feeShare: 300,
    repeatOffender: false,
  });
  assert.equal(d, 500 + 700 + 88);
});

test("computeFaultDebt: repeat offender adds platform fee share", () => {
  const d = computeFaultDebt({
    shipShare: 500,
    returnShipCents: 700,
    buyerRefundCents: 2000,
    feeShare: 300,
    repeatOffender: true,
  });
  assert.equal(d, 500 + 700 + 88 + 300);
});

test("computeFaultDebt: repeatOffender defaults to false (feeShare ignored)", () => {
  const d = computeFaultDebt({
    shipShare: 100,
    returnShipCents: 200,
    buyerRefundCents: 1000,
    feeShare: 999,
  });
  assert.equal(d, 100 + 200 + 59);
});

test("computeFaultDebt: empty object gives just the flat 30 cents", () => {
  assert.equal(computeFaultDebt({}), 30);
});

test("computeFaultDebt: repeat offender with empty fields is still 30", () => {
  assert.equal(computeFaultDebt({ repeatOffender: true }), 30);
});

test("computeFaultDebt: missing or non-numeric inputs count as 0", () => {
  const d = computeFaultDebt({
    shipShare: "x",
    returnShipCents: undefined,
    buyerRefundCents: "nope",
    feeShare: null,
    repeatOffender: true,
  });
  assert.equal(d, 30);
  const e = computeFaultDebt({
    shipShare: 400,
    returnShipCents: "bad",
    buyerRefundCents: 1000,
    feeShare: "bad",
    repeatOffender: true,
  });
  assert.equal(e, 400 + 59);
});

test("computeFaultDebt: returns a number", () => {
  const d = computeFaultDebt({ shipShare: 1, returnShipCents: 2, buyerRefundCents: 3 });
  assert.equal(typeof d, "number");
});

test("computeFaultDebt: repeat minus first equals feeShare", () => {
  const base = { shipShare: 250, returnShipCents: 899, buyerRefundCents: 4321, feeShare: 777 };
  const first = computeFaultDebt({ ...base, repeatOffender: false });
  const repeat = computeFaultDebt({ ...base, repeatOffender: true });
  assert.equal(repeat - first, 777);
});
