const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/ticketTiers");

test("exports the threshold constant with growth 40 and scale 90", () => {
  assert.equal(mod.TICKET_TIER_THRESHOLDS.growth, 40);
  assert.equal(mod.TICKET_TIER_THRESHOLDS.scale, 90);
});

test("tierForCount: fewer than 40 tickets is free", () => {
  assert.equal(mod.tierForCount(0), "free");
  assert.equal(mod.tierForCount(1), "free");
  assert.equal(mod.tierForCount(20), "free");
});

test("tierForCount: 39 is free (just below growth)", () => {
  assert.equal(mod.tierForCount(39), "free");
});

test("tierForCount: 40 is growth (lower bound inclusive)", () => {
  assert.equal(mod.tierForCount(40), "growth");
});

test("tierForCount: 41 is growth (just above growth bound)", () => {
  assert.equal(mod.tierForCount(41), "growth");
});

test("tierForCount: 65 is growth (middle of band)", () => {
  assert.equal(mod.tierForCount(65), "growth");
});

test("tierForCount: 89 is growth (just below scale)", () => {
  assert.equal(mod.tierForCount(89), "growth");
});

test("tierForCount: 90 is scale (lower bound inclusive)", () => {
  assert.equal(mod.tierForCount(90), "scale");
});

test("tierForCount: 91 is scale (just above scale bound)", () => {
  assert.equal(mod.tierForCount(91), "scale");
});

test("tierForCount: very large counts are scale", () => {
  assert.equal(mod.tierForCount(1000), "scale");
  assert.equal(mod.tierForCount(100000), "scale");
});

test("tierForCount: missing count (undefined, no argument) counts as 0 so free", () => {
  assert.equal(mod.tierForCount(undefined), "free");
  assert.equal(mod.tierForCount(), "free");
});

test("tierForCount: null counts as 0 so free", () => {
  assert.equal(mod.tierForCount(null), "free");
});

test("tierForCount: non-numeric counts as 0 so free", () => {
  assert.equal(mod.tierForCount("abc"), "free");
  assert.equal(mod.tierForCount(NaN), "free");
  assert.equal(mod.tierForCount({}), "free");
  assert.equal(mod.tierForCount("not a number"), "free");
});

test("ticketsUntilNextTier: from free with 0 needs 40", () => {
  assert.equal(mod.ticketsUntilNextTier(0), 40);
});

test("ticketsUntilNextTier: from free with 1 needs 39", () => {
  assert.equal(mod.ticketsUntilNextTier(1), 39);
});

test("ticketsUntilNextTier: from free with 20 needs 20", () => {
  assert.equal(mod.ticketsUntilNextTier(20), 20);
});

test("ticketsUntilNextTier: 39 needs 1 (just below growth)", () => {
  assert.equal(mod.ticketsUntilNextTier(39), 1);
});

test("ticketsUntilNextTier: 40 is growth and needs 50 to reach 90", () => {
  assert.equal(mod.ticketsUntilNextTier(40), 50);
});

test("ticketsUntilNextTier: 41 needs 49", () => {
  assert.equal(mod.ticketsUntilNextTier(41), 49);
});

test("ticketsUntilNextTier: 65 needs 25", () => {
  assert.equal(mod.ticketsUntilNextTier(65), 25);
});

test("ticketsUntilNextTier: 89 needs 1 (just below scale)", () => {
  assert.equal(mod.ticketsUntilNextTier(89), 1);
});

test("ticketsUntilNextTier: 90 is scale and needs 0", () => {
  assert.equal(mod.ticketsUntilNextTier(90), 0);
});

test("ticketsUntilNextTier: 91 and larger from scale need 0", () => {
  assert.equal(mod.ticketsUntilNextTier(91), 0);
  assert.equal(mod.ticketsUntilNextTier(500), 0);
});

test("ticketsUntilNextTier: missing or null counts as 0 so needs 40", () => {
  assert.equal(mod.ticketsUntilNextTier(undefined), 40);
  assert.equal(mod.ticketsUntilNextTier(), 40);
  assert.equal(mod.ticketsUntilNextTier(null), 40);
});

test("ticketsUntilNextTier: non-numeric counts as 0 so needs 40", () => {
  assert.equal(mod.ticketsUntilNextTier("abc"), 40);
  assert.equal(mod.ticketsUntilNextTier(NaN), 40);
  assert.equal(mod.ticketsUntilNextTier({}), 40);
});

test("ticketsUntilNextTier: result is a non-negative integer across a range", () => {
  for (const n of [0, 1, 39, 40, 41, 89, 90, 91, 1000]) {
    const r = mod.ticketsUntilNextTier(n);
    assert.ok(Number.isInteger(r));
    assert.ok(r >= 0);
  }
});
