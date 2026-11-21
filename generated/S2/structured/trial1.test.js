const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const NOW = Date.parse("2026-06-01T12:00:00.000Z");
const FUTURE = "2026-06-01T12:00:00.001Z"; // 1 ms after NOW
const EXACT = "2026-06-01T12:00:00.000Z"; // exactly NOW
const PAST = "2026-06-01T11:59:59.999Z"; // 1 ms before NOW

const ff = (bps, until = FUTURE) => ({ foundingFee: { bps, until } });

// ---- foundingActive: expiry boundary ----
test("foundingActive: until 1 ms in the future is active", () => {
  assert.equal(mod.foundingActive(ff(5000, FUTURE), NOW), true);
});

test("foundingActive: until exactly equal to now is NOT active (strictly future)", () => {
  assert.equal(mod.foundingActive(ff(5000, EXACT), NOW), false);
});

test("foundingActive: until 1 ms in the past is NOT active", () => {
  assert.equal(mod.foundingActive(ff(5000, PAST), NOW), false);
});

test("foundingActive: far future date is active", () => {
  assert.equal(mod.foundingActive(ff(5000, "2099-01-01T00:00:00Z"), NOW), true);
});

test("foundingActive: far past date is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, "2000-01-01T00:00:00Z"), NOW), false);
});

test("foundingActive: returns a strict boolean", () => {
  assert.equal(typeof mod.foundingActive(ff(5000), NOW), "boolean");
  assert.equal(typeof mod.foundingActive(null, NOW), "boolean");
});

// ---- foundingActive: bps validity ----
test("foundingActive: zero bps is valid and active", () => {
  assert.equal(mod.foundingActive(ff(0), NOW), true);
});

test("foundingActive: bps 1 is valid", () => {
  assert.equal(mod.foundingActive(ff(1), NOW), true);
});

test("foundingActive: negative bps (-1) is invalid", () => {
  assert.equal(mod.foundingActive(ff(-1), NOW), false);
});

test("foundingActive: large negative bps is invalid", () => {
  assert.equal(mod.foundingActive(ff(-5000), NOW), false);
});

test("foundingActive: NaN bps is invalid", () => {
  assert.equal(mod.foundingActive(ff(NaN), NOW), false);
});

test("foundingActive: Infinity bps is invalid (not finite)", () => {
  assert.equal(mod.foundingActive(ff(Infinity), NOW), false);
});

test("foundingActive: -Infinity bps is invalid", () => {
  assert.equal(mod.foundingActive(ff(-Infinity), NOW), false);
});

test("foundingActive: non-numeric string bps is invalid", () => {
  assert.equal(mod.foundingActive(ff("abc"), NOW), false);
});

test("foundingActive: null bps is invalid", () => {
  assert.equal(mod.foundingActive(ff(null), NOW), false);
});

test("foundingActive: undefined bps is invalid", () => {
  assert.equal(mod.foundingActive(ff(undefined), NOW), false);
});

// ---- foundingActive: missing records ----
test("foundingActive: null user is not active", () => {
  assert.equal(mod.foundingActive(null, NOW), false);
});

test("foundingActive: undefined user is not active", () => {
  assert.equal(mod.foundingActive(undefined, NOW), false);
});

test("foundingActive: empty user object (missing foundingFee) is not active", () => {
  assert.equal(mod.foundingActive({}, NOW), false);
});

test("foundingActive: foundingFee null is not active", () => {
  assert.equal(mod.foundingActive({ foundingFee: null }, NOW), false);
});

test("foundingActive: user with only sellerTier is not active", () => {
  assert.equal(mod.foundingActive({ sellerTier: "pro" }, NOW), false);
});

// ---- foundingActive: unparseable until ----
test("foundingActive: unparseable until string is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, "not a date"), NOW), false);
});

test("foundingActive: empty until string is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, ""), NOW), false);
});

