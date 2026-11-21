const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeTicketFees } = mod;

test("free tier on 10000 cents", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "free" });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 500);
  assert.equal(r.processingFeeCents, 290 + 58);
  assert.equal(r.payoutCents, 10000 - 500 - 348);
});

test("growth tier on 10000 cents", () => {
  const r = computeTicketFees({ grossCents: 10000, tier: "growth" });
  assert.equal(r.marginBps, 350);
  assert.equal(r.platformFeeCents, 350);
  assert.equal(r.processingFeeCents, 348);
  assert.equal(r.payoutCents, 10000 - 350 - 348);
});

test("scale tier on 10000 cents", () => {
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
  const r = computeTicketFees({ grossCents: 2000 });
  assert.equal(r.marginBps, 500);
  assert.equal(r.platformFeeCents, 100);
  assert.equal(r.processingFeeCents, 58 + 58);
  assert.equal(r.payoutCents, 2000 - 100 - 116);
});

test("rounding to nearest cent", () => {
  // 1234 * 0.035 = 43.19 -> 43 ; 1234 * 0.029 = 35.786 -> 36 + 58
  const r = computeTicketFees({ grossCents: 1234, tier: "growth" });
  assert.equal(r.platformFeeCents, 43);
  assert.equal(r.processingFeeCents, 94);
  assert.equal(r.payoutCents, 1234 - 43 - 94);
});

test("rounding on 1500 free: 75 platform, 43.5 -> 44 +58", () => {
  const r = computeTicketFees({ grossCents: 1500, tier: "free" });
  assert.equal(r.platformFeeCents, 75);
  assert.equal(r.processingFeeCents, 102);
  assert.equal(r.payoutCents, 1500 - 75 - 102);
});

test("payout never below zero", () => {
  const r = computeTicketFees({ grossCents: 100, tier: "free" });
  assert.equal(r.payoutCents, 0);
  assert.equal(r.platformFeeCents, 5);
  assert.equal(r.processingFeeCents, 61);
});

test("zero gross", () => {
  const r = computeTicketFees({ grossCents: 0, tier: "free" });
  assert.equal(r.platformFeeCents, 0);
  assert.equal(r.processingFeeCents, 58);
  assert.equal(r.payoutCents, 0);
  assert.equal(r.marginBps, 500);
});

test("missing or non-numeric gross counts as 0", () => {
  for (const arg of [undefined, {}, { grossCents: "abc" }, { grossCents: null }, { grossCents: undefined }]) {
    const r = computeTicketFees(arg);
    assert.equal(r.platformFeeCents, 0);
    assert.equal(r.payoutCents, 0);
    assert.equal(r.marginBps, 500);
  }
});

test("results are integers", () => {
  for (const g of [1, 99, 333, 1234, 9999, 123457]) {
    for (const tier of ["free", "growth", "scale"]) {
      const r = computeTicketFees({ grossCents: g, tier });
      for (const k of ["marginBps", "platformFeeCents", "processingFeeCents", "payoutCents"]) {
        assert.ok(Number.isInteger(r[k]), `${k} for ${g}/${tier}`);
      }
      assert.ok(r.payoutCents >= 0);
    }
  }
});

test("exported constants exist", () => {
  assert.ok("TICKET_PLATFORM_MARGIN_BPS" in mod);
  assert.ok("TICKET_PROCESSING_PCT_BPS" in mod);
  assert.equal(mod.TICKET_PROCESSING_FLAT_CENTS, 58);
  assert.equal(mod.TICKET_PROCESSING_PCT_BPS, 290);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.free, 500);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.growth, 350);
  assert.equal(mod.TICKET_PLATFORM_MARGIN_BPS.scale, 200);
});
