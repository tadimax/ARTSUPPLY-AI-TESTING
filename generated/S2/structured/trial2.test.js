const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const NOW_ISO = "2030-01-01T00:00:00.000Z";
const NOW = Date.parse(NOW_ISO);
const FUTURE = "2030-01-01T00:00:00.001Z";
const PAST = "2029-12-31T23:59:59.999Z";

function ff(bps, until) {
  return { foundingFee: { bps, until } };
}

// ---- foundingActive: expiry boundary ----
test("foundingActive: until 1ms in the future is active", () => {
  assert.equal(mod.foundingActive(ff(5000, FUTURE), NOW), true);
});

test("foundingActive: until exactly equal to now is NOT active (strict)", () => {
  assert.equal(mod.foundingActive(ff(5000, NOW_ISO), NOW), false);
});

test("foundingActive: until 1ms in the past is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, PAST), NOW), false);
});

test("foundingActive: far future is active", () => {
  assert.equal(mod.foundingActive(ff(5000, "2099-01-01T00:00:00Z"), NOW), true);
});

test("foundingActive: far past is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, "2000-01-01T00:00:00Z"), NOW), false);
});

test("foundingActive: nowMs is honoured (same record, different now)", () => {
  const u = ff(5000, "2030-06-01T00:00:00Z");
  assert.equal(mod.foundingActive(u, Date.parse("2030-05-31T23:59:59.999Z")), true);
  assert.equal(mod.foundingActive(u, Date.parse("2030-06-01T00:00:00Z")), false);
  assert.equal(mod.foundingActive(u, Date.parse("2030-06-01T00:00:00.001Z")), false);
});

test("foundingActive: default nowMs uses current time", () => {
  assert.equal(mod.foundingActive(ff(5000, "2099-01-01T00:00:00Z")), true);
  assert.equal(mod.foundingActive(ff(5000, "2000-01-01T00:00:00Z")), false);
});

// ---- foundingActive: validity of bps ----
test("foundingActive: zero bps is valid and active", () => {
  assert.equal(mod.foundingActive(ff(0, FUTURE), NOW), true);
});

test("foundingActive: small positive bps is active", () => {
  assert.equal(mod.foundingActive(ff(1, FUTURE), NOW), true);
});

test("foundingActive: negative bps is not valid", () => {
  assert.equal(mod.foundingActive(ff(-1, FUTURE), NOW), false);
});

test("foundingActive: NaN bps is not valid", () => {
  assert.equal(mod.foundingActive(ff(NaN, FUTURE), NOW), false);
});

test("foundingActive: Infinity bps is not valid (not finite)", () => {
  assert.equal(mod.foundingActive(ff(Infinity, FUTURE), NOW), false);
});

test("foundingActive: -Infinity bps is not valid", () => {
  assert.equal(mod.foundingActive(ff(-Infinity, FUTURE), NOW), false);
});

test("foundingActive: string bps is non-numeric, not active", () => {
  assert.equal(mod.foundingActive(ff("5000", FUTURE), NOW), false);
  assert.equal(mod.foundingActive(ff("abc", FUTURE), NOW), false);
});

test("foundingActive: undefined bps is not active", () => {
  assert.equal(mod.foundingActive(ff(undefined, FUTURE), NOW), false);
});

test("foundingActive: null bps is not active", () => {
  assert.equal(mod.foundingActive(ff(null, FUTURE), NOW), false);
});

// ---- foundingActive: until validity ----
test("foundingActive: unparseable until is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, "not a date"), NOW), false);
});

test("foundingActive: missing until is not active", () => {
  assert.equal(mod.foundingActive(ff(5000, undefined), NOW), false);
  assert.equal(mod.foundingActive({ foundingFee: { bps: 5000 } }, NOW), false);
});

// ---- foundingActive: missing records ----
test("foundingActive: null user is not active", () => {
  assert.equal(mod.foundingActive(null, NOW), false);
});

test("foundingActive: undefined user is not active", () => {
  assert.equal(mod.foundingActive(undefined, NOW), false);
});

test("foundingActive: user without foundingFee is not active", () => {
  assert.equal(mod.foundingActive({}, NOW), false);
  assert.equal(mod.foundingActive({ sellerTier: "pro" }, NOW), false);
});

test("foundingActive: returns a boolean", () => {
  assert.equal(typeof mod.foundingActive(ff(5000, FUTURE), NOW), "boolean");
  assert.equal(typeof mod.foundingActive(null, NOW), "boolean");
});

// ---- bpsFor: tier rates without founding ----
test("bpsFor: no user returns default 18000", () => {
  assert.equal(mod.bpsFor(null, undefined, NOW), 18000);
  assert.equal(mod.bpsFor(undefined, undefined, NOW), 18000);
});

test("bpsFor: user with no tier returns default 18000", () => {
  assert.equal(mod.bpsFor({}, undefined, NOW), 18000);
});

test("bpsFor: pro tier is 12000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro" }, undefined, NOW), 12000);
});

test("bpsFor: power tier is 10000", () => {
  assert.equal(mod.bpsFor({ sellerTier: "power" }, undefined, NOW), 10000);
});

test("bpsFor: defaultBps parameter is used for the default tier", () => {
  assert.equal(mod.bpsFor({}, 15000, NOW), 15000);
  assert.equal(mod.bpsFor(null, 15000, NOW), 15000);
});

test("bpsFor: defaultBps defaults to 18000 when omitted", () => {
  assert.equal(mod.bpsFor({}), 18000);
  assert.equal(mod.bpsFor(null), 18000);
});