// ---- foundingActive: nowMs param ----
test("foundingActive: uses supplied nowMs (same record, earlier now is active)", () => {
  const u = ff(5000, "2026-06-01T12:00:00.000Z");
  assert.equal(mod.foundingActive(u, NOW - 1), true);
  assert.equal(mod.foundingActive(u, NOW), false);
  assert.equal(mod.foundingActive(u, NOW + 1), false);
});

test("foundingActive: default nowMs uses current time", () => {
  const futureIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const pastIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  assert.equal(mod.foundingActive(ff(5000, futureIso)), true);
  assert.equal(mod.foundingActive(ff(5000, pastIso)), false);
});

// ---- bpsFor: tier rates ----
test("bpsFor: no tier defaults to 18000", () => {
  assert.equal(mod.bpsFor({}, undefined, NOW), 18000);
});

test("bpsFor: pro tier is 12000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro" }, undefined, NOW), 12000);
});

test("bpsFor: power tier is 10000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power" }, undefined, NOW), 10000);
});

test("bpsFor: null user gives default 18000", () => {
  assert.equal(mod.bpsFor(null, undefined, NOW), 18000);
});

test("bpsFor: undefined user gives default 18000", () => {
  assert.equal(mod.bpsFor(undefined, undefined, NOW), 18000);
});

test("bpsFor: all params omitted for null user gives 18000", () => {
  assert.equal(mod.bpsFor(null), 18000);
});

test("bpsFor: custom defaultBps is used when no tier applies", () => {
  assert.equal(mod.bpsFor({}, 15000, NOW), 15000);
});

test("bpsFor: pro tier is 12000 regardless of defaultBps", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro" }, 15000, NOW), 12000);
});

test("bpsFor: power tier is 10000 regardless of defaultBps", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power" }, 15000, NOW), 10000);
});

// ---- bpsFor: founding lower than tier ----
test("bpsFor: active founding 5000 beats default tier 18000", () => {
  assert.equal(mod.bpsFor(ff(5000), 18000, NOW), 5000);
});

test("bpsFor: active founding 5000 beats pro tier 12000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(5000) }, 18000, NOW), 5000);
});

test("bpsFor: active founding 5000 beats power tier 10000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(5000) }, 18000, NOW), 5000);
});

test("bpsFor: active zero founding rate gives 0 for default tier", () => {
  assert.equal(mod.bpsFor(ff(0), 18000, NOW), 0);
});

test("bpsFor: active zero founding rate gives 0 for pro tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(0) }, 18000, NOW), 0);
});

test("bpsFor: active zero founding rate gives 0 for power tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(0) }, 18000, NOW), 0);
});

// ---- bpsFor: founding higher than tier never raises ----
test("bpsFor: founding 15000 above pro tier 12000 stays 12000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(15000) }, 18000, NOW), 12000);
});

test("bpsFor: founding 20000 above power tier 10000 stays 10000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(20000) }, 18000, NOW), 10000);
});

test("bpsFor: founding 20000 above default tier 18000 stays 18000", () => {
  assert.equal(mod.bpsFor(ff(20000), 18000, NOW), 18000);
});

// ---- bpsFor: equal to tier boundary, just below / above ----
test("bpsFor: founding 11999 just below pro 12000 gives 11999", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(11999) }, 18000, NOW), 11999);
});

test("bpsFor: founding 12000 equal to pro 12000 gives 12000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(12000) }, 18000, NOW), 12000);
});

test("bpsFor: founding 12001 just above pro 12000 gives 12000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(12001) }, 18000, NOW), 12000);
});

test("bpsFor: founding 9999 just below power 10000 gives 9999", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(9999) }, 18000, NOW), 9999);
});

test("bpsFor: founding 10000 equal to power 10000 gives 10000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(10000) }, 18000, NOW), 10000);
});

test("bpsFor: founding 10001 just above power 10000 gives 10000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(10001) }, 18000, NOW), 10000);
});

test("bpsFor: founding 17999 just below default 18000 gives 17999", () => {
  assert.equal(mod.bpsFor(ff(17999), 18000, NOW), 17999);
});

test("bpsFor: founding 18000 equal to default 18000 gives 18000", () => {
  assert.equal(mod.bpsFor(ff(18000), 18000, NOW), 18000);
});

