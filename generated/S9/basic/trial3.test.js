const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/ticketTiers");

const { tierForCount, ticketsUntilNextTier, TICKET_TIER_THRESHOLDS } = mod;

test("thresholds constant has growth 40 and scale 90", () => {
  assert.equal(TICKET_TIER_THRESHOLDS.growth, 40);
  assert.equal(TICKET_TIER_THRESHOLDS.scale, 90);
});

test("tierForCount: free below 40", () => {
  assert.equal(tierForCount(0), "free");
  assert.equal(tierForCount(1), "free");
  assert.equal(tierForCount(39), "free");
});

test("tierForCount: growth from 40 to 89 inclusive", () => {
  assert.equal(tierForCount(40), "growth");
  assert.equal(tierForCount(65), "growth");
  assert.equal(tierForCount(89), "growth");
});

test("tierForCount: scale from 90 up", () => {
  assert.equal(tierForCount(90), "scale");
  assert.equal(tierForCount(91), "scale");
  assert.equal(tierForCount(10000), "scale");
});

test("tierForCount: missing or non-numeric counts as 0", () => {
  assert.equal(tierForCount(undefined), "free");
  assert.equal(tierForCount(null), "free");
  assert.equal(tierForCount("abc"), "free");
  assert.equal(tierForCount({}), "free");
  assert.equal(tierForCount(NaN), "free");
});

test("ticketsUntilNextTier: from free", () => {
  assert.equal(ticketsUntilNextTier(0), 40);
  assert.equal(ticketsUntilNextTier(1), 39);
  assert.equal(ticketsUntilNextTier(39), 1);
});

test("ticketsUntilNextTier: from growth", () => {
  assert.equal(ticketsUntilNextTier(40), 50);
  assert.equal(ticketsUntilNextTier(60), 30);
  assert.equal(ticketsUntilNextTier(89), 1);
});

test("ticketsUntilNextTier: scale is 0", () => {
  assert.equal(ticketsUntilNextTier(90), 0);
  assert.equal(ticketsUntilNextTier(500), 0);
});

test("ticketsUntilNextTier: missing or non-numeric treated as 0", () => {
  assert.equal(ticketsUntilNextTier(undefined), 40);
  assert.equal(ticketsUntilNextTier(null), 40);
  assert.equal(ticketsUntilNextTier("xyz"), 40);
});

test("ticketsUntilNextTier returns non-negative integers for a range", () => {
  for (let n = 0; n <= 150; n++) {
    const r = ticketsUntilNextTier(n);
    assert.ok(Number.isInteger(r));
    assert.ok(r >= 0);
  }
});

test("reaching the needed tickets moves to the next tier", () => {
  for (const n of [0, 10, 39, 40, 75, 89]) {
    const need = ticketsUntilNextTier(n);
    assert.notEqual(tierForCount(n + need), tierForCount(n));
    if (need > 0) assert.equal(tierForCount(n + need - 1), tierForCount(n));
  }
});
