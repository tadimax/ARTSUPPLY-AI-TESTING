const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const fee = mod.estimateStripeFeeCents;
const debt = mod.computeFaultDebt;

// estimateStripeFeeCents
test("fee: 2.9% plus flat 30 cents on a round amount", () => {
  assert.equal(fee(1000), 59);
  assert.equal(fee(10000), 320);
});

test("fee: zero amount still costs the flat 30 cents", () => {
  assert.equal(fee(0), 30);
});

test("fee: missing amount counts as 0, 30 cents still applies", () => {
  assert.equal(fee(undefined), 30);
  assert.equal(fee(null), 30);
  assert.equal(fee(), 30);
});

test("fee: non-numeric amount counts as 0, 30 cents still applies", () => {
  assert.equal(fee("abc"), 30);
  assert.equal(fee(NaN), 30);
  assert.equal(fee({}), 30);
});

test("fee: percentage rounds down just below half a cent (17 -> 0.493 -> 0)", () => {
  assert.equal(fee(17), 30);
});

test("fee: percentage rounds up just above half a cent (18 -> 0.522 -> 1)", () => {
  assert.equal(fee(18), 31);
});

test("fee: 534 -> 15.486 rounds down to 15", () => {
  assert.equal(fee(534), 45);
});

test("fee: 535 -> 15.515 rounds up to 16", () => {
  assert.equal(fee(535), 46);
});

test("fee: small amount where percentage is under a cent", () => {
  assert.equal(fee(10), 30);
});

test("fee: 100 -> 2.9 rounds up to 3", () => {
  assert.equal(fee(100), 33);
});

test("fee: returns a whole number of cents", () => {
  assert.ok(Number.isInteger(fee(12345)));
  assert.equal(fee(12345), 388); // 358.005 -> 358, +30
});

// computeFaultDebt
test("debt: first offence is ship share + return shipping + fee estimate of refund", () => {
  // fee(10000)=320
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 0, repeatOffender: false }), 1520);
});

test("debt: first offence does NOT include platform fee share", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 1800, repeatOffender: false }), 1520);
});

test("debt: repeat offender adds platform fee share", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 1800, repeatOffender: true }), 3320);
});

test("debt: repeat offender with zero fee share equals first offence amount", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 0, repeatOffender: true }), 1520);
});

test("debt: repeat offender differs from first by exactly the fee share", () => {
  const base = { shipShare: 123, returnShipCents: 456, buyerRefundCents: 7890, feeShare: 321 };
  const first = debt({ ...base, repeatOffender: false });
  const repeat = debt({ ...base, repeatOffender: true });
  assert.equal(repeat - first, 321);
});

test("debt: empty object uses defaults, only the 30 cent flat fee remains", () => {
  assert.equal(debt({}), 30);
});

test("debt: default repeatOffender is false", () => {
  assert.equal(debt({ feeShare: 999 }), 30);
});

test("debt: default shipShare is 0", () => {
  assert.equal(debt({ returnShipCents: 100, buyerRefundCents: 0 }), 130);
});

test("debt: default returnShipCents is 0", () => {
  assert.equal(debt({ shipShare: 100, buyerRefundCents: 0 }), 130);
});

test("debt: default buyerRefundCents is 0 so fee is 30", () => {
  assert.equal(debt({ shipShare: 100, returnShipCents: 200 }), 330);
});

test("debt: default feeShare is 0 for a repeat offender", () => {
  assert.equal(debt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 0, repeatOffender: true }), 330);
});

test("debt: null fields count as 0", () => {
  assert.equal(debt({ shipShare: null, returnShipCents: null, buyerRefundCents: null, feeShare: null, repeatOffender: true }), 30);
});

test("debt: non-numeric fields count as 0", () => {
  assert.equal(debt({ shipShare: "abc", returnShipCents: "x", buyerRefundCents: "y", feeShare: "z", repeatOffender: true }), 30);
});

test("debt: non-numeric shipShare alone counts as 0", () => {
  assert.equal(debt({ shipShare: "abc", returnShipCents: 700, buyerRefundCents: 10000 }), 1020);
});

test("debt: non-numeric return shipping alone counts as 0", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: "abc", buyerRefundCents: 10000 }), 820);
});

test("debt: non-numeric refund counts as 0 but flat 30 still applies", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: "abc" }), 1230);
});

test("debt: non-numeric fee share counts as 0 for repeat offender", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: "abc", repeatOffender: true }), 1520);
});

test("debt: refund fee estimate rounding just below half cent (534 -> 45)", () => {
  assert.equal(debt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 534 }), 345);
});

test("debt: refund fee estimate rounding just above half cent (535 -> 46)", () => {
  assert.equal(debt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 535 }), 346);
});

test("debt: repeat offender with rounding-sensitive refund", () => {
  assert.equal(debt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 535, feeShare: 50, repeatOffender: true }), 396);
});

test("debt: returns a number", () => {
  assert.equal(typeof debt({ shipShare: 1, returnShipCents: 1, buyerRefundCents: 1 }), "number");
  assert.equal(debt({ shipShare: 1, returnShipCents: 1, buyerRefundCents: 1 }), 32);
});

test("debt: fee estimate applies to buyer refund only, not to shipping amounts", () => {
  assert.equal(debt({ shipShare: 10000, returnShipCents: 10000, buyerRefundCents: 0 }), 20030);
});

test("debt: fee estimate is not applied to the platform fee share", () => {
  assert.equal(debt({ buyerRefundCents: 0, feeShare: 10000, repeatOffender: true }), 10030);
});
