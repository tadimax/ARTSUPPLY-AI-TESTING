const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const NOW = Date.parse("2026-06-01T00:00:00.000Z");
const FUTURE = "2026-12-01T00:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";

test("foundingActive: true when until is in the future", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until: FUTURE } }, NOW), true);
});

test("foundingActive: false when until is in the past", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until: PAST } }, NOW), false);
});

test("foundingActive: false at exact expiry instant", () => {
  const until = "2026-06-01T00:00:00.000Z";
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until } }, NOW), false);
});

test("foundingActive: true one ms before expiry", () => {
  const until = "2026-06-01T00:00:00.000Z";
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until } }, NOW - 1), true);
});

test("foundingActive: zero rate is valid", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 0, until: FUTURE } }, NOW), true);
});

test("foundingActive: missing record or foundingFee is not active", () => {
  assert.equal(mod.foundingActive(null, NOW), false);
  assert.equal(mod.foundingActive(undefined, NOW), false);
  assert.equal(mod.foundingActive({}, NOW), false);
  assert.equal(mod.foundingActive({ sellerTier: "pro" }, NOW), false);
});

test("foundingActive: invalid bps is not active", () => {
  for (const bps of ["5000", "abc", NaN, Infinity, -Infinity, -1, null, undefined, {}]) {
    assert.equal(mod.foundingActive({ foundingFee: { bps, until: FUTURE } }, NOW), false, String(bps));
  }
});

test("foundingActive: unparseable or missing until is not active", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until: "not a date" } }, NOW), false);
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000 } }, NOW), false);
});

test("foundingActive: returns a boolean", () => {
  assert.equal(typeof mod.foundingActive({ foundingFee: { bps: 5000, until: FUTURE } }, NOW), "boolean");
  assert.equal(typeof mod.foundingActive(null, NOW), "boolean");
});

test("foundingActive: defaults nowMs to Date.now()", () => {
  const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  assert.equal(mod.foundingActive({ foundingFee: { bps: 1000, until: future } }), true);
  assert.equal(mod.foundingActive({ foundingFee: { bps: 1000, until: past } }), false);
});

test("bpsFor: default rate for null/undefined/empty user", () => {
  assert.equal(mod.bpsFor(null, undefined, NOW), 18000);
  assert.equal(mod.bpsFor(undefined, undefined, NOW), 18000);
  assert.equal(mod.bpsFor({}, undefined, NOW), 18000);
  assert.equal(mod.bpsFor(null), 18000);
});

test("bpsFor: tier rates", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro" }, 18000, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power" }, 18000, NOW), 10000);
  assert.equal(mod.bpsFor({ sellerTier: "free" }, 18000, NOW), 18000);
});

test("bpsFor: custom default bps used for default tier", () => {
  assert.equal(mod.bpsFor({}, 15000, NOW), 15000);
});

test("bpsFor: active founding rate lower than tier wins", () => {
  const user = { foundingFee: { bps: 5000, until: FUTURE } };
  assert.equal(mod.bpsFor(user, 18000, NOW), 5000);
  assert.equal(mod.bpsFor({ ...user, sellerTier: "pro" }, 18000, NOW), 5000);
  assert.equal(mod.bpsFor({ ...user, sellerTier: "power" }, 18000, NOW), 5000);
});

test("bpsFor: zero founding rate gives zero", () => {
  assert.equal(mod.bpsFor({ foundingFee: { bps: 0, until: FUTURE } }, 18000, NOW), 0);
});

test("bpsFor: founding rate never raises above tier rate", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 15000, until: FUTURE } }, 18000, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: 18000, until: FUTURE } }, 18000, NOW), 10000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: 20000, until: FUTURE } }, 18000, NOW), 18000);
});

test("bpsFor: founding rate equal to tier rate", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 12000, until: FUTURE } }, 18000, NOW), 12000);
});

test("bpsFor: expired founding rate ignored", () => {
  assert.equal(mod.bpsFor({ foundingFee: { bps: 5000, until: PAST } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 5000, until: PAST } }, 18000, NOW), 12000);
});

test("bpsFor: founding rate at exact expiry is ignored", () => {
  const until = "2026-06-01T00:00:00.000Z";
  assert.equal(mod.bpsFor({ foundingFee: { bps: 5000, until } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: 5000, until } }, 18000, NOW - 1), 5000);
});

test("bpsFor: invalid founding records are ignored", () => {
  assert.equal(mod.bpsFor({ foundingFee: { bps: "5000", until: FUTURE } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: -100, until: FUTURE } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: NaN, until: FUTURE } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: 5000, until: "garbage" } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: -5, until: FUTURE } }, 18000, NOW), 10000);
});

test("bpsFor: nowMs defaults to Date.now()", () => {
  const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  assert.equal(mod.bpsFor({ foundingFee: { bps: 3000, until: future } }), 3000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: 3000, until: past } }), 18000);
});
