const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = (grossCents, tier) => mod.computeTicketFees({ grossCents, tier });

test("free tier: 5% platform fee, 290 bps processing + 58 flat, payout on 10000", () => {
  assert.deepEqual(f(10000, "free"), {
    marginBps: 500,
    platformFeeCents: 500,
    processingFeeCents: 348,
    payoutCents: 9152,
  });
});

test("growth tier: 3.5% platform fee on 10000", () => {
  assert.deepEqual(f(10000, "growth"), {
    marginBps: 350,
    platformFeeCents: 350,
    processingFeeCents: 348,
    payoutCents: 9302,
  });
});

test("scale tier: 2% platform fee on 10000", () => {
  assert.deepEqual(f(10000, "scale"), {
    marginBps: 200,
    platformFeeCents: 200,
    processingFeeCents: 348,
    payoutCents: 9452,
  });
});

test("processing fee is identical for every tier", () => {
  assert.equal(f(10000, "free").processingFeeCents, 348);
  assert.equal(f(10000, "growth").processingFeeCents, 348);
  assert.equal(f(10000, "scale").processingFeeCents, 348);
});

test("unknown tier is treated as free", () => {
  assert.deepEqual(f(10000, "enterprise"), f(10000, "free"));
  assert.equal(f(10000, "enterprise").marginBps, 500);
  assert.deepEqual(f(10000, ""), f(10000, "free"));
});

test("tier defaults to free when omitted", () => {
  assert.deepEqual(mod.computeTicketFees({ grossCents: 10000 }), f(10000, "free"));
  assert.deepEqual(f(10000, undefined), f(10000, "free"));
});

test("no argument at all: grossCents 0, tier free", () => {
  assert.deepEqual(mod.computeTicketFees(), {
    marginBps: 500,
    platformFeeCents: 0,
    processingFeeCents: 58,
    payoutCents: 0,
  });
  assert.deepEqual(mod.computeTicketFees({}), {
    marginBps: 500,
    platformFeeCents: 0,
    processingFeeCents: 58,
    payoutCents: 0,
  });
});

test("missing, null and non-numeric grossCents count as 0", () => {
  const zero = { marginBps: 500, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0 };
  assert.deepEqual(f(undefined, "free"), zero);
  assert.deepEqual(f(null, "free"), zero);
  assert.deepEqual(f("abc", "free"), zero);
  assert.deepEqual(f(NaN, "free"), zero);
  assert.deepEqual(f({}, "free"), zero);
});

test("missing grossCents with growth and scale tiers still reports their rate", () => {
  assert.deepEqual(f(undefined, "growth"), {
    marginBps: 350, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0,
  });
  assert.deepEqual(f("abc", "scale"), {
    marginBps: 200, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0,
  });
});

test("zero gross: platform fee 0, flat 58 still applies, payout never negative", () => {
  for (const tier of ["free", "growth", "scale"]) {
    const r = f(0, tier);
    assert.equal(r.platformFeeCents, 0);
    assert.equal(r.processingFeeCents, 58);
    assert.equal(r.payoutCents, 0);
  }
});

test("platform fee rounding, free tier: 9 -> 0, 10 (half cent) -> 1, 11 -> 1", () => {
  assert.equal(f(9, "free").platformFeeCents, 0);
  assert.equal(f(10, "free").platformFeeCents, 1);
  assert.equal(f(11, "free").platformFeeCents, 1);
});

test("platform fee rounding, growth tier: 14 -> 0, 15 -> 1, 20 -> 1, 100 (half cent) -> 4", () => {
  assert.equal(f(14, "growth").platformFeeCents, 0);
  assert.equal(f(15, "growth").platformFeeCents, 1);
  assert.equal(f(20, "growth").platformFeeCents, 1);
  assert.equal(f(100, "growth").platformFeeCents, 4);
});

test("platform fee rounding, scale tier: 24 -> 0, 25 (half cent) -> 1, 26 -> 1", () => {
  assert.equal(f(24, "scale").platformFeeCents, 0);
  assert.equal(f(25, "scale").platformFeeCents, 1);
  assert.equal(f(26, "scale").platformFeeCents, 1);
});

test("processing fee rounding: 17 -> 0+58, 18 -> 1+58, 500 (half cent) -> 15+58", () => {
  assert.equal(f(17, "free").processingFeeCents, 58);
  assert.equal(f(18, "free").processingFeeCents, 59);
  assert.equal(f(500, "free").processingFeeCents, 73);
  assert.equal(f(500, "scale").processingFeeCents, 73);
});

test("full breakdown on 500 free: platform 25, processing 73, payout 402", () => {
  assert.deepEqual(f(500, "free"), {
    marginBps: 500, platformFeeCents: 25, processingFeeCents: 73, payoutCents: 402,
  });
});

test("payout is subtotal minus both fees: gross 100 free", () => {
  assert.deepEqual(f(100, "free"), {
    marginBps: 500, platformFeeCents: 5, processingFeeCents: 61, payoutCents: 34,
  });
});

test("payout floor boundary on free tier: 64 -> 1, 63 -> 0 exactly, 62 -> clamped 0", () => {
  assert.equal(f(64, "free").payoutCents, 1);
  assert.equal(f(63, "free").payoutCents, 0);
  assert.equal(f(62, "free").payoutCents, 0);
  assert.equal(f(66, "free").payoutCents, 3);
});

test("payout is never negative for small amounts in every tier", () => {
  for (const tier of ["free", "growth", "scale"]) {
    for (const g of [0, 1, 5, 30, 57, 58, 59]) {
      assert.ok(f(g, tier).payoutCents >= 0);
    }
  }
  assert.equal(f(1, "free").payoutCents, 0);
  assert.equal(f(58, "scale").payoutCents, 0);
});

test("payout just above fees for scale tier: 60 -> 1, 59 -> 0", () => {
  // 60: platform 1.2 -> 1, processing 1.74 -> 2 + 58 = 60, payout 60-1-60 -> 0
  assert.equal(f(60, "scale").payoutCents, 0);
  // 62: platform 1.24 -> 1, processing 1.798 -> 2 + 58 = 60, payout 1
  assert.equal(f(62, "scale").payoutCents, 1);
  // 61: platform 1.22 -> 1, processing 1.769 -> 2 + 58 = 60, payout 0
  assert.equal(f(61, "scale").payoutCents, 0);
});

test("artist receives full face value: payout + fees equals gross when not clamped", () => {
  for (const tier of ["free", "growth", "scale"]) {
    const r = f(10000, tier);
    assert.equal(r.payoutCents + r.platformFeeCents + r.processingFeeCents, 10000);
  }
});

test("exported processing constants", () => {
  assert.equal(mod.TICKET_PROCESSING_PCT_BPS, 290);
  assert.equal(mod.TICKET_PROCESSING_FLAT_CENTS, 58);
  assert.ok(mod.TICKET_PLATFORM_MARGIN_BPS !== undefined);
});
