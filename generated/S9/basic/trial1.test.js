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

test("tierForCount: growth from 40 to 89 inclusive lower bound", () => {
  assert.equal(tierForCount(40), "growth");
  assert.equal(tierForCount(65), "growth");
  assert.equal(tierForCount(89), "growth");
});

test("tierForCount: scale from 90 upward", () => {
  assert.equal(tierForCount(90), "scale");
  assert.equal(tierForCount(500), "scale");
  assert.equal(tierForCount(100000), "scale");
});

test("tierForCount: missing or non-numeric counts as 0", () => {
  assert.equal(tierForCount(undefined), "free");
  assert.equal(tierForCount(null), "free");
  assert.equal(tierForCount("abc"), "free");
  assert.equal(tierForCount({}), "free");
  assert.equal(tierForCount(NaN), "free");
  assert.equal(tierForCount(), "free");
});

test("ticketsUntilNextTier: from free", () => {
  assert.equal(ticketsUntilNextTier(0), 40);
  assert.equal(ticketsUntilNextTier(1), 39);
  assert.equal(ticketsUntilNextTier(25), 15);
  assert.equal(ticketsUntilNextTier(39), 1);
});

test("ticketsUntilNextTier: from growth", () => {
  assert.equal(ticketsUntilNextTier(40), 50);
  assert.equal(ticketsUntilNextTier(60), 30);
  assert.equal(ticketsUntilNextTier(89), 1);
});

test("ticketsUntilNextTier: from scale is 0", () => {
  assert.equal(ticketsUntilNextTier(90), 0);
  assert.equal(ticketsUntilNextTier(1000), 0);
});

test("ticketsUntilNextTier: missing or non-numeric counts as 0", () => {
  assert.equal(ticketsUntilNextTier(undefined), 40);
  assert.equal(ticketsUntilNextTier(null), 40);
  assert.equal(ticketsUntilNextTier("xyz"), 40);
  assert.equal(ticketsUntilNextTier(NaN), 40);
});

test("ticketsUntilNextTier returns non-negative integer across range", () => {
  for (let n = 0; n <= 200; n++) {
    const r = ticketsUntilNextTier(n);
    assert.ok(Number.isInteger(r), `integer for ${n}`);
    assert.ok(r >= 0, `non-negative for ${n}`);
  }
});

test("tier and remaining are consistent: reaching the gap moves up a tier", () => {
  for (let n = 0; n < 90; n++) {
    const gap = ticketsUntilNextTier(n);
    assert.ok(gap > 0);
    assert.notEqual(tierForCount(n + gap), tierForCount(n));
    assert.equal(tierForCount(n + gap - 1), tierForCount(n));
  }
});
