const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = (gross, tier) =>
  tier === undefined
    ? mod.computeTicketFees({ grossCents: gross })
    : mod.computeTicketFees({ grossCents: gross, tier });

test("exports the three constants and the function", () => {
  assert.equal(typeof mod.computeTicketFees, "function");
  assert.notEqual(mod.TICKET_PLATFORM_MARGIN_BPS, undefined);
  assert.equal(mod.TICKET_PROCESSING_PCT_BPS, 290);
  assert.equal(mod.TICKET_PROCESSING_FLAT_CENTS, 58);
});

test("result has exactly the four documented fields", () => {
  const r = f(10000, "free");
  assert.deepEqual(Object.keys(r).sort(), [
    "marginBps",
    "payoutCents",
    "platformFeeCents",
    "processingFeeCents",
  ]);
});

test("free tier: 5% platform fee, marginBps 500, payout computed", () => {
  assert.deepEqual(f(10000, "free"), {
    marginBps: 500,
    platformFeeCents: 500,
    processingFeeCents: 348,
    payoutCents: 9152,
  });
});

test("growth tier: 3.5% platform fee, marginBps 350", () => {
  assert.deepEqual(f(10000, "growth"), {
    marginBps: 350,
    platformFeeCents: 350,
    processingFeeCents: 348,
    payoutCents: 9302,
  });
});

test("scale tier: 2% platform fee, marginBps 200", () => {
  assert.deepEqual(f(10000, "scale"), {
    marginBps: 200,
    platformFeeCents: 200,
    processingFeeCents: 348,
    payoutCents: 9452,
  });
});

test("processing fee is identical for every tier", () => {
  for (const tier of ["free", "growth", "scale", "bogus"]) {
    assert.equal(f(5000, tier).processingFeeCents, 203);
  }
});

test("unknown tier is treated as free", () => {
  assert.deepEqual(f(10000, "platinum"), f(10000, "free"));
  assert.equal(f(10000, "platinum").marginBps, 500);
  assert.equal(f(10000, "platinum").platformFeeCents, 500);
  assert.equal(f(10000, "").marginBps, 500);
});

test("default tier is free when tier omitted or undefined", () => {
  assert.deepEqual(f(10000), f(10000, "free"));
  assert.equal(mod.computeTicketFees({ grossCents: 10000 }).marginBps, 500);
});

test("platform fee rounding free tier: 5% on 9, 10, 11, 30 cents", () => {
  assert.equal(f(9, "free").platformFeeCents, 0); // 0.45
  assert.equal(f(10, "free").platformFeeCents, 1); // 0.5 half cent rounds up
  assert.equal(f(11, "free").platformFeeCents, 1); // 0.55
  assert.equal(f(30, "free").platformFeeCents, 2); // 1.5
});

test("platform fee rounding growth tier: 3.5% on 99, 100, 101", () => {
  assert.equal(f(99, "growth").platformFeeCents, 3); // 3.465
  assert.equal(f(100, "growth").platformFeeCents, 4); // 3.5
  assert.equal(f(101, "growth").platformFeeCents, 4); // 3.535
});

test("platform fee rounding scale tier: 2% on 24, 25, 26", () => {
  assert.equal(f(24, "scale").platformFeeCents, 0); // 0.48
  assert.equal(f(25, "scale").platformFeeCents, 1); // 0.5
  assert.equal(f(26, "scale").platformFeeCents, 1); // 0.52
});

test("processing percentage rounding: 2.9% plus flat 58", () => {
  assert.equal(f(150, "free").processingFeeCents, 4 + 58); // 4.35
  assert.equal(f(160, "free").processingFeeCents, 5 + 58); // 4.64
  assert.equal(f(190, "free").processingFeeCents, 6 + 58); // 5.51
  assert.equal(f(450, "free").processingFeeCents, 13 + 58); // 13.05
  assert.equal(f(500, "free").processingFeeCents, 15 + 58); // 14.5 half cent up
  assert.equal(f(1500, "free").processingFeeCents, 44 + 58); // 43.5 half cent up
  assert.equal(f(1000, "free").processingFeeCents, 29 + 58); // exact 29
});

