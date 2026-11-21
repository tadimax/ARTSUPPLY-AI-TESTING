const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const { foundingActive, bpsFor } = mod;
const NOW = Date.parse("2030-01-01T00:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();
const ff = (bps, untilMs) => ({ foundingFee: { bps, until: iso(untilMs) } });

// ---------- foundingActive: expiry boundary ----------
test("foundingActive: until 1ms in the future is active", () => {
  assert.equal(foundingActive(ff(5000, NOW + 1), NOW), true);
});
test("foundingActive: until exactly equal to now is NOT active (strict)", () => {
  assert.equal(foundingActive(ff(5000, NOW), NOW), false);
});
test("foundingActive: until 1ms in the past is NOT active", () => {
  assert.equal(foundingActive(ff(5000, NOW - 1), NOW), false);
});
test("foundingActive: far future is active", () => {
  assert.equal(foundingActive(ff(5000, NOW + 365 * 86400000), NOW), true);
});
test("foundingActive: far past is not active", () => {
  assert.equal(foundingActive(ff(5000, NOW - 365 * 86400000), NOW), false);
});
test("foundingActive: returns a boolean", () => {
  assert.equal(typeof foundingActive(ff(5000, NOW + 1000), NOW), "boolean");
  assert.equal(typeof foundingActive(null, NOW), "boolean");
});

// ---------- foundingActive: bps validity ----------
test("foundingActive: zero bps is valid", () => {
  assert.equal(foundingActive(ff(0, NOW + 1000), NOW), true);
});
test("foundingActive: bps 1 is valid", () => {
  assert.equal(foundingActive(ff(1, NOW + 1000), NOW), true);
});
test("foundingActive: negative bps is invalid", () => {
  assert.equal(foundingActive(ff(-1, NOW + 1000), NOW), false);
});
test("foundingActive: NaN bps is invalid", () => {
  assert.equal(foundingActive(ff(NaN, NOW + 1000), NOW), false);
});
test("foundingActive: Infinity bps is invalid", () => {
  assert.equal(foundingActive(ff(Infinity, NOW + 1000), NOW), false);
});
test("foundingActive: non-numeric string bps is invalid", () => {
  assert.equal(foundingActive(ff("abc", NOW + 1000), NOW), false);
});
test("foundingActive: missing bps is invalid", () => {
  assert.equal(foundingActive({ foundingFee: { until: iso(NOW + 1000) } }, NOW), false);
});
test("foundingActive: null bps is invalid", () => {
  assert.equal(foundingActive(ff(null, NOW + 1000), NOW), false);
});

// ---------- foundingActive: missing / unparseable ----------
test("foundingActive: null user is not active", () => {
  assert.equal(foundingActive(null, NOW), false);
});
test("foundingActive: undefined user is not active", () => {
  assert.equal(foundingActive(undefined, NOW), false);
});
test("foundingActive: user without foundingFee is not active", () => {
  assert.equal(foundingActive({}, NOW), false);
  assert.equal(foundingActive({ sellerTier: "pro" }, NOW), false);
});
test("foundingActive: null foundingFee is not active", () => {
  assert.equal(foundingActive({ foundingFee: null }, NOW), false);
});
test("foundingActive: unparseable until is not active", () => {
  assert.equal(foundingActive({ foundingFee: { bps: 5000, until: "not a date" } }, NOW), false);
});
test("foundingActive: missing until is not active", () => {
  assert.equal(foundingActive({ foundingFee: { bps: 5000 } }, NOW), false);
});

// ---------- foundingActive: default nowMs ----------
test("foundingActive: default nowMs uses current time (far future active)", () => {
  assert.equal(foundingActive({ foundingFee: { bps: 5000, until: "2999-01-01T00:00:00.000Z" } }), true);
});
test("foundingActive: default nowMs uses current time (past inactive)", () => {
  assert.equal(foundingActive({ foundingFee: { bps: 5000, until: "2000-01-01T00:00:00.000Z" } }), false);
});

// ---------- bpsFor: tier rates ----------
test("bpsFor: no tier gives default 18000", () => {
  assert.equal(bpsFor({}, undefined, NOW), 18000);
});
test("bpsFor: null user gives 18000", () => {
  assert.equal(bpsFor(null, undefined, NOW), 18000);
});
test("bpsFor: undefined user gives 18000", () => {
  assert.equal(bpsFor(undefined, undefined, NOW), 18000);
});
test("bpsFor: pro tier gives 12000", () => {
  assert.equal(bpsFor({ sellerTier: "pro" }, undefined, NOW), 12000);
});
test("bpsFor: power tier gives 10000", () => {
  assert.equal(bpsFor({ sellerTier: "power" }, undefined, NOW), 10000);
});
test("bpsFor: custom defaultBps used when no tier", () => {
  assert.equal(bpsFor({}, 15000, NOW), 15000);
  assert.equal(bpsFor(null, 15000, NOW), 15000);
});
test("bpsFor: default nowMs works with no founding fee", () => {
  assert.equal(bpsFor({ sellerTier: "pro" }), 12000);
  assert.equal(bpsFor({}), 18000);
});

// ---------- bpsFor: founding vs tier, lower wins ----------
test("bpsFor: founding below default tier wins", () => {
  assert.equal(bpsFor(ff(5000, NOW + 1000), undefined, NOW), 5000);
});
test("bpsFor: founding below pro wins", () => {
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(5000, NOW + 1000) }, undefined, NOW), 5000);
});
test("bpsFor: founding below power wins", () => {
  assert.equal(bpsFor({ sellerTier: "power", ...ff(5000, NOW + 1000) }, undefined, NOW), 5000);
});
test("bpsFor: founding above pro does not raise rate (stays 12000)", () => {
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(15000, NOW + 1000) }, undefined, NOW), 12000);
});
test("bpsFor: founding above power does not raise rate (stays 10000)", () => {
  assert.equal(bpsFor({ sellerTier: "power", ...ff(11000, NOW + 1000) }, undefined, NOW), 10000);
});
test("bpsFor: founding above default tier does not raise rate (stays 18000)", () => {
  assert.equal(bpsFor(ff(20000, NOW + 1000), undefined, NOW), 18000);
});
test("bpsFor: founding just below default (17999) wins", () => {
  assert.equal(bpsFor(ff(17999, NOW + 1000), undefined, NOW), 17999);
});
test("bpsFor: founding equal to default (18000) gives 18000", () => {
  assert.equal(bpsFor(ff(18000, NOW + 1000), undefined, NOW), 18000);
});
test("bpsFor: founding just above default (18001) gives 18000", () => {
  assert.equal(bpsFor(ff(18001, NOW + 1000), undefined, NOW), 18000);
});
test("bpsFor: founding just below pro (11999) wins", () => {
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(11999, NOW + 1000) }, undefined, NOW), 11999);
});
test("bpsFor: founding equal to pro (12000) gives 12000", () => {
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(12000, NOW + 1000) }, undefined, NOW), 12000);
});
test("bpsFor: founding just above pro (12001) gives 12000", () => {
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(12001, NOW + 1000) }, undefined, NOW), 12000);
});
test("bpsFor: founding just below power (9999) wins", () => {
  assert.equal(bpsFor({ sellerTier: "power", ...ff(9999, NOW + 1000) }, undefined, NOW), 9999);
});
test("bpsFor: founding equal to power (10000) gives 10000", () => {
  assert.equal(bpsFor({ sellerTier: "power", ...ff(10000, NOW + 1000) }, undefined, NOW), 10000);
});
test("bpsFor: founding just above power (10001) gives 10000", () => {
  assert.equal(bpsFor({ sellerTier: "power", ...ff(10001, NOW + 1000) }, undefined, NOW), 10000);
});
test("bpsFor: zero founding rate gives 0 for every tier", () => {
  assert.equal(bpsFor(ff(0, NOW + 1000), undefined, NOW), 0);
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(0, NOW + 1000) }, undefined, NOW), 0);
  assert.equal(bpsFor({ sellerTier: "power", ...ff(0, NOW + 1000) }, undefined, NOW), 0);
});
test("bpsFor: founding lower than custom defaultBps wins", () => {
  assert.equal(bpsFor(ff(5000, NOW + 1000), 15000, NOW), 5000);
});
test("bpsFor: founding higher than custom defaultBps does not raise", () => {
  assert.equal(bpsFor(ff(16000, NOW + 1000), 15000, NOW), 15000);
});

