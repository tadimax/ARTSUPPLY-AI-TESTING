const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const earn = mod.computePointsEarned;
const redeem = mod.computePointsRedemption;
const ZERO = { pointsRedeemed: 0, discountCents: 0 };

test("exported constants match the stated rates", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_EARNED, 1);
  assert.equal(mod.POINTS_PER_DOLLAR_OFF, 500);
  assert.equal(mod.POINTS_MAX_DISCOUNT_BPS, 500);
});

test("earning: 1 point per whole dollar", () => {
  assert.equal(earn(100), 1);
  assert.equal(earn(1000), 10);
  assert.equal(earn(12300), 123);
});

test("earning: partial dollars earn nothing (just below, at, just above a dollar)", () => {
  assert.equal(earn(99), 0);
  assert.equal(earn(100), 1);
  assert.equal(earn(101), 1);
  assert.equal(earn(199), 1);
  assert.equal(earn(200), 2);
  assert.equal(earn(201), 2);
  assert.equal(earn(1999), 19);
});

test("earning: zero earns 0", () => {
  assert.equal(earn(0), 0);
});

test("earning: negative amounts earn 0", () => {
  assert.equal(earn(-1), 0);
  assert.equal(earn(-100), 0);
  assert.equal(earn(-10000), 0);
});

test("earning: non-numeric and missing amounts earn 0", () => {
  assert.equal(earn(undefined), 0);
  assert.equal(earn(null), 0);
  assert.equal(earn("abc"), 0);
  assert.equal(earn(NaN), 0);
  assert.equal(earn({}), 0);
});

test("redemption: fewer than 500 points redeems nothing (499, 500, 501)", () => {
  assert.deepEqual(redeem(100000, 499), ZERO);
  assert.deepEqual(redeem(100000, 500), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(redeem(100000, 501), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: zero points redeems nothing", () => {
  assert.deepEqual(redeem(100000, 0), ZERO);
});

test("redemption: points spent in blocks of 500 (999 gives 1 block, 1000 gives 2)", () => {
  assert.deepEqual(redeem(100000, 999), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(redeem(100000, 1000), { pointsRedeemed: 1000, discountCents: 200 });
  assert.deepEqual(redeem(100000, 1001), { pointsRedeemed: 1000, discountCents: 200 });
  assert.deepEqual(redeem(100000, 1499), { pointsRedeemed: 1000, discountCents: 200 });
});

test("redemption: cap is 5% of subtotal in whole dollars (subtotal 1999, 2000, 2001)", () => {
  // 1999 -> 99.95 cents -> 99 cents -> 0 dollars
  assert.deepEqual(redeem(1999, 100000), ZERO);
  // 2000 -> 100 cents -> 1 dollar
  assert.deepEqual(redeem(2000, 100000), { pointsRedeemed: 500, discountCents: 100 });
  // 2001 -> 100.05 -> 100 cents -> 1 dollar
  assert.deepEqual(redeem(2001, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: cap rounds down to cents then dollars (3999, 4000, 4001)", () => {
  // 3999 -> 199.95 -> 199 -> 1 dollar
  assert.deepEqual(redeem(3999, 100000), { pointsRedeemed: 500, discountCents: 100 });
  // 4000 -> 200 -> 2 dollars
  assert.deepEqual(redeem(4000, 100000), { pointsRedeemed: 1000, discountCents: 200 });
  // 4001 -> 200.05 -> 200 -> 2 dollars
  assert.deepEqual(redeem(4001, 100000), { pointsRedeemed: 1000, discountCents: 200 });
});

test("redemption: cap dollars is the smaller when the cap is lower than the blocks", () => {
  // subtotal 100000 -> cap 5000 cents -> 50 dollars; 30000 points -> 60 blocks; cap wins
  assert.deepEqual(redeem(100000, 30000), { pointsRedeemed: 25000, discountCents: 5000 });
});

test("redemption: blocks are the smaller when fewer than the cap", () => {
  // cap 50 dollars; 10000 points -> 20 blocks; blocks win
  assert.deepEqual(redeem(100000, 10000), { pointsRedeemed: 10000, discountCents: 2000 });
});

test("redemption: cap and blocks equal", () => {
  // cap 50 dollars; 25000 points -> 50 blocks
  assert.deepEqual(redeem(100000, 25000), { pointsRedeemed: 25000, discountCents: 5000 });
  // one block below, at, above the cap
  assert.deepEqual(redeem(100000, 24999), { pointsRedeemed: 24500, discountCents: 4900 });
  assert.deepEqual(redeem(100000, 25500), { pointsRedeemed: 25000, discountCents: 5000 });
});

test("redemption: zero subtotal redeems nothing", () => {
  assert.deepEqual(redeem(0, 100000), ZERO);
});

test("redemption: negative subtotal counts as 0", () => {
  assert.deepEqual(redeem(-5000, 100000), ZERO);
});

test("redemption: negative points count as 0", () => {
  assert.deepEqual(redeem(100000, -500), ZERO);
  assert.deepEqual(redeem(100000, -1), ZERO);
});

test("redemption: non-numeric and missing subtotal counts as 0", () => {
  assert.deepEqual(redeem(undefined, 100000), ZERO);
  assert.deepEqual(redeem(null, 100000), ZERO);
  assert.deepEqual(redeem("abc", 100000), ZERO);
  assert.deepEqual(redeem(NaN, 100000), ZERO);
});

test("redemption: non-numeric and missing points count as 0", () => {
  assert.deepEqual(redeem(100000, undefined), ZERO);
  assert.deepEqual(redeem(100000, null), ZERO);
  assert.deepEqual(redeem(100000, "abc"), ZERO);
  assert.deepEqual(redeem(100000, NaN), ZERO);
});

test("redemption: fractional points are rounded down", () => {
  // 499.9 -> 499 -> 0 blocks
  assert.deepEqual(redeem(100000, 499.9), ZERO);
  // 500.5 -> 500 -> 1 block
  assert.deepEqual(redeem(100000, 500.5), { pointsRedeemed: 500, discountCents: 100 });
  // 999.9 -> 999 -> 1 block
  assert.deepEqual(redeem(100000, 999.9), { pointsRedeemed: 500, discountCents: 100 });
  // 1000.1 -> 1000 -> 2 blocks
  assert.deepEqual(redeem(100000, 1000.1), { pointsRedeemed: 1000, discountCents: 200 });
});

test("redemption: pointsRedeemed is dollars times 500 and discount is dollars times 100", () => {
  const r = redeem(60000, 100000); // cap 3000 cents -> 30 dollars; 200 blocks; 30 wins
  assert.equal(r.pointsRedeemed, 15000);
  assert.equal(r.discountCents, 3000);
});

test("redemption: points beyond the redeemed blocks are not spent", () => {
  // 1999 points -> 3 blocks, redeem only 1500
  const r = redeem(100000, 1999);
  assert.equal(r.pointsRedeemed, 1500);
  assert.equal(r.discountCents, 300);
});