test("bpsFor: founding 18001 just above default 18000 gives 18000", () => {
  assert.equal(mod.bpsFor(ff(18001), 18000, NOW), 18000);
});

test("bpsFor: founding 14999 below custom defaultBps 15000 gives 14999", () => {
  assert.equal(mod.bpsFor(ff(14999), 15000, NOW), 14999);
});

test("bpsFor: founding 15001 above custom defaultBps 15000 gives 15000", () => {
  assert.equal(mod.bpsFor(ff(15001), 15000, NOW), 15000);
});

// ---- bpsFor: inactive/invalid founding is ignored ----
test("bpsFor: expired founding (past) is ignored for default tier", () => {
  assert.equal(mod.bpsFor(ff(5000, PAST), 18000, NOW), 18000);
});

test("bpsFor: founding expiring exactly now is ignored for default tier", () => {
  assert.equal(mod.bpsFor(ff(5000, EXACT), 18000, NOW), 18000);
});

test("bpsFor: founding expiring exactly now is ignored for pro tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(5000, EXACT) }, 18000, NOW), 12000);
});

test("bpsFor: founding expiring exactly now is ignored for power tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(5000, EXACT) }, 18000, NOW), 10000);
});

test("bpsFor: founding 1 ms before expiry still applies", () => {
  assert.equal(mod.bpsFor(ff(5000, FUTURE), 18000, NOW), 5000);
});

test("bpsFor: expired founding ignored for pro tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(5000, PAST) }, 18000, NOW), 12000);
});

test("bpsFor: expired founding ignored for power tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(0, PAST) }, 18000, NOW), 10000);
});

test("bpsFor: negative founding bps is ignored for default tier", () => {
  assert.equal(mod.bpsFor(ff(-1), 18000, NOW), 18000);
});

test("bpsFor: negative founding bps is ignored for pro tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(-1) }, 18000, NOW), 12000);
});

test("bpsFor: negative founding bps is ignored for power tier", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(-5000) }, 18000, NOW), 10000);
});

test("bpsFor: non-numeric founding bps is ignored", () => {
  assert.equal(mod.bpsFor(ff("abc"), 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff("abc") }, 18000, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff("abc") }, 18000, NOW), 10000);
});

test("bpsFor: NaN founding bps is ignored", () => {
  assert.equal(mod.bpsFor(ff(NaN), 18000, NOW), 18000);
});

test("bpsFor: Infinity founding bps is ignored", () => {
  assert.equal(mod.bpsFor(ff(Infinity), 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "power", ...ff(Infinity) }, 18000, NOW), 10000);
});

test("bpsFor: unparseable until means founding ignored", () => {
  assert.equal(mod.bpsFor(ff(5000, "garbage"), 18000, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro", ...ff(5000, "garbage") }, 18000, NOW), 12000);
});

test("bpsFor: missing foundingFee leaves tier rate unchanged", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro" }, 18000, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: null }, 18000, NOW), 10000);
});

// ---- bpsFor: nowMs param ----
test("bpsFor: nowMs controls whether founding applies", () => {
  const u = ff(5000, "2026-06-01T12:00:00.000Z");
  assert.equal(mod.bpsFor(u, 18000, NOW - 1), 5000);
  assert.equal(mod.bpsFor(u, 18000, NOW), 18000);
  assert.equal(mod.bpsFor(u, 18000, NOW + 1), 18000);
});

test("bpsFor: default nowMs uses current time", () => {
  const futureIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const pastIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  assert.equal(mod.bpsFor(ff(5000, futureIso)), 5000);
  assert.equal(mod.bpsFor(ff(5000, pastIso)), 18000);
});

test("bpsFor: does not mutate the user record", () => {
  const u = { sellerTier: "pro", foundingFee: { bps: 5000, until: FUTURE } };
  mod.bpsFor(u, 18000, NOW);
  assert.deepEqual(u, { sellerTier: "pro", foundingFee: { bps: 5000, until: FUTURE } });
});
