const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeTicketFees } = mod;

test("free tier 10000 cents", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "free" });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
  assert.equal(r.processingFeeCents, 348);
  assert.equal(r.payoutCents, 9152);
});

test("growth tier 10000 cents", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "growth" });
  assert.equal(r.marginBps, 350);
  assert.equal(r.platformFeeCents, 350);
  assert.equal(r.processingFeeCents, 348);
  assert.equal(r.payoutCents, 9302);
});

test("scale tier 10000 cents", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "scale" });
  assert.equal(r.marginBps, 200);
  assert.equal(r.platformFeeCents, 200);
  assert.equal(r.processingFeeCents, 348);
  assert.equal(r.payoutCents, 9452);
});

test("unknown tier treated as free", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "platinum" });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
  assert.equal(r.payoutCents, 9152);
});

test("default tier is free", () => {
  const r = computeTicketFees({ grossCents: 10000 });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
});

test("rounding to nearest cent", () => {
  // 1234: platform 5% = 61.7 -> 62; processing 2.9% = 35.786 -> 36 + 58 = 94
  const r = computeTicketFees({ grossCents: 1234, tier: "free" });
  assert.equal(r.platformFeeCents, 62);
  assert.equal(r.processingFeeCents, 94);
  assert.equal(r.payoutCents, 1234 - 62 - 94);
});

test("growth rounding", () => {
  // 1000 * 3.5% = 35; 2.9% = 29 + 58 = 87
  const r = computeTicketFees({ grossCents: 1000, tier: "growth" });
  assert.equal(r.platformFeeCents, 35);
  assert.equal(r.processingFeeCents, 87);
  assert.equal(r.payoutCents, 878);
});

test("payout never below zero", () => {
  const r = computeTicketFees({ grossCents: 100, tier: "free" });
  // platform 5, processing 3 + 58 = 61 -> 34
  assert.equal(r.platformFeeCents, 5);
  assert.equal(r.processingFeeCents, 61);
  assert.equal(r.payoutCents, 34);
  const s = computeTicketFees({ grossCents: 50, tier: "free" });
  assert.equal(s.payoutCents, 0);
  assert.ok(s.processingFeeCents >= 58);
});

test("zero gross", () => {
  const r = computeTicketFees({ grossCents: 0, tier: "free" });
  assert.equal(r.platformFeeCents, 0);
  assert.equal(r.processingFeeCents, 58);
  assert.equal(r.payoutCents, 0);
});

test("missing or non-numeric gross counts as 0", () => {
  for (const arg of [undefined, {}, { grossCents: "abc" }, { grossCents: null }, { grossCents: NaN }]) {
    const r = computeTicketFees(arg);
    assert.equal(r.platformFeeCents, 0);
    assert.equal(r.processingFeeCents, 58);
    assert.equal(r.payoutCents, 0);
    assert.equal(r.marginBps, 500);
  }
});

test("results are integers", () => {
  for (const g of [1, 99, 333, 1999, 4567, 123457]) {
    for (const tier of ["free", "growth", "scale"]) {
      const r = computeTicketFees({ grossCents: g, tier });
      for (const k of ["marginBps", "platformFeeCents", "processingFeeCents", "payoutCents"]) {
        assert.ok(Number.isInteger(r[k]), `${k} for ${g}/${tier}`);
      }
      assert.ok(r.payoutCents >= 0);
    }
  }
});

test("processing fee same across tiers", () => {
  const a = computeTicketFees({ grossCents: 7777, tier: "free" });
  const b = computeTicketFees({ grossCents: 7777, tier: "growth" });
  const c = computeTicketFees({ grossCents: 7777, tier: "scale" });
  assert.equal(a.processingFeeCents, b.processingFeeCents);
  assert.equal(b.processingFeeCents, c.processingFeeCents);
});

test("exported constants", () => {
  assert.equal(mod.TICKET_PROCESSING_FLAT_CENTS, 58);
  assert.equal(mod.TICKET_PROCESSING_PCT_BPS, 290);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.free, 500);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.growth, 350);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.scale, 200);
});