test("flat 58 cents is added even to a tiny subtotal", () => {
  assert.equal(f(1, "free").processingFeeCents, 58); // 0.029 rounds to 0
  assert.equal(f(17, "free").processingFeeCents, 58); // 0.493 rounds to 0
  assert.equal(f(18, "free").processingFeeCents, 59); // 0.522 rounds to 1
});

test("payout subtracts both fees from the subtotal", () => {
  // 100: platform 5, processing round(2.9)=3 + 58 = 61, payout 34
  assert.deepEqual(f(100, "free"), {
    marginBps: 500,
    platformFeeCents: 5,
    processingFeeCents: 61,
    payoutCents: 34,
  });
});

test("payout floor at zero: just below, at and just above the break-even point", () => {
  // 62: fees 3 + 60 = 63 > 62 so raw payout -1, clamped to 0
  assert.equal(f(62, "free").payoutCents, 0);
  // 63: fees 3 + 60 = 63, payout exactly 0
  assert.equal(f(63, "free").payoutCents, 0);
  // 64: fees 3 + 60 = 63, payout 1
  assert.equal(f(64, "free").payoutCents, 1);
});

test("payout is never negative and fees are still reported when clamped", () => {
  const r = f(62, "free");
  assert.equal(r.platformFeeCents, 3);
  assert.equal(r.processingFeeCents, 60);
  assert.equal(r.payoutCents, 0);
});

test("zero gross: only flat processing fee, payout 0", () => {
  assert.deepEqual(f(0, "free"), {
    marginBps: 500,
    platformFeeCents: 0,
    processingFeeCents: 58,
    payoutCents: 0,
  });
  assert.equal(f(0, "scale").marginBps, 200);
  assert.equal(f(0, "growth").marginBps, 350);
});

test("missing grossCents counts as 0", () => {
  const expected = {
    marginBps: 500,
    platformFeeCents: 0,
    processingFeeCents: 58,
    payoutCents: 0,
  };
  assert.deepEqual(mod.computeTicketFees(), expected);
  assert.deepEqual(mod.computeTicketFees({}), expected);
  assert.deepEqual(mod.computeTicketFees({ tier: "free" }), expected);
  assert.deepEqual(mod.computeTicketFees({ grossCents: undefined }), expected);
});

test("null grossCents counts as 0", () => {
  assert.deepEqual(mod.computeTicketFees({ grossCents: null }), {
    marginBps: 500,
    platformFeeCents: 0,
    processingFeeCents: 58,
    payoutCents: 0,
  });
});

test("non-numeric grossCents counts as 0", () => {
  const expected = {
    marginBps: 350,
    platformFeeCents: 0,
    processingFeeCents: 58,
    payoutCents: 0,
  };
  assert.deepEqual(mod.computeTicketFees({ grossCents: "abc", tier: "growth" }), expected);
  assert.deepEqual(mod.computeTicketFees({ grossCents: NaN, tier: "growth" }), expected);
  assert.deepEqual(mod.computeTicketFees({ grossCents: {}, tier: "growth" }), expected);
});

test("large ticket: each tier computed by hand", () => {
  // 100000: processing 2900 + 58 = 2958
  assert.deepEqual(f(100000, "free"), {
    marginBps: 500,
    platformFeeCents: 5000,
    processingFeeCents: 2958,
    payoutCents: 92042,
  });
  assert.deepEqual(f(100000, "growth"), {
    marginBps: 350,
    platformFeeCents: 3500,
    processingFeeCents: 2958,
    payoutCents: 93542,
  });
  assert.deepEqual(f(100000, "scale"), {
    marginBps: 200,
    platformFeeCents: 2000,
    processingFeeCents: 2958,
    payoutCents: 95042,
  });
});

test("higher tier never pays a higher platform fee than a lower tier", () => {
  const free = f(7777, "free").platformFeeCents;
  const growth = f(7777, "growth").platformFeeCents;
  const scale = f(7777, "scale").platformFeeCents;
  // 388.85 -> 389, 272.195 -> 272, 155.54 -> 156
  assert.equal(free, 389);
  assert.equal(growth, 272);
  assert.equal(scale, 156);
});

test("results are integers", () => {
  const r = f(1234, "growth");
  for (const k of ["marginBps", "platformFeeCents", "processingFeeCents", "payoutCents"]) {
    assert.ok(Number.isInteger(r[k]));
  }
});
