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
  assert.equal(computePointsEarned(1999), 19);
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
  // cap = 5% of $1000 = $50, points allow 3 blocks
  assert.deepEqual(computePointsRedemption(100000, 1700), { pointsRedeemed: 1500, discountCents: 300 });
});

test("redemption: limited by cap", () => {
  // cap = 5% of $200 = $10, points allow 100
  assert.deepEqual(computePointsRedemption(20000, 50000), { pointsRedeemed: 5000, discountCents: 1000 });
});

test("redemption: cap rounds down to whole dollars", () => {
  // 5% of 19999 = 999.95 -> 999 cents -> $9
  assert.deepEqual(computePointsRedemption(19999, 100000), { pointsRedeemed: 4500, discountCents: 900 });
  // 5% of 1999 = 99.95 -> 99 cents -> $0
  assert.deepEqual(computePointsRedemption(1999, 100000), { pointsRedeemed: 0, discountCents: 0 });
});

test("redemption: small subtotal gives no discount", () => {
  assert.deepEqual(computePointsRedemption(1000, 100000), { pointsRedeemed: 0, discountCents: 0 });
});

test("redemption: exact boundary", () => {
  assert.deepEqual(computePointsRedemption(2000, 500), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(computePointsRedemption(2000, 1000), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: fractional points rounded down", () => {
  assert.deepEqual(computePointsRedemption(100000, 999.9), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(computePointsRedemption(100000, 499.9), { pointsRedeemed: 0, discountCents: 0 });
});

test("redemption: negative or non-numeric inputs count as 0", () => {
  const zero = { pointsRedeemed: 0, discountCents: 0 };
  assert.deepEqual(computePointsRedemption(-100000, 5000), zero);
  assert.deepEqual(computePointsRedemption(100000, -5000), zero);
  assert.deepEqual(computePointsRedemption("x", 5000), zero);
  assert.deepEqual(computePointsRedemption(100000, "x"), zero);
  assert.deepEqual(computePointsRedemption(undefined, undefined), zero);
  assert.deepEqual(computePointsRedemption(NaN, NaN), zero);
});

test("redemption: pointsRedeemed is multiple of 500 and discount consistent", () => {
  const r = computePointsRedemption(123456, 7777);
  assert.equal(r.pointsRedeemed % 500, 0);
  assert.equal(r.discountCents, (r.pointsRedeemed / 500) * 100);
});