// ---- bpsFor: founding lowers the rate ----
test("bpsFor: active founding rate below default tier wins (18000 vs 5000)", () => {
  assert.equal(mod.bpsFor(ff(5000, FUTURE), undefined, NOW), 5000);
});

test("bpsFor: active founding rate below pro wins (12000 vs 5000)", () => {
  const u = { sellerTier: "pro", foundingFee: { bps: 5000, until: FUTURE } };
  assert.equal(mod.bpsFor(u, undefined, NOW), 5000);
});

test("bpsFor: active founding rate below power wins (10000 vs 5000)", () => {
  const u = { sellerTier: "power", foundingFee: { bps: 5000, until: FUTURE } };
  assert.equal(mod.bpsFor(u, undefined, NOW), 5000);
});

test("bpsFor: zero founding rate gives 0 for every tier", () => {
  assert.equal(mod.bpsFor(ff(0, FUTURE), undefined, NOW), 0);
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 0, until: FUTURE } }, undefined, NOW), 0);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: 0, until: FUTURE } }, undefined, NOW), 0);
});

// ---- bpsFor: founding never raises the rate ----
test("bpsFor: founding rate above default tier does not raise (20000 vs 18000)", () => {
  assert.equal(mod.bpsFor(ff(20000, FUTURE), undefined, NOW), 18000);
});

test("bpsFor: founding rate above pro does not raise (15000 vs 12000)", () => {
  const u = { sellerTier: "pro", foundingFee: { bps: 15000, until: FUTURE } };
  assert.equal(mod.bpsFor(u, undefined, NOW), 12000);
});

test("bpsFor: founding rate above power does not raise (11000 vs 10000)", () => {
  const u = { sellerTier: "power", foundingFee: { bps: 11000, until: FUTURE } };
  assert.equal(mod.bpsFor(u, undefined, NOW), 10000);
});

test("bpsFor: founding rate equal to tier rate gives the same rate", () => {
  assert.equal(mod.bpsFor(ff(18000, FUTURE), undefined, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 12000, until: FUTURE } }, undefined, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: 10000, until: FUTURE } }, undefined, NOW), 10000);
});

test("bpsFor: founding just below and just above the tier rate", () => {
  const pro = (b) => ({ sellerTier: "pro", foundingFee: { bps: b, until: FUTURE } });
  assert.equal(mod.bpsFor(pro(11999), undefined, NOW), 11999);
  assert.equal(mod.bpsFor(pro(12000), undefined, NOW), 12000);
  assert.equal(mod.bpsFor(pro(12001), undefined, NOW), 12000);
  const power = (b) => ({ sellerTier: "power", foundingFee: { bps: b, until: FUTURE } });
  assert.equal(mod.bpsFor(power(9999), undefined, NOW), 9999);
  assert.equal(mod.bpsFor(power(10000), undefined, NOW), 10000);
  assert.equal(mod.bpsFor(power(10001), undefined, NOW), 10000);
  assert.equal(mod.bpsFor(ff(17999, FUTURE), undefined, NOW), 17999);
  assert.equal(mod.bpsFor(ff(18001, FUTURE), undefined, NOW), 18000);
});

test("bpsFor: founding compared against custom defaultBps", () => {
  assert.equal(mod.bpsFor(ff(5000, FUTURE), 15000, NOW), 5000);
  assert.equal(mod.bpsFor(ff(16000, FUTURE), 15000, NOW), 15000);
});

// ---- bpsFor: inactive founding is NOT applied ----
test("bpsFor: expired founding rate is not applied (default tier)", () => {
  assert.equal(mod.bpsFor(ff(5000, PAST), undefined, NOW), 18000);
});

test("bpsFor: founding at exact expiry instant is not applied", () => {
  assert.equal(mod.bpsFor(ff(5000, NOW_ISO), undefined, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 5000, until: NOW_ISO } }, undefined, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: 5000, until: NOW_ISO } }, undefined, NOW), 10000);
});

test("bpsFor: expired founding does not change pro or power tier rate", () => {
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: 5000, until: PAST } }, undefined, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: 5000, until: PAST } }, undefined, NOW), 10000);
});

test("bpsFor: invalid founding records are ignored", () => {
  assert.equal(mod.bpsFor(ff(-1, FUTURE), undefined, NOW), 18000);
  assert.equal(mod.bpsFor(ff(NaN, FUTURE), undefined, NOW), 18000);
  assert.equal(mod.bpsFor(ff(Infinity, FUTURE), undefined, NOW), 18000);
  assert.equal(mod.bpsFor(ff("5000", FUTURE), undefined, NOW), 18000);
  assert.equal(mod.bpsFor(ff(null, FUTURE), undefined, NOW), 18000);
  assert.equal(mod.bpsFor(ff(5000, "garbage"), undefined, NOW), 18000);
  assert.equal(mod.bpsFor(ff(5000, undefined), undefined, NOW), 18000);
  assert.equal(mod.bpsFor({ sellerTier: "pro", foundingFee: { bps: -5, until: FUTURE } }, undefined, NOW), 12000);
  assert.equal(mod.bpsFor({ sellerTier: "power", foundingFee: { bps: "x", until: FUTURE } }, undefined, NOW), 10000);
});

test("bpsFor: default nowMs uses current time", () => {
  assert.equal(mod.bpsFor(ff(5000, "2099-01-01T00:00:00Z")), 5000);
  assert.equal(mod.bpsFor(ff(5000, "2000-01-01T00:00:00Z")), 18000);
});
