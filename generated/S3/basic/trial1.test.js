const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeTicketFees } = mod;

test("free tier on $100 ticket", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "free" });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
  assert.equal(r.processingFeeCents, 290 + 58);
  assert.equal(r.payoutCents, 10000 - 500 - 348);
});

test("growth tier on $100 ticket", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "growth" });
  assert.equal(r.marginBps, 350);
  assert.equal(r.platformFeeCents, 350);
  assert.equal(r.processingFeeCents, 348);
  assert.equal(r.payoutCents, 10000 - 350 - 348);
});

test("scale tier on $100 ticket", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "scale" });
  assert.equal(r.marginBps, 200);
  assert.equal(r.platformFeeCents, 200);
  assert.equal(r.processingFeeCents, 348);
  assert.equal(r.payoutCents, 10000 - 200 - 348);
});

test("unknown tier treated as free", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "platinum" });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
});

test("default tier is free", () => {
  const r = computeTicketFees({ grossCents: 10000 });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
});

test("rounding to nearest cent", () => {
  // 1234 * 0.05 = 61.7 -> 62 ; 1234 * 0.029 = 35.786 -> 36, +58 = 94
  const r = computeTicketFees({ grossCents: 1234, tier: "free" });
  assert.equal(r.platformFeeCents, 62);
  assert.equal(r.processingFeeCents, 94);
  assert.equal(r.payoutCents, 1234 - 62 - 94);
});

test("growth rounding", () => {
  // 1234 * 0.035 = 43.19 -> 43
  const r = computeTicketFees({ grossCents: 1234, tier: "growth" });
  assert.equal(r.platformFeeCents, 43);
});

test("scale rounding", () => {
  // 1234 * 0.02 = 24.68 -> 25
  const r = computeTicketFees({ grossCents: 1234, tier: "scale" });
  assert.equal(r.platformFeeCents, 25);
});

test("payout never below zero", () => {
  const r = computeTicketFees({ grossCents: 100, tier: "free" });
  // platform 5, processing 3 + 58 = 61
  assert.equal(r.platformFeeCents, 5);
  assert.equal(r.processingFeeCents, 61);
  assert.equal(r.payoutCents, 100 - 5 - 61);
  const small = computeTicketFees({ grossCents: 50, tier: "free" });
  assert.equal(small.payoutCents, 0);
});

test("zero gross", () => {
  const r = computeTicketFees({ grossCents: 0, tier: "free" });
  assert.equal(r.platformFeeCents, 0);
  assert.equal(r.processingFeeCents, 58);
  assert.equal(r.payoutCents, 0);
});

test("missing, undefined and non-numeric gross count as 0", () => {
  for (const arg of [undefined, {}, { grossCents: "abc" }, { grossCents: null }, { grossCents: undefined }]) {
    const r = computeTicketFees(arg);
    assert.equal(r.platformFeeCents, 0);
    assert.equal(r.processingFeeCents, 58);
    assert.equal(r.payoutCents, 0);
    assert.equal(r.marginBps, 500);
  }
});

test("no-arg call works", () => {
  const r = computeTicketFees();
  assert.equal(r.payoutCents, 0);
  assert.equal(r.marginBps, 500);
});

test("result has exactly the documented keys with integer values", () => {
  const r = computeTicketFees({ grossCents: 4321, tier: "growth" });
  assert.deepEqual(Object.keys(r).sort(), ["marginBps", "payoutCents", "platformFeeCents", "processingFeeCents"]);
  for (const v of Object.values(r)) assert.ok(Number.isInteger(v));
});

test("processing fee identical across tiers", () => {
  const a = computeTicketFees({ grossCents: 7777, tier: "free" });
  const b = computeTicketFees({ grossCents: 7777, tier: "growth" });
  const c = computeTicketFees({ grossCents: 7777, tier: "scale" });
  assert.equal(a.processingFeeCents, b.processingFeeCents);
  assert.equal(b.processingFeeCents, c.processingFeeCents);
});

test("payout identity holds for many amounts", () => {
  for (const tier of ["free", "growth", "scale"]) {
    for (let g = 0; g <= 20000; g += 137) {
      const r = computeTicketFees({ grossCents: g, tier });
      assert.equal(r.payoutCents, Math.max(0, g - r.platformFeeCents - r.processingFeeCents));
      assert.ok(r.payoutCents >= 0);
    }
  }
});

test("exported constants", () => {
  assert.equal(mod.TICKET_PROCESSING_FLAT_CENTS, 58);
  assert.equal(mod.TICKET_PROCESSING_PCT_BPS, 290);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.free, 500);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.growth, 350);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.scale, 200);
});
