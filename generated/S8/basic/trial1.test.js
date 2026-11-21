const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computePointsEarned, computePointsRedemption } = mod;

test("constants", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_EARNED, 1);
  assert.equal(mod.POINTS_PER_DOLLAR_OFF, 500);
  assert.equal(mod.POINTS_MAX_DISCOUNT_BPS, 500);
});

test("earned: whole dollars", () => {
  assert.equal(computePointsEarned(10000), 100);
  assert.equal(computePointsEarned(100), 1);
  assert.equal(computePointsEarned(0), 0);
});

test("earned: partial dollars earn nothing", () => {
  assert.equal(computePointsEarned(99), 0);
  assert.equal(computePointsEarned(199), 1);
  assert.equal(computePointsEarned(12345), 123);
});

test("earned: negative or non-numeric gives 0", () => {
  assert.equal(computePointsEarned(-500), 0);
  assert.equal(computePointsEarned("abc"), 0);
  assert.equal(computePointsEarned(undefined), 0);
  assert.equal(computePointsEarned(null), 0);
  assert.equal(computePointsEarned(NaN), 0);
});

test("redemption: fewer than 500 points redeems nothing", () => {
  assert.deepEqual(computePointsRedemption(100000, 499), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(100000, 0), { pointsRedeemed: 0, discountCents: 0 });
});

test("redemption: limited by points blocks", () => {
  // cap = 5% of $1000 = $50; points allow 2 dollars
  assert.deepEqual(computePointsRedemption(100000, 1000), { pointsRedeemed: 1000, discountCents: 200 });
  assert.deepEqual(computePointsRedemption(100000, 1499), { pointsRedeemed: 1000, discountCents: 200 });
  assert.deepEqual(computePointsRedemption(100000, 500), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: limited by cap", () => {
  // cap = 5% of $100 = $5
  assert.deepEqual(computePointsRedemption(10000, 100000), { pointsRedeemed: 2500, discountCents: 500 });
});

test("redemption: cap rounds down to whole dollars", () => {
  // 5% of $99.99 = 499.95 cents -> 499 -> $4
  assert.deepEqual(computePointsRedemption(9999, 100000), { pointsRedeemed: 2000, discountCents: 400 });
  // 5% of $19.99 = 99.95 -> 99 cents -> $0
  assert.deepEqual(computePointsRedemption(1999, 100000), { pointsRedeemed: 0, discountCents: 0 });
  // 5% of $20 = $1
  assert.deepEqual(computePointsRedemption(2000, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: zero subtotal", () => {
  assert.deepEqual(computePointsRedemption(0, 100000), { pointsRedeemed: 0, discountCents: 0 });
});

test("redemption: negative or non-numeric inputs count as 0", () => {
  assert.deepEqual(computePointsRedemption(-10000, 100000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(10000, -5000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption("x", 5000), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(10000, "x"), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(undefined, undefined), { pointsRedeemed: 0, discountCents: 0 });
});

test("redemption: fractional points rounded down", () => {
  assert.deepEqual(computePointsRedemption(100000, 999.9), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(computePointsRedemption(100000, 499.99), { pointsRedeemed: 0, discountCents: 0 });
  assert.deepEqual(computePointsRedemption(100000, 500.5), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: pointsRedeemed is dollars times 500 and discount is dollars times 100", () => {
  const r = computePointsRedemption(50000, 12345);
  // cap $25, blocks 24 -> 24
  assert.deepEqual(r, { pointsRedeemed: 12000, discountCents: 2400 });
});
