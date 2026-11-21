const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/ticketTiers");

const { tierForCount, ticketsUntilNextTier, TICKET_TIER_THRESHOLDS } = mod;

test("exported thresholds have growth 40 and scale 90", () => {
  assert.equal(TICKET_TIER_THRESHOLDS.growth, 40);
  assert.equal(TICKET_TIER_THRESHOLDS.scale, 90);
});

test("tier free below 40: 0, 1, 39", () => {
  assert.equal(tierForCount(0), "free");
  assert.equal(tierForCount(1), "free");
  assert.equal(tierForCount(39), "free");
});

test("tier growth lower bound 40 is inclusive", () => {
  assert.equal(tierForCount(40), "growth");
});

test("tier growth just above lower bound 41 and mid-band 65", () => {
  assert.equal(tierForCount(41), "growth");
  assert.equal(tierForCount(65), "growth");
});

test("tier growth upper end 89 is still growth", () => {
  assert.equal(tierForCount(89), "growth");
});

test("tier scale lower bound 90 is inclusive", () => {
  assert.equal(tierForCount(90), "scale");
});

test("tier scale above 90: 91, 500", () => {
  assert.equal(tierForCount(91), "scale");
  assert.equal(tierForCount(500), "scale");
});

test("missing count undefined counts as 0 (free)", () => {
  assert.equal(tierForCount(undefined), "free");
  assert.equal(tierForCount(), "free");
});

test("null count counts as 0 (free)", () => {
  assert.equal(tierForCount(null), "free");
});

test("non-numeric count counts as 0 (free)", () => {
  assert.equal(tierForCount("abc"), "free");
  assert.equal(tierForCount(NaN), "free");
  assert.equal(tierForCount({}), "free");
});

test("until next tier from free: 40 minus count", () => {
  assert.equal(ticketsUntilNextTier(0), 40);
  assert.equal(ticketsUntilNextTier(1), 39);
  assert.equal(ticketsUntilNextTier(25), 15);
  assert.equal(ticketsUntilNextTier(38), 2);
  assert.equal(ticketsUntilNextTier(39), 1);
});

test("until next tier at exactly 40 (growth) is 50", () => {
  assert.equal(ticketsUntilNextTier(40), 50);
});

test("until next tier from growth: 90 minus count", () => {
  assert.equal(ticketsUntilNextTier(41), 49);
  assert.equal(ticketsUntilNextTier(60), 30);
  assert.equal(ticketsUntilNextTier(88), 2);
  assert.equal(ticketsUntilNextTier(89), 1);
});

test("until next tier from scale is 0 at 90 and above", () => {
  assert.equal(ticketsUntilNextTier(90), 0);
  assert.equal(ticketsUntilNextTier(91), 0);
  assert.equal(ticketsUntilNextTier(1000), 0);
});

test("until next tier for missing, null and non-numeric counts treated as 0 gives 40", () => {
  assert.equal(ticketsUntilNextTier(undefined), 40);
  assert.equal(ticketsUntilNextTier(), 40);
  assert.equal(ticketsUntilNextTier(null), 40);
  assert.equal(ticketsUntilNextTier("abc"), 40);
  assert.equal(ticketsUntilNextTier(NaN), 40);
});

test("until next tier is never negative across a range", () => {
  for (let n = 0; n <= 200; n++) {
    const r = ticketsUntilNextTier(n);
    assert.ok(Number.isInteger(r));
    assert.ok(r >= 0);
  }
});