// ---------- bpsFor: inactive founding is not applied ----------
test("bpsFor: founding expiring exactly now is NOT applied", () => {
  assert.equal(bpsFor(ff(5000, NOW), undefined, NOW), 18000);
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(5000, NOW) }, undefined, NOW), 12000);
  assert.equal(bpsFor({ sellerTier: "power", ...ff(5000, NOW) }, undefined, NOW), 10000);
});
test("bpsFor: founding 1ms before expiry IS applied", () => {
  assert.equal(bpsFor(ff(5000, NOW + 1), undefined, NOW), 5000);
});
test("bpsFor: expired founding is NOT applied", () => {
  assert.equal(bpsFor(ff(5000, NOW - 1), undefined, NOW), 18000);
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(5000, NOW - 1000) }, undefined, NOW), 12000);
});
test("bpsFor: negative founding bps is NOT applied", () => {
  assert.equal(bpsFor(ff(-1, NOW + 1000), undefined, NOW), 18000);
  assert.equal(bpsFor({ sellerTier: "pro", ...ff(-500, NOW + 1000) }, undefined, NOW), 12000);
});
test("bpsFor: NaN / Infinity / non-numeric founding bps NOT applied", () => {
  assert.equal(bpsFor(ff(NaN, NOW + 1000), undefined, NOW), 18000);
  assert.equal(bpsFor(ff(Infinity, NOW + 1000), undefined, NOW), 18000);
  assert.equal(bpsFor(ff("abc", NOW + 1000), undefined, NOW), 18000);
});
test("bpsFor: unparseable until NOT applied", () => {
  assert.equal(bpsFor({ foundingFee: { bps: 5000, until: "garbage" } }, undefined, NOW), 18000);
});
test("bpsFor: null foundingFee leaves tier rate unchanged", () => {
  assert.equal(bpsFor({ sellerTier: "power", foundingFee: null }, undefined, NOW), 10000);
});
test("bpsFor: default nowMs applies far-future founding and ignores past", () => {
  assert.equal(bpsFor({ foundingFee: { bps: 5000, until: "2999-01-01T00:00:00.000Z" } }), 5000);
  assert.equal(bpsFor({ foundingFee: { bps: 5000, until: "2000-01-01T00:00:00.000Z" } }), 18000);
});
