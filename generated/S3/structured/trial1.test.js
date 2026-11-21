const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const f = (grossCents, tier) => mod.computeTicketFees({ grossCents, tier });

test("exported processing constants: 2.9% is 290 bps and flat fee is 58 cents", () => {
  assert.equal(mod.TICKET_PROCESSING_PCT_BPS, 290);
  assert.equal(mod.TICKET_PROCESSING_FLAT_CENTS, 58);
});

test("platform rate by tier: free 5% (500 bps)", () => {
  assert.deepEqual(f(10000, "free"), {
    marginBps: 500, platformFeeCents: 500, processingFeeCents: 348, payoutCents: 9152,
  });
});

test("platform rate by tier: growth 3.5% (350 bps)", () => {
  assert.deepEqual(f(10000, "growth"), {
    marginBps: 350, platformFeeCents: 350, processingFeeCents: 348, payoutCents: 9302,
  });
});

test("platform rate by tier: scale 2% (200 bps)", () => {
  assert.deepEqual(f(10000, "scale"), {
    marginBps: 200, platformFeeCents: 200, processingFeeCents: 348, payoutCents: 9450,
  });
});

test("processing fee is the same for every tier", () => {
  for (const t of ["free", "growth", "scale", "unknown"]) {
    assert.equal(f(10000, t).processingFeeCents, 348);
    assert.equal(f(1000000, t).processingFeeCents, 29058);
  }
});

test("large amounts: growth and scale", () => {
  const g = f(1000000, "growth");
  assert.equal(g.platformFeeCents, 35000);
  assert.equal(g.payoutCents, 935942);
  const s = f(1000000, "scale");
  assert.equal(s.platformFeeCents, 20000);
  assert.equal(s.payoutCents, 950942);
  const fr = f(1000000, "free");
  assert.equal(fr.platformFeeCents, 50000);
  assert.equal(fr.payoutCents, 920942);
});

test("unknown tier is treated as free", () => {
  for (const t of ["premium", "", null, "pro"]) {
    assert.deepEqual(f(10000, t), {
      marginBps: 500, platformFeeCents: 500, processingFeeCents: 348, payoutCents: 9152,
    });
  }
});

test("default tier is free when tier omitted", () => {
  assert.deepEqual(mod.computeTicketFees({ grossCents: 10000 }), {
    marginBps: 500, platformFeeCents: 500, processingFeeCents: 348, payoutCents: 9152,
  });
});

test("default grossCents is 0 when omitted, and no argument at all works", () => {
  const expected = { marginBps: 500, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0 };
  assert.deepEqual(mod.computeTicketFees({}), expected);
  assert.deepEqual(mod.computeTicketFees(), expected);
  assert.deepEqual(mod.computeTicketFees({ tier: "free" }), expected);
});

test("missing or non-numeric grossCents counts as 0", () => {
  for (const g of [undefined, null, "abc", {}]) {
    assert.deepEqual(f(g, "free"), {
      marginBps: 500, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0,
    });
  }
  assert.deepEqual(f("abc", "scale"), {
    marginBps: 200, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0,
  });
});

test("zero gross: platform fee 0, flat processing fee still 58, payout 0 not negative", () => {
  assert.deepEqual(f(0, "growth"), {
    marginBps: 350, platformFeeCents: 0, processingFeeCents: 58, payoutCents: 0,
  });
});

test("platform fee rounds to nearest cent: free 5%", () => {
  // 109 * 5% = 5.45 -> 5 ; 114 * 5% = 5.7 -> 6
  assert.equal(f(109, "free").platformFeeCents, 5);
  assert.equal(f(114, "free").platformFeeCents, 6);
  // 118 -> 5.9 -> 6 ; 119 -> 5.95 -> 6 ; 121 -> 6.05 -> 6
  assert.equal(f(118, "free").platformFeeCents, 6);
  assert.equal(f(119, "free").platformFeeCents, 6);
  assert.equal(f(121, "free").platformFeeCents, 6);
});

