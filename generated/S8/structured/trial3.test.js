const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const ZERO = { pointsRedeemed: 0, discountCents: 0 };

test("constants: points per dollar earned is 1", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_EARNED, 1);
});
test("constants: 500 points per dollar off", () => {
  assert.equal(mod.POINTS_PER_DOLLAR_OFF, 500);
});
test("constants: max discount is 5% (500 bps)", () => {
  assert.equal(mod.POINTS_MAX_DISCOUNT_BPS, 500);
});

// Earning
test("earn: zero cents earns 0", () => {
  assert.equal(mod.computePointsEarned(0), 0);
});
test("earn: just under one dollar (99 cents) earns 0", () => {
  assert.equal(mod.computePointsEarned(99), 0);
});
test("earn: exactly one dollar earns 1", () => {
  assert.equal(mod.computePointsEarned(100), 1);
});
test("earn: just over one dollar (101 cents) earns 1, partial dollar earns nothing", () => {
  assert.equal(mod.computePointsEarned(101), 1);
});
test("earn: 199 cents earns 1", () => {
  assert.equal(mod.computePointsEarned(199), 1);
});
test("earn: 200 cents earns 2", () => {
  assert.equal(mod.computePointsEarned(200), 2);
});
test("earn: 12345 cents earns 123", () => {
  assert.equal(mod.computePointsEarned(12345), 123);
});
test("earn: 1000000 cents earns 10000", () => {
  assert.equal(mod.computePointsEarned(1000000), 10000);
});
test("earn: negative amount earns 0", () => {
  assert.equal(mod.computePointsEarned(-100), 0);
  assert.equal(mod.computePointsEarned(-1), 0);
  assert.equal(mod.computePointsEarned(-5000), 0);
});
test("earn: non-numeric amount earns 0", () => {
  assert.equal(mod.computePointsEarned("abc"), 0);
  assert.equal(mod.computePointsEarned(NaN), 0);
  assert.equal(mod.computePointsEarned({}), 0);
});
test("earn: null and undefined earn 0", () => {
  assert.equal(mod.computePointsEarned(null), 0);
  assert.equal(mod.computePointsEarned(undefined), 0);
  assert.equal(mod.computePointsEarned(), 0);
});

// Redemption: block threshold of 500 points
test("redeem: 499 points (just below one block) redeems nothing", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 499), ZERO);
});
test("redeem: exactly 500 points redeems one dollar", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 500), { pointsRedeemed: 500, discountCents: 100 });
});
test("redeem: 501 points redeems one dollar, extra points not spent", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 501), { pointsRedeemed: 500, discountCents: 100 });
});
test("redeem: 999 points (just below two blocks) redeems one dollar", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 999), { pointsRedeemed: 500, discountCents: 100 });
});
test("redeem: 1000 points redeems two dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 1000), { pointsRedeemed: 1000, discountCents: 200 });
});
test("redeem: 1001 points redeems two dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 1001), { pointsRedeemed: 1000, discountCents: 200 });
});
test("redeem: zero points redeems nothing", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 0), ZERO);
});

// Cap: 5% of subtotal, floor to cents then floor to dollars
test("cap: subtotal 1999 cents gives cap 99 cents, 0 dollars, redeems nothing", () => {
  assert.deepEqual(mod.computePointsRedemption(1999, 100000), ZERO);
});
test("cap: subtotal 2000 cents gives cap 100 cents, 1 dollar", () => {
  assert.deepEqual(mod.computePointsRedemption(2000, 100000), { pointsRedeemed: 500, discountCents: 100 });
});
test("cap: subtotal 2001 cents gives cap 100 cents, 1 dollar", () => {
  assert.deepEqual(mod.computePointsRedemption(2001, 100000), { pointsRedeemed: 500, discountCents: 100 });
});
test("cap: subtotal 3999 cents gives cap 199 cents, 1 dollar (rounded down to whole dollars)", () => {
  assert.deepEqual(mod.computePointsRedemption(3999, 100000), { pointsRedeemed: 500, discountCents: 100 });
});
test("cap: subtotal 4000 cents gives cap 200 cents, 2 dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(4000, 100000), { pointsRedeemed: 1000, discountCents: 200 });
});
test("cap: subtotal 19999 cents gives cap 999 cents, 9 dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(19999, 100000), { pointsRedeemed: 4500, discountCents: 900 });
});
test("cap: subtotal 20000 cents gives cap 1000 cents, 10 dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(20000, 100000), { pointsRedeemed: 5000, discountCents: 1000 });
});
test("cap: subtotal 20001 cents gives cap 1000 cents, 10 dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(20001, 100000), { pointsRedeemed: 5000, discountCents: 1000 });
});
test("cap: subtotal 100000 cents gives cap 50 dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 1000000), { pointsRedeemed: 25000, discountCents: 5000 });
});
test("cap: fractional-cent cap is floored to cents first (subtotal 1999.99 gives 99 cents, 0 dollars)", () => {
  assert.deepEqual(mod.computePointsRedemption(1999.99, 100000), ZERO);
});

