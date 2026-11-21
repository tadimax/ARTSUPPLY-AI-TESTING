const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/ticketTiers");

const { tierForCount, ticketsUntilNextTier, TICKET_TIER_THRESHOLDS } = mod;

test("exports TICKET_TIER_THRESHOLDS with growth 40 and scale 90", () => {
  assert.equal(TICKET_TIER_THRESHOLDS.growth, 40);
  assert.equal(TICKET_TIER_THRESHOLDS.scale, 90);
});

test("tierForCount: zero tickets is free", () => {
  assert.equal(tierForCount(0), "free");
});

test("tierForCount: growth boundary 39 is free", () => {
  assert.equal(tierForCount(39), "free");
});

test("tierForCount: growth boundary 40 is growth (lower bound inclusive)", () => {
  assert.equal(tierForCount(40), "growth");
});

test("tierForCount: growth boundary 41 is growth", () => {
  assert.equal(tierForCount(41), "growth");
});

test("tierForCount: scale boundary 89 is growth", () => {
  assert.equal(tierForCount(89), "growth");
});

test("tierForCount: scale boundary 90 is scale (lower bound inclusive)", () => {
  assert.equal(tierForCount(90), "scale");
});

test("tierForCount: scale boundary 91 is scale", () => {
  assert.equal(tierForCount(91), "scale");
});

test("tierForCount: large count is scale", () => {
  assert.equal(tierForCount(10000), "scale");
});

test("tierForCount: mid-band values", () => {
  assert.equal(tierForCount(20), "free");
  assert.equal(tierForCount(65), "growth");
  assert.equal(tierForCount(150), "scale");
});

test("tierForCount: missing count (undefined, no argument) counts as 0 so free", () => {
  assert.equal(tierForCount(undefined), "free");
  assert.equal(tierForCount(), "free");
});

test("tierForCount: null counts as 0 so free", () => {
  assert.equal(tierForCount(null), "free");
});

test("tierForCount: non-numeric counts as 0 so free", () => {
  assert.equal(tierForCount("abc"), "free");
  assert.equal(tierForCount(NaN), "free");
  assert.equal(tierForCount({}), "free");
});

test("ticketsUntilNextTier: zero tickets needs 40", () => {
  assert.equal(ticketsUntilNextTier(0), 40);
});

test("ticketsUntilNextTier: free band 1, 20, 38, 39", () => {
  assert.equal(ticketsUntilNextTier(1), 39);
  assert.equal(ticketsUntilNextTier(20), 20);
  assert.equal(ticketsUntilNextTier(38), 2);
  assert.equal(ticketsUntilNextTier(39), 1);
});

test("ticketsUntilNextTier: at 40 (growth) needs 50 to reach 90", () => {
  assert.equal(ticketsUntilNextTier(40), 50);
});

test("ticketsUntilNextTier: growth band 41, 65, 88, 89", () => {
  assert.equal(ticketsUntilNextTier(41), 49);
  assert.equal(ticketsUntilNextTier(65), 25);
  assert.equal(ticketsUntilNextTier(88), 2);
  assert.equal(ticketsUntilNextTier(89), 1);
});

test("ticketsUntilNextTier: scale at 90 is 0", () => {
  assert.equal(ticketsUntilNextTier(90), 0);
});

test("ticketsUntilNextTier: scale above 90 is 0, never negative", () => {
  assert.equal(ticketsUntilNextTier(91), 0);
  assert.equal(ticketsUntilNextTier(150), 0);
  assert.equal(ticketsUntilNextTier(10000), 0);
});

test("ticketsUntilNextTier: missing count counts as 0 so needs 40", () => {
  assert.equal(ticketsUntilNextTier(undefined), 40);
  assert.equal(ticketsUntilNextTier(), 40);
  assert.equal(ticketsUntilNextTier(null), 40);
});

test("ticketsUntilNextTier: non-numeric counts as 0 so needs 40", () => {
  assert.equal(ticketsUntilNextTier("abc"), 40);
  assert.equal(ticketsUntilNextTier(NaN), 40);
  assert.equal(ticketsUntilNextTier({}), 40);
});

test("ticketsUntilNextTier: returns an integer", () => {
  for (const n of [0, 1, 39, 40, 89, 90, 200]) {
    assert.ok(Number.isInteger(ticketsUntilNextTier(n)));
    assert.ok(ticketsUntilNextTier(n) >= 0);
  }
});
