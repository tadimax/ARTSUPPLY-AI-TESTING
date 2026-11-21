const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { estimateStripeFeeCents, computeFaultDebt } = mod;

test("fee: 2.9% plus 30 cents", () => {
  assert.equal(estimateStripeFeeCents(1000), 59);
  assert.equal(estimateStripeFeeCents(5000), 175);
  assert.equal(estimateStripeFeeCents(10000), 320);
});

test("fee: zero amount still costs 30 cents", () => {
  assert.equal(estimateStripeFeeCents(0), 30);
});

test("fee: missing or non-numeric counts as 0", () => {
  assert.equal(estimateStripeFeeCents(), 30);
  assert.equal(estimateStripeFeeCents(undefined), 30);
  assert.equal(estimateStripeFeeCents(null), 30);
  assert.equal(estimateStripeFeeCents("abc"), 30);
  assert.equal(estimateStripeFeeCents(NaN), 30);
});

test("fee: rounds to nearest cent", () => {
  assert.equal(estimateStripeFeeCents(100), 33); // 2.9 -> 3
  assert.equal(estimateStripeFeeCents(50), 31); // 1.45 -> 1
  assert.equal(estimateStripeFeeCents(150), 34); // 4.35 -> 4
  assert.equal(estimateStripeFeeCents(1100), 62); // 31.9 -> 32
  assert.equal(estimateStripeFeeCents(1050), 60); // 30.45 -> 30
});

test("fee: result is an integer", () => {
  for (const a of [1, 7, 33, 199, 1234, 98765]) {
    assert.ok(Number.isInteger(estimateStripeFeeCents(a)));
  }
});

test("debt: first offence sums shipping, return shipping and fee estimate", () => {
  const d = computeFaultDebt({
    shipShare: 500,
    returnShipCents: 700,
    buyerRefundCents: 1000,
    feeShare: 180,
    repeatOffender: false,
  });
  assert.equal(d, 500 + 700 + 59);
});

test("debt: first offence excludes platform fee share", () => {
  const a = computeFaultDebt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 1000, feeShare: 0 });
  const b = computeFaultDebt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 1000, feeShare: 999 });
  assert.equal(a, b);
  assert.equal(a, 100 + 200 + 59);
});

test("debt: repeat offender adds platform fee share", () => {
  const d = computeFaultDebt({
    shipShare: 500,
    returnShipCents: 700,
    buyerRefundCents: 1000,
    feeShare: 180,
    repeatOffender: true,
  });
  assert.equal(d, 500 + 700 + 59 + 180);
});

test("debt: repeat offender with zero fee share equals first offence", () => {
  const first = computeFaultDebt({ shipShare: 300, returnShipCents: 400, buyerRefundCents: 2000 });
  const repeat = computeFaultDebt({ shipShare: 300, returnShipCents: 400, buyerRefundCents: 2000, repeatOffender: true });
  assert.equal(first, repeat);
});

test("debt: all defaults gives only the 30 cent fixed fee", () => {
  assert.equal(computeFaultDebt({}), 30);
});

test("debt: missing fields count as 0", () => {
  assert.equal(computeFaultDebt({ shipShare: 250 }), 250 + 30);
  assert.equal(computeFaultDebt({ returnShipCents: 400 }), 400 + 30);
  assert.equal(computeFaultDebt({ buyerRefundCents: 1000 }), 59);
  assert.equal(computeFaultDebt({ feeShare: 500, repeatOffender: true }), 500 + 30);
});

test("debt: non-numeric inputs count as 0", () => {
  const d = computeFaultDebt({
    shipShare: "x",
    returnShipCents: undefined,
    buyerRefundCents: "abc",
    feeShare: null,
    repeatOffender: true,
  });
  assert.equal(d, 30);
});

test("debt: returns a number", () => {
  const d = computeFaultDebt({ shipShare: 1, returnShipCents: 2, buyerRefundCents: 3 });
  assert.equal(typeof d, "number");
  assert.ok(Number.isInteger(d));
});
