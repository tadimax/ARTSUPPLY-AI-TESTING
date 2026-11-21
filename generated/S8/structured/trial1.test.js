const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computePointsEarned, computePointsRedemption } = mod;
const NONE = { pointsRedeemed: 0, discountCents: 0 };

// ---------- constants ----------
test("constant POINTS_PER_DOLLAR_EARNED is 1", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_EARNED, 1);
});
test("constant POINTS_PER_DOLLAR_OFF is 500", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_OFF, 500);
});
test("constant POINTS_MAX_DISCOUNT_BPS is 500 (5%)", () => {
  assert.equal(mod.POINTS_MAX_DISCOUNT_BPS, 500);
});

// ---------- earning ----------
test("earning: 1 point per whole dollar paid", () => {
  assert.equal(computePointsEarned(100), 1);
  assert.equal(computePointsEarned(2500), 25);
  assert.equal(computePointsEarned(10000), 100);
});

test("earning: partial dollars earn nothing (just below, at, just above a dollar)", () => {
  assert.equal(computePointsEarned(99), 0);
  assert.equal(computePointsEarned(100), 1);
  assert.equal(computePointsEarned(101), 1);
  assert.equal(computePointsEarned(199), 1);
  assert.equal(computePointsEarned(200), 2);
  assert.equal(computePointsEarned(201), 2);
  assert.equal(computePointsEarned(1999), 19);
});

test("earning: zero earns 0", () => {
  assert.equal(computePointsEarned(0), 0);
});

test("earning: below one dollar earns 0", () => {
  assert.equal(computePointsEarned(1), 0);
  assert.equal(computePointsEarned(50), 0);
});

test("earning: negative amounts earn 0", () => {
  assert.equal(computePointsEarned(-1), 0);
  assert.equal(computePointsEarned(-100), 0);
  assert.equal(computePointsEarned(-5000), 0);
});

test("earning: missing and non-numeric inputs earn 0", () => {
  assert.equal(computePointsEarned(), 0);
  assert.equal(computePointsEarned(undefined), 0);
  assert.equal(computePointsEarned(null), 0);
  assert.equal(computePointsEarned("abc"), 0);
  assert.equal(computePointsEarned(NaN), 0);
  assert.equal(computePointsEarned({}), 0);
});

// ---------- redemption: minimum 500 points ----------
test("redemption: fewer than 500 points redeems nothing (499)", () => {
  assert.deepEqual(computePointsRedemption(100000, 499), NONE);
});

