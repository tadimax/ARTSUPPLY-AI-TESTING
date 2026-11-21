const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computePointsEarned, computePointsRedemption } = mod;

test("constants are exported with expected values", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_EARNED, 1);
  assert.equal(mod.POINTS_PER_DOLLAR_OFF, 500);
  assert.equal(mod.POINTS_MAX_DISCOUNT_BPS, 500);
});

test("earn: 1 point per whole dollar", () => {
  assert.equal(computePointsEarned(10000), 100);
  assert.equal(computePointsEarned(100), 1);
  assert.equal(computePointsEarned(250), 2);
});

test("earn: partial dollars earn nothing", () => {
  assert.equal(computePointsEarned(99), 0);
  assert.equal(computePointsEarned(199), 1);
  assert.equal(computePointsEarned(0), 0);
});

test("earn: negative or non-numeric yields 0", () => {
  assert.equal(computePointsEarned(-500), 0);
  assert.equal(computePointsEarned("abc"), 0);
  assert.equal(computePointsEarned(undefined), 0);
  assert.equal(computePointsEarned(null), 0);
  assert.equal(computePointsEarned(NaN), 0);
});

test("redeem: fewer than 500 points redeems nothing", () => {
  assert.deepEqual(computePointsRedemption(100000, 499), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(100000, 0), { pointsRedeemed: 0, discountCents: 0 });
});

test("redeem: limited by points blocks", () => {
  // cap = 5% of $1000 = $50; points 1500 = 3 blocks
  assert.deepEqual(computePointsRedemption(100000, 1500), { pointsRedeemed: 1500, discountCents: 300 });
  // partial block ignored
  assert.deepEqual(computePointsRedemption(100000, 1999), { pointsRedeemed: 1500, discountCents: 300 });
});

test("redeem: limited by 5% cap in whole dollars", () => {
  // cap = $50 ; points 1,000,000 = 2000 blocks
  assert.deepEqual(computePointsRedemption(100000, 1000000), { pointsRedeemed: 25000, discountCents: 5000 });
});

test("redeem: cap rounds down to whole dollars", () => {
  // 5% of $29.99 = 149.95 cents -> 149 -> $1
  assert.deepEqual(computePointsRedemption(2999, 100000), { pointsRedeemed: 500, discountCents: 100 });
  // 5% of $39.99 = 199.95 -> 199 -> $1
  assert.deepEqual(computePointsRedemption(3999, 100000), { pointsRedeemed: 500, discountCents: 100 });
  // 5% of $40 = 200 -> $2
  assert.deepEqual(computePointsRedemption(4000, 100000), { pointsRedeemed: 1000, discountCents: 200 });
});

test("redeem: cap under one dollar means nothing redeemed", () => {
  assert.deepEqual(computePointsRedemption(1999, 100000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(0, 100000), { pointsRedeemed: 0, discountCents: 0 });
});

test("redeem: negative or non-numeric inputs count as 0", () => {
  assert.deepEqual(computePointsRedemption(-100000, 5000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(100000, -5000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption("x", 5000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(100000, "x"), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(undefined, undefined), { pointsRedeemed: 0, discountCents: 0 });
});

test("redeem: fractional points are rounded down", () => {
  assert.deepEqual(computePointsRedemption(100000, 999.9), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(computePointsRedemption(100000, 499.9), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(100000, 500.5), { pointsRedeemed: 500, discountCents: 100 });
});

test("redeem: discount equals dollars * 100 and points dollars * 500", () => {
  const r = computePointsRedemption(60000, 10000);
  // cap = $30, blocks = 20 -> 20 dollars
  assert.equal(r.pointsRedeemed, 10000);
  assert.equal(r.discountCents, 2000);
});
