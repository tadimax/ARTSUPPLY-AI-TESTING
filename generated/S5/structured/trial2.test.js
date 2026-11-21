const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const fee = mod.estimateStripeFeeCents;
const debt = mod.computeFaultDebt;

// estimateStripeFeeCents
test("fee: zero amount is only the flat 30 cents", () => {
  assert.equal(fee(0), 30);
});
test("fee: 100 cents -> 2.9 rounds to 3, plus 30 = 33", () => {
  assert.equal(fee(100), 33);
});
test("fee: 1000 cents -> 29 + 30 = 59", () => {
  assert.equal(fee(1000), 59);
});
test("fee: 10000 cents -> 290 + 30 = 320", () => {
  assert.equal(fee(10000), 320);
});
test("fee: rounding just under half cent rounds down (534 -> 15.486 -> 15)", () => {
  assert.equal(fee(534), 45);
});
test("fee: rounding just over half cent rounds up (535 -> 15.515 -> 16)", () => {
  assert.equal(fee(535), 46);
});
test("fee: 17 cents -> 0.493 rounds to 0", () => {
  assert.equal(fee(17), 30);
});
test("fee: 18 cents -> 0.522 rounds to 1", () => {
  assert.equal(fee(18), 31);
});
test("fee: 1 cent -> 0.029 rounds to 0", () => {
  assert.equal(fee(1), 30);
});
test("fee: undefined counts as 0", () => {
  assert.equal(fee(undefined), 30);
  assert.equal(fee(), 30);
});
test("fee: null counts as 0", () => {
  assert.equal(fee(null), 30);
});
test("fee: non-numeric string counts as 0", () => {
  assert.equal(fee("abc"), 30);
});
test("fee: NaN counts as 0", () => {
  assert.equal(fee(NaN), 30);
});
test("fee: returns a number", () => {
  assert.equal(typeof fee(1000), "number");
});

// computeFaultDebt
test("debt: first offence = ship share + return shipping + fee estimate of refund", () => {
  // 500 + 700 + (290 + 30) = 1520
  assert.equal(
    debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 1800, repeatOffender: false }),
    1520
  );
});
test("debt: first offence does NOT include the platform fee share", () => {
  const withFee = debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 1800 });
  const noFee = debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 0 });
  assert.equal(withFee, noFee);
  assert.equal(withFee, 1520);
});
test("debt: repeat offender adds the platform fee share", () => {
  // 1520 + 1800 = 3320
  assert.equal(
    debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 1800, repeatOffender: true }),
    3320
  );
});
test("debt: repeat offender with zero fee share equals first offence amount", () => {
  assert.equal(
    debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: 0, repeatOffender: true }),
    1520
  );
});
test("debt: repeat minus first equals exactly the fee share", () => {
  const base = { shipShare: 123, returnShipCents: 456, buyerRefundCents: 7890, feeShare: 321 };
  assert.equal(debt({ ...base, repeatOffender: true }) - debt({ ...base, repeatOffender: false }), 321);
});
test("debt: all defaults -> only the flat 30 cent fee on a zero refund", () => {
  assert.equal(debt({}), 30);
});
test("debt: default repeatOffender is false (fee share not added)", () => {
  assert.equal(debt({ feeShare: 999 }), 30);
});
test("debt: repeat with only fee share -> 999 + 30", () => {
  assert.equal(debt({ feeShare: 999, repeatOffender: true }), 1029);
});
test("debt: only ship share", () => {
  assert.equal(debt({ shipShare: 250 }), 280);
});
test("debt: only return shipping", () => {
  assert.equal(debt({ returnShipCents: 400 }), 430);
});
test("debt: only buyer refund 10000", () => {
  assert.equal(debt({ buyerRefundCents: 10000 }), 320);
});
test("debt: refund fee rounding just under half cent (534)", () => {
  assert.equal(debt({ buyerRefundCents: 534 }), 45);
});
test("debt: refund fee rounding just over half cent (535)", () => {
  assert.equal(debt({ buyerRefundCents: 535 }), 46);
});
test("debt: rounding applies to refund fee in a repeat case", () => {
  // 100 + 200 + 46 + 50 = 396
  assert.equal(
    debt({ shipShare: 100, returnShipCents: 200, buyerRefundCents: 535, feeShare: 50, repeatOffender: true }),
    396
  );
});
test("debt: undefined fields count as 0", () => {
  assert.equal(
    debt({ shipShare: undefined, returnShipCents: undefined, buyerRefundCents: undefined, feeShare: undefined }),
    30
  );
});
test("debt: null fields count as 0", () => {
  assert.equal(
    debt({ shipShare: null, returnShipCents: null, buyerRefundCents: null, feeShare: null, repeatOffender: true }),
    30
  );
});
test("debt: non-numeric ship share counts as 0", () => {
  assert.equal(debt({ shipShare: "abc", returnShipCents: 700, buyerRefundCents: 10000 }), 1020);
});
test("debt: non-numeric return shipping counts as 0", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: "abc", buyerRefundCents: 10000 }), 820);
});
test("debt: non-numeric buyer refund counts as 0 (30 cents still applies)", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: "abc" }), 1230);
});
test("debt: non-numeric fee share counts as 0 for repeat offender", () => {
  assert.equal(debt({ shipShare: 500, returnShipCents: 700, buyerRefundCents: 10000, feeShare: "abc", repeatOffender: true }), 1520);
});
test("debt: returns a number", () => {
  assert.equal(typeof debt({ shipShare: 1 }), "number");
});
