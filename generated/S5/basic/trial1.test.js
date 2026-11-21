const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { estimateStripeFeeCents, computeFaultDebt } = mod;

test("fee: 1000 cents is 29 + 30", () => {
  assert.equal(estimateStripeFeeCents(1000), 59);
});

test("fee: 10000 cents is 290 + 30", () => {
  assert.equal(estimateStripeFeeCents(10000), 320);
});

test("fee: rounds to nearest cent (100 -> 2.9 -> 3)", () => {
  assert.equal(estimateStripeFeeCents(100), 33);
});

test("fee: rounds down (50 -> 1.45 -> 1)", () => {
  assert.equal(estimateStripeFeeCents(50), 31);
});

test("fee: zero amount still has flat 30", () => {
  assert.equal(estimateStripeFeeCents(0), 30);
});

test("fee: missing amount counts as 0", () => {
  assert.equal(estimateStripeFeeCents(), 30);
  assert.equal(estimateStripeFeeCents(undefined), 30);
  assert.equal(estimateStripeFeeCents(null), 30);
});

test("fee: non-numeric amount counts as 0", () => {
  assert.equal(estimateStripeFeeCents("abc"), 30);
  assert.equal(estimateStripeFeeCents(NaN), 30);
  assert.equal(estimateStripeFeeCents({}), 30);
});

test("fee: result is an integer", () => {
  for (const a of [1, 7, 33, 999, 1234, 5678, 99999]) {
    assert.ok(Number.isInteger(estimateStripeFeeCents(a)));
  }
});

test("debt: first offence = ship share + return ship + fee of refund", () => {
  const d = computeFaultDebt({
    shipShare: 500,
    returnShipCents: 700,
    buyerRefundCents: 10000,
    feeShare: 900,
    repeatOffender: false,
  });
  assert.equal(d, 500 + 700 + 320);
});

test("debt: repeat offender adds platform fee share", () => {
  const d = computeFaultDebt({
    shipShare: 500,
    returnShipCents: 700,
    buyerRefundCents: 10000,
    feeShare: 900,
    repeatOffender: true,
  });
  assert.equal(d, 500 + 700 + 320 + 900);
});

test("debt: feeShare ignored on first offence", () => {
  const a = computeFaultDebt({ shipShare: 1, returnShipCents: 2, buyerRefundCents: 1000, feeShare: 0 });
  const b = computeFaultDebt({ shipShare: 1, returnShipCents: 2, buyerRefundCents: 1000, feeShare: 5000 });
  assert.equal(a, b);
  assert.equal(a, 1 + 2 + 59);
});

test("debt: repeatOffender defaults to false", () => {
  assert.equal(
    computeFaultDebt({ shipShare: 100, returnShipCents: 100, buyerRefundCents: 1000, feeShare: 400 }),
    100 + 100 + 59
  );
});

test("debt: empty object gives just the flat 30 cents", () => {
  assert.equal(computeFaultDebt({}), 30);
});

test("debt: repeat offender with empty inputs", () => {
  assert.equal(computeFaultDebt({ repeatOffender: true }), 30);
});

test("debt: no argument at all does not throw and yields 30", () => {
  assert.equal(computeFaultDebt(), 30);
});

test("debt: missing and non-numeric inputs count as 0", () => {
  const d = computeFaultDebt({
    shipShare: "x",
    returnShipCents: undefined,
    buyerRefundCents: null,
    feeShare: NaN,
    repeatOffender: true,
  });
  assert.equal(d, 30);
});

test("debt: zero refund still charges flat fee", () => {
  assert.equal(
    computeFaultDebt({ shipShare: 200, returnShipCents: 300, buyerRefundCents: 0 }),
    200 + 300 + 30
  );
});

test("debt: returns a number", () => {
  const d = computeFaultDebt({ shipShare: 10, returnShipCents: 20, buyerRefundCents: 1234 });
  assert.equal(typeof d, "number");
  assert.ok(Number.isInteger(d));
});
