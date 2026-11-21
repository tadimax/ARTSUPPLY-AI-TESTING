const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const NOW = Date.parse("2026-06-01T00:00:00.000Z");
const FUTURE = "2026-12-01T00:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";

test("foundingActive: future until is active", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until: FUTURE } }, NOW), true);
});

test("foundingActive: past until is inactive", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until: PAST } }, NOW), false);
});

test("foundingActive: exact expiry instant is inactive", () => {
  const until = "2026-06-01T00:00:00.000Z";
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until } }, Date.parse(until)), false);
});

test("foundingActive: one ms before expiry is active", () => {
  const until = "2026-06-01T00:00:00.000Z";
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until } }, Date.parse(until) - 1), true);
});

test("foundingActive: zero rate is valid", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 0, until: FUTURE } }, NOW), true);
});

test("foundingActive: missing user or foundingFee is inactive", () => {
  assert.equal(mod.foundingActive(null, NOW), false);
  assert.equal(mod.foundingActive(undefined, NOW), false);
  assert.equal(mod.foundingActive({}, NOW), false);
  assert.equal(mod.foundingActive({ foundingFee: null }, NOW), false);
});

test("foundingActive: invalid bps is inactive", () => {
  for (const bps of ["5000", NaN, Infinity, -Infinity, -1, null, undefined, {}]) {
    assert.equal(mod.foundingActive({ foundingFee: { bps, until: FUTURE } }, NOW), false, String(bps));
  }
});

test("foundingActive: unparseable or missing until is inactive", () => {
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000, until: "not a date" } }, NOW), false);
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000 } }, NOW), false);
});

test("foundingActive: returns a boolean", () => {
  assert.equal(typeof mod.foundingActive({ foundingFee: { bps: 5000, until: FUTURE } }, NOW), "boolean");
  assert.equal(typeof mod.foundingActive(null, NOW), "boolean");
});

test("foundingActive: defaults nowMs to Date.now()", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(mod.foundingActive({ foundingFee: { bps: 1, until: future } }), true);
  assert.equal(mod.foundingActive({ foundingFee: { bps: 1, until: past } }), false);
});

test("bpsFor: tier rates without founding", () => {
  assert.equal(mod.bpsFor(null, 18000, NOW), 18000);
  assert.equal(mod.bpsFor(undefined, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({}, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro" }, 18000, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power" }, 18000, NOW), 10000);
});

test("bpsFor: default arguments give 18%", () => {
  assert.equal(mod.bpsFor(null), 18000);
  assert.equal(mod.bpsFor({}), 18000);
});

test("bpsFor: active founding rate lowers default tier rate", () => {
  const user = { foundingFee: { bps: 5000, until: FUTURE } };
  assert.equal(mod.bpsFor(user, 18000, NOW), 5000);
});

test("bpsFor: founding rate lowers pro tier rate", () => {
  const user = { sellerTier: "pro", foundingFee: { bps: 8000, until: FUTURE } };
  assert.equal(mod.bpsFor(user, 18000, NOW), 8000);
});

test("bpsFor: founding rate never raises above tier rate", () => {
  const pro = { sellerTier: "pro", foundingFee: { bps: 15000, until: FUTURE } };
  assert.equal(mod.bpsFor(pro, 18000, NOW), 12000);
  const power = { sellerTier: "power", foundingFee: { bps: 12000, until: FUTURE } };
  assert.equal(mod.bpsFor(power, 18000, NOW), 10000);
  const def = { foundingFee: { bps: 25000, until: FUTURE } };
  assert.equal(mod.bpsFor(def, 18000, NOW), 18000);
});

test("bpsFor: zero founding rate gives zero", () => {
  const user = { sellerTier: "power", foundingFee: { bps: 0, until: FUTURE } };
  assert.equal(mod.bpsFor(user, 18000, NOW), 0);
});

test("bpsFor: expired founding rate is ignored", () => {
  const user = { foundingFee: { bps: 5000, until: PAST } };
  assert.equal(mod.bpsFor(user, 18000, NOW), 18000);
  const pro = { sellerTier: "pro", foundingFee: { bps: 5000, until: PAST } };
  assert.equal(mod.bpsFor(pro, 18000, NOW), 12000);
});

test("bpsFor: founding rate at exact expiry is ignored", () => {
  const until = "2026-06-01T00:00:00.000Z";
  const user = { foundingFee: { bps: 5000, until } };
  assert.equal(mod.bpsFor(user, 18000, Date.parse(until)), 18000);
  assert.equal(mod.bpsFor(user, 18000, Date.parse(until) - 1), 5000);
});

test("bpsFor: invalid founding records are ignored", () => {
  assert.equal(mod.bpsFor({ foundingFee: { bps: "5000", until: FUTURE } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: -100, until: FUTURE } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: NaN, until: FUTURE } }, 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ foundingFee: { bps: 5000, until: "garbage" } }, 18000, NOW), 18000);
});

test("bpsFor: founding rate with custom defaultBps", () => {
  const user = { foundingFee: { bps: 5000, until: FUTURE } };
  assert.equal(mod.bpsFor(user, 20000, NOW), 5000);
  assert.equal(mod.bpsFor({}, 20000, NOW), 20000);
});