test("redemption: exactly 500 points redeems one dollar", () => {
  assert.deepEqual(computePointsRedemption(100000, 500), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: 501 points still only one block", () => {
  assert.deepEqual(computePointsRedemption(100000, 501), { pointsRedeemed: 500, discountCents: 100 });
});

test("redemption: points spent in blocks of 500 (999, 1000, 1001)", () => {
  assert.deepEqual(computePointsRedemption(100000, 999), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(computePointsRedemption(100000, 1000), { pointsRedeemed: 1000, discountCents: 200 });
  assert.deepEqual(computePointsRedemption(100000, 1001), { pointsRedeemed: 1000, discountCents: 200 });
});

test("redemption: points redeemed is dollars times 500 and discount dollars times 100", () => {
  // 1500 points = 3 blocks, cap is $50 so points limit
  assert.deepEqual(computePointsRedemption(100000, 1500), { pointsRedeemed: 1500, discountCents: 300 });
  assert.deepEqual(computePointsRedemption(100000, 2499), { pointsRedeemed: 2000, discountCents: 400 });
});

// ---------- redemption: cap at 5% in whole dollars ----------
test("cap: subtotal just below $20 gives cap of $0 (1999 cents -> 99 cents -> 0 dollars)", () => {
  assert.deepEqual(computePointsRedemption(1999, 100000), NONE);
});

test("cap: subtotal exactly $20 gives cap of $1", () => {
  assert.deepEqual(computePointsRedemption(2000, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("cap: subtotal just above $20 still cap of $1", () => {
  assert.deepEqual(computePointsRedemption(2001, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("cap: subtotal 3999 gives cap of $1 (199 cents -> 1 dollar)", () => {
  assert.deepEqual(computePointsRedemption(3999, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("cap: subtotal 4000 gives cap of $2", () => {
  assert.deepEqual(computePointsRedemption(4000, 100000), { pointsRedeemed: 1000, discountCents: 200 });
});

test("cap: subtotal 4001 gives cap of $2", () => {
  assert.deepEqual(computePointsRedemption(4001, 100000), { pointsRedeemed: 1000, discountCents: 200 });
});

test("cap rounding: half-cent cap rounds down to whole cents before dollars (2019 -> 100.95 -> 100 -> $1)", () => {
  assert.deepEqual(computePointsRedemption(2019, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("cap rounding: 2020 -> 101 cents -> $1", () => {
  assert.deepEqual(computePointsRedemption(2020, 100000), { pointsRedeemed: 500, discountCents: 100 });
});

test("cap rounding: 19999 -> 999.95 -> 999 cents -> $9", () => {
  assert.deepEqual(computePointsRedemption(19999, 1000000), { pointsRedeemed: 4500, discountCents: 900 });
});

test("cap rounding: 20000 -> 1000 cents -> $10", () => {
  assert.deepEqual(computePointsRedemption(20000, 1000000), { pointsRedeemed: 5000, discountCents: 1000 });
});

test("cap rounding: 20019 -> 1000.95 -> 1000 -> $10 and 20020 -> 1001 -> $10", () => {
  assert.deepEqual(computePointsRedemption(20019, 1000000), { pointsRedeemed: 5000, discountCents: 1000 });
  assert.deepEqual(computePointsRedemption(20020, 1000000), { pointsRedeemed: 5000, discountCents: 1000 });
});

test("cap: large subtotal $1000 gives cap $50", () => {
  assert.deepEqual(computePointsRedemption(100000, 1000000), { pointsRedeemed: 25000, discountCents: 5000 });
});

// ---------- smaller of cap and blocks ----------
test("smaller-of: cap wins when buyer has many points", () => {
  // subtotal $40 -> cap $2; 100000 points = 200 blocks
  assert.deepEqual(computePointsRedemption(4000, 100000), { pointsRedeemed: 1000, discountCents: 200 });
});

test("smaller-of: points win when cap is larger", () => {
  // subtotal $1000 -> cap $50; 1500 points = 3 blocks
  assert.deepEqual(computePointsRedemption(100000, 1500), { pointsRedeemed: 1500, discountCents: 300 });
});

test("smaller-of: cap equals blocks (both 2)", () => {
  assert.deepEqual(computePointsRedemption(4000, 1000), { pointsRedeemed: 1000, discountCents: 200 });
});

test("smaller-of: cap 2 dollars, blocks 1 and blocks 3", () => {
  assert.deepEqual(computePointsRedemption(4000, 500), { pointsRedeemed: 500, discountCents: 100 });
  assert.deepEqual(computePointsRedemption(4000, 1500), { pointsRedeemed: 1000, discountCents: 200 });
});

test("smaller-of: cap of zero beats plenty of points; no points are spent", () => {
  const r = computePointsRedemption(1999, 5000);
  assert.equal(r.pointsRedeemed, 0);
  assert.equal(r.discountCents, 0);
});

// ---------- zero / negative / missing / non-numeric ----------
test("redemption: zero subtotal redeems nothing", () => {
  assert.deepEqual(computePointsRedemption(0, 100000), NONE);
});

test("redemption: zero points redeems nothing", () => {
  assert.deepEqual(computePointsRedemption(100000, 0), NONE);
});

test("redemption: negative subtotal counts as 0", () => {
  assert.deepEqual(computePointsRedemption(-100000, 100000), NONE);
});

test("redemption: negative points count as 0", () => {
  assert.deepEqual(computePointsRedemption(100000, -5000), NONE);
});

test("redemption: non-numeric subtotal counts as 0", () => {
  assert.deepEqual(computePointsRedemption("abc", 100000), NONE);
  assert.deepEqual(computePointsRedemption(NaN, 100000), NONE);
  assert.deepEqual(computePointsRedemption(null, 100000), NONE);
  assert.deepEqual(computePointsRedemption(undefined, 100000), NONE);
});

test("redemption: non-numeric points count as 0", () => {
  assert.deepEqual(computePointsRedemption(100000, "abc"), NONE);
  assert.deepEqual(computePointsRedemption(100000, NaN), NONE);
  assert.deepEqual(computePointsRedemption(100000, null), NONE);
  assert.deepEqual(computePointsRedemption(100000, undefined), NONE);
});

test("redemption: both missing returns nothing", () => {
  assert.deepEqual(computePointsRedemption(), NONE);
});

// ---------- fractional points ----------
test("fractional points are rounded down (499.9 -> 499 redeems nothing)", () => {
  assert.deepEqual(computePointsRedemption(100000, 499.9), NONE);
});

test("fractional points are rounded down (500.5 -> 500 one block)", () => {
  assert.deepEqual(computePointsRedemption(100000, 500.5), { pointsRedeemed: 500, discountCents: 100 });
});

test("fractional points are rounded down (999.9 -> 999 one block)", () => {
  assert.deepEqual(computePointsRedemption(100000, 999.9), { pointsRedeemed: 500, discountCents: 100 });
});

test("fractional points are rounded down (1000.9 -> 1000 two blocks)", () => {
  assert.deepEqual(computePointsRedemption(100000, 1000.9), { pointsRedeemed: 1000, discountCents: 200 });
});