// Smaller of cap and blocks
test("smaller-of: cap wins when buyer has more blocks than cap (50 cap, 60 blocks)", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 30000), { pointsRedeemed: 25000, discountCents: 5000 });
});
test("smaller-of: blocks win when cap is larger (50 cap, 20 blocks)", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 10000), { pointsRedeemed: 10000, discountCents: 2000 });
});
test("smaller-of: equal cap and blocks (50 and 50)", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 25000), { pointsRedeemed: 25000, discountCents: 5000 });
});
test("smaller-of: one block below cap (49 blocks, cap 50)", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 24999), { pointsRedeemed: 24500, discountCents: 4900 });
});
test("smaller-of: one block above cap (51 blocks, cap 50)", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 25500), { pointsRedeemed: 25000, discountCents: 5000 });
});
test("smaller-of: points not enough for a dollar even though cap allows (cap 10, 499 pts)", () => {
  assert.deepEqual(mod.computePointsRedemption(20000, 499), ZERO);
});

// Zero / invalid inputs
test("redeem: zero subtotal redeems nothing", () => {
  assert.deepEqual(mod.computePointsRedemption(0, 100000), ZERO);
});
test("redeem: negative subtotal counts as 0", () => {
  assert.deepEqual(mod.computePointsRedemption(-100000, 100000), ZERO);
});
test("redeem: negative points count as 0", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, -1000), ZERO);
});
test("redeem: non-numeric subtotal counts as 0", () => {
  assert.deepEqual(mod.computePointsRedemption("abc", 100000), ZERO);
  assert.deepEqual(mod.computePointsRedemption(NaN, 100000), ZERO);
});
test("redeem: non-numeric points count as 0", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, "abc"), ZERO);
  assert.deepEqual(mod.computePointsRedemption(100000, NaN), ZERO);
});
test("redeem: null and undefined subtotal count as 0", () => {
  assert.deepEqual(mod.computePointsRedemption(null, 100000), ZERO);
  assert.deepEqual(mod.computePointsRedemption(undefined, 100000), ZERO);
});
test("redeem: null and undefined points count as 0", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, null), ZERO);
  assert.deepEqual(mod.computePointsRedemption(100000, undefined), ZERO);
  assert.deepEqual(mod.computePointsRedemption(100000), ZERO);
});
test("redeem: no arguments redeems nothing", () => {
  assert.deepEqual(mod.computePointsRedemption(), ZERO);
});

// Fractional points rounded down
test("fractional points: 499.9 rounds down to 499 and redeems nothing", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 499.9), ZERO);
});
test("fractional points: 500.9 rounds down to 500 and redeems one dollar", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 500.9), { pointsRedeemed: 500, discountCents: 100 });
});
test("fractional points: 999.99 rounds down to 999, one dollar", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 999.99), { pointsRedeemed: 500, discountCents: 100 });
});
test("fractional points: 1000.5 rounds down to 1000, two dollars", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 1000.5), { pointsRedeemed: 1000, discountCents: 200 });
});

// Relationships
test("redeem: pointsRedeemed is dollars times 500 and discountCents is dollars times 100", () => {
  const r = mod.computePointsRedemption(60000, 7777);
  // cap: 3000 cents -> 30 dollars; blocks: 15 -> 15 dollars
  assert.deepEqual(r, { pointsRedeemed: 7500, discountCents: 1500 });
  assert.equal(r.pointsRedeemed / 500, r.discountCents / 100);
});
test("redeem: redeemed points are never more than available points", () => {
  assert.deepEqual(mod.computePointsRedemption(100000, 1499), { pointsRedeemed: 1000, discountCents: 200 });
});