test("platform fee rounds to nearest cent: growth 3.5%", () => {
  // 99 -> 3.465 -> 3 ; 101 -> 3.535 -> 4 ; 102 -> 3.57 -> 4
  assert.equal(f(99, "growth").platformFeeCents, 3);
  assert.equal(f(101, "growth").platformFeeCents, 4);
  assert.equal(f(102, "growth").platformFeeCents, 4);
});

test("platform fee rounds to nearest cent: scale 2%", () => {
  // 74 -> 1.48 -> 1 ; 76 -> 1.52 -> 2
  assert.equal(f(74, "scale").platformFeeCents, 1);
  assert.equal(f(76, "scale").platformFeeCents, 2);
});

test("processing percentage rounds to nearest cent before flat fee added", () => {
  // 17 * 2.9% = 0.493 -> 0 -> 58 ; 18 -> 0.522 -> 1 -> 59
  assert.equal(f(17, "free").processingFeeCents, 58);
  assert.equal(f(18, "free").processingFeeCents, 59);
  // 120 -> 3.48 -> 3 -> 61 ; 121 -> 3.509 -> 4 -> 62
  assert.equal(f(120, "free").processingFeeCents, 61);
  assert.equal(f(121, "free").processingFeeCents, 62);
  // 1000 -> 29 -> 87
  assert.equal(f(1000, "scale").processingFeeCents, 87);
});

test("full breakdown at small amounts with rounding", () => {
  assert.deepEqual(f(99, "growth"), {
    marginBps: 350, platformFeeCents: 3, processingFeeCents: 61, payoutCents: 35,
  });
  assert.deepEqual(f(101, "growth"), {
    marginBps: 350, platformFeeCents: 4, processingFeeCents: 61, payoutCents: 36,
  });
  assert.deepEqual(f(74, "scale"), {
    marginBps: 200, platformFeeCents: 1, processingFeeCents: 60, payoutCents: 13,
  });
  assert.deepEqual(f(76, "scale"), {
    marginBps: 200, platformFeeCents: 2, processingFeeCents: 60, payoutCents: 14,
  });
  assert.deepEqual(f(100, "scale"), {
    marginBps: 200, platformFeeCents: 2, processingFeeCents: 61, payoutCents: 37,
  });
  assert.deepEqual(f(121, "free"), {
    marginBps: 500, platformFeeCents: 6, processingFeeCents: 62, payoutCents: 53,
  });
});

test("payout is subtotal minus fees: just above zero (free, 64 cents)", () => {
  // 64: platform 3.2 -> 3, processing 1.856 -> 2 + 58 = 60, payout 1
  assert.deepEqual(f(64, "free"), {
    marginBps: 500, platformFeeCents: 3, processingFeeCents: 60, payoutCents: 1,
  });
});

test("payout exactly zero at boundary (free, 63 cents)", () => {
  // 63: platform 3.15 -> 3, processing 1.827 -> 2 + 58 = 60, payout 0
  assert.deepEqual(f(63, "free"), {
    marginBps: 500, platformFeeCents: 3, processingFeeCents: 60, payoutCents: 0,
  });
});

test("payout never below zero: just below boundary (free, 62 cents)", () => {
  // 62: platform 3.1 -> 3, processing 1.798 -> 2 + 58 = 60, raw payout -1 -> 0
  assert.deepEqual(f(62, "free"), {
    marginBps: 500, platformFeeCents: 3, processingFeeCents: 60, payoutCents: 0,
  });
});

test("payout clamps to zero well below fees, fees are still charged in full", () => {
  // 60: platform 3, processing 1.74 -> 2 + 58 = 60, raw payout -3 -> 0
  assert.deepEqual(f(60, "free"), {
    marginBps: 500, platformFeeCents: 3, processingFeeCents: 60, payoutCents: 0,
  });
  assert.equal(f(1, "scale").payoutCents, 0);
  assert.equal(f(1, "scale").processingFeeCents, 58);
});

test("artist payout is never negative for any tier at small amounts", () => {
  for (const t of ["free", "growth", "scale"]) {
    for (let g = 0; g <= 70; g++) {
      assert.ok(f(g, t).payoutCents >= 0);
    }
  }
});
