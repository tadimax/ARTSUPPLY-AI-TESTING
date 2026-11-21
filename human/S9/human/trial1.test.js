"use strict";

// Behavioral tests for the rolling ticket-fee tier (free/growth/scale), the
// part of ticketTiers.js that's pure and Firestore-free. Boundary values
// matter here since they directly gate buyer-facing pricing.

const test = require("node:test");
const assert = require("node:assert/strict");

const { tierForCount, ticketsUntilNextTier, TICKET_TIER_THRESHOLDS } = require("../../../sut/ticketTiers");

test("ticket tier: 0 tickets is free", () => {
  assert.equal(tierForCount(0), "free");
});

test("ticket tier: just under growth threshold is still free", () => {
  assert.equal(tierForCount(TICKET_TIER_THRESHOLDS.growth - 1), "free");
});

test("ticket tier: exactly at growth threshold is growth", () => {
  assert.equal(tierForCount(TICKET_TIER_THRESHOLDS.growth), "growth");
});

test("ticket tier: just under scale threshold is still growth", () => {
  assert.equal(tierForCount(TICKET_TIER_THRESHOLDS.scale - 1), "growth");
});

test("ticket tier: exactly at scale threshold is scale", () => {
  assert.equal(tierForCount(TICKET_TIER_THRESHOLDS.scale), "scale");
});

test("ticket tier: well above scale threshold stays scale", () => {
  assert.equal(tierForCount(10000), "scale");
});

test("tickets until next tier: 0 tickets needs full growth threshold", () => {
  assert.equal(ticketsUntilNextTier(0), TICKET_TIER_THRESHOLDS.growth);
});

test("tickets until next tier: mid-growth counts down to scale threshold", () => {
  assert.equal(ticketsUntilNextTier(50), TICKET_TIER_THRESHOLDS.scale - 50);
});

test("tickets until next tier: at scale is zero (no further tier)", () => {
  assert.equal(ticketsUntilNextTier(TICKET_TIER_THRESHOLDS.scale), 0);
});
