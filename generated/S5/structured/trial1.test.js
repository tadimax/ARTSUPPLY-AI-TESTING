const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const fee = mod.estimateStripeFeeCents;
const debt = mod.computeFaultDebt;

test("fee: 2.9% plus flat 30 cents on a round amount", () => {
  assert.equal(fee(1000), 59);
  assert.equal(fee(100), 33);
});

test("fee: zero amount still costs the flat 30 cents", () => {
  assert.equal(fee(0), 30);
});

test("fee: missing amount counts as 0 (30 cents applies)", () => {
  assert.equal(fee(undefined), 30);
  assert.equal(fee(), 30);
  assert.equal(fee(null), 30);
});

test("fee: non-numeric amount counts as 0 (30 cents applies)", () => {
  assert.equal(fee("abc"), 30);
  assert.equal(fee({}), 30);
  assert.equal(fee(NaN), 30);
});

test("fee: rounds to nearest cent, just under half cent rounds down", () => {
  // 499 * 0.029 = 14.471 -> 14
  assert.equal(fee(499), 44);
  // 17 * 0.029 = 0.493 -> 0
  assert.equal(fee(17), 30);
});

test("fee: exactly half cent rounds up", () => {
  // 500 * 0.029 = 14.5 -> 15
  assert.equal(fee(500), 45);
});

test("fee: just over half cent rounds up", () => {
  // 501 * 0.029 = 14.529 -> 15
  assert.equal(fee(501), 45);
  // 18 * 0.029 = 0.522 -> 1
  assert.equal(fee(18), 31);
});

test("fee: small amount whose percentage rounds to zero", () => {
  // 10 * 0.029 = 0.29 -> 0
  assert.equal(fee(10), 30);
});

test("debt: first offence is shipping share + return shipping + fee estimate of refund", () => {
  // 200 + 300 + fee(1000)=59
  assert.equal(
    debt({ shipShare: 200, returnShipCents: 300, buyerRefundCents: 1000, feeShare: 0, repeatOffender: false }),
    559
  );
});

test("debt: first offence does NOT include the platform fee share", () => {
  assert.equal(
    debt({ shipShare: 200, returnShipCents: 300, buyerRefundCents: 1000, feeShare: 150, repeatOffender: false }),
    559
  );
});

test("debt: repeat offender adds the platform fee share", () => {
  // 559 + 150
  assert.equal(
    debt({ shipShare: 200, returnShipCents: 300, buyerRefundCents: 1000, feeShare: 150, repeatOffender: true }),
    709
  );
});

test("debt: repeat offender with zero fee share equals first offence amount", () => {
  assert.equal(
    debt({ shipShare: 200, returnShipCents: 300, buyerRefundCents: 1000, feeShare: 0, repeatOffender: true }),
    559
  );
});

test("debt: repeatOffender defaults to false", () => {
  assert.equal(
    debt({ shipShare: 200, returnShipCents: 300, buyerRefundCents: 1000, feeShare: 150 }),
    559
  );
});

test("debt: all fields default to 0, leaving only the 30 cent flat fee", () => {
  assert.equal(debt({}), 30);
});

test("debt: each component counted on its own", () => {
  assert.equal(debt({ shipShare: 123 }), 153);
  assert.equal(debt({ returnShipCents: 77 }), 107);
  assert.equal(debt({ buyerRefundCents: 1000 }), 59);
  assert.equal(debt({ feeShare: 500 }), 30);
  assert.equal(debt({ feeShare: 500, repeatOffender: true }), 530);
});

test("debt: missing (undefined/null) inputs count as 0", () => {
  assert.equal(
    debt({ shipShare: undefined, returnShipCents: null, buyerRefundCents: undefined, feeShare: null, repeatOffender: true }),
    30
  );
});

test("debt: non-numeric inputs count as 0", () => {
  assert.equal(
    debt({ shipShare: "abc", returnShipCents: "xyz", buyerRefundCents: "n/a", feeShare: "none", repeatOffender: true }),
    30
  );
  assert.equal(
    debt({ shipShare: "abc", returnShipCents: 300, buyerRefundCents: 1000 }),
    359
  );
});

test("debt: buyer refund fee estimate uses rounding at half cent", () => {
  // fee(500)=45, fee(499)=44, fee(501)=45
  assert.equal(debt({ buyerRefundCents: 500 }), 45);
  assert.equal(debt({ buyerRefundCents: 499 }), 44);
  assert.equal(debt({ buyerRefundCents: 501 }), 45);
});

test("debt: returns a number", () => {
  assert.equal(typeof debt({ shipShare: 1 }), "number");
});
