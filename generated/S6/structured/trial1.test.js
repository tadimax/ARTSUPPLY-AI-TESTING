const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const debt = (o) => mod.computeChargebackDebt(o);
const split = (o) => mod.splitChargebackReversal(o);

// ---------- computeChargebackDebt ----------

test("paid artist with full share owes the whole disputed amount", () => {
  assert.deepEqual(
    debt({ disputedCents: 10000, feeCents: 1500, share: 1, alreadyPaid: true }),
    { dispShare: 10000, feeShare: 1500, debtShare: 10000 }
  );
});

test("unpaid artist owes nothing but shares are still computed", () => {
  assert.deepEqual(
    debt({ disputedCents: 10000, feeCents: 1500, share: 1, alreadyPaid: false }),
    { dispShare: 10000, feeShare: 1500, debtShare: 0 }
  );
});

test("fee is never the artist's debt (debtShare equals dispShare only)", () => {
  const r = debt({ disputedCents: 4000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.equal(r.dispShare, 2000);
  assert.equal(r.feeShare, 750);
  assert.equal(r.debtShare, 2000);
  assert.notEqual(r.debtShare, r.dispShare + r.feeShare);
});

test("share of 0 gives zero everything", () => {
  assert.deepEqual(
    debt({ disputedCents: 10000, feeCents: 1500, share: 0, alreadyPaid: true }),
    { dispShare: 0, feeShare: 0, debtShare: 0 }
  );
});

test("share of 1 gives the full amounts", () => {
  assert.deepEqual(
    debt({ disputedCents: 777, feeCents: 15, share: 1, alreadyPaid: true }),
    { dispShare: 777, feeShare: 15, debtShare: 777 }
  );
});

test("fractional share splits amounts (0.25 and 0.75)", () => {
  assert.deepEqual(
    debt({ disputedCents: 10000, feeCents: 1600, share: 0.25, alreadyPaid: true }),
    { dispShare: 2500, feeShare: 400, debtShare: 2500 }
  );
  assert.deepEqual(
    debt({ disputedCents: 10000, feeCents: 1600, share: 0.75, alreadyPaid: true }),
    { dispShare: 7500, feeShare: 1200, debtShare: 7500 }
  );
});

test("defaults: empty object gives all zeros", () => {
  assert.deepEqual(debt({}), { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("default disputedCents is 0", () => {
  assert.deepEqual(
    debt({ feeCents: 1000, share: 1, alreadyPaid: true }),
    { dispShare: 0, feeShare: 1000, debtShare: 0 }
  );
});

test("default feeCents is 0", () => {
  assert.deepEqual(
    debt({ disputedCents: 1000, share: 1, alreadyPaid: true }),
    { dispShare: 1000, feeShare: 0, debtShare: 1000 }
  );
});

test("default share is 0", () => {
  assert.deepEqual(
    debt({ disputedCents: 1000, feeCents: 1000, alreadyPaid: true }),
    { dispShare: 0, feeShare: 0, debtShare: 0 }
  );
});

test("default alreadyPaid is false (no debt)", () => {
  assert.deepEqual(
    debt({ disputedCents: 1000, feeCents: 1000, share: 1 }),
    { dispShare: 1000, feeShare: 1000, debtShare: 0 }
  );
});

test("zero disputed and zero fee with paid artist", () => {
  assert.deepEqual(
    debt({ disputedCents: 0, feeCents: 0, share: 0.5, alreadyPaid: true }),
    { dispShare: 0, feeShare: 0, debtShare: 0 }
  );
});

test("rounding: just under half a cent rounds down", () => {
  // 49 * 0.01 = 0.49 -> 0
  const r = debt({ disputedCents: 49, feeCents: 49, share: 0.01, alreadyPaid: true });
  assert.equal(r.dispShare, 0);
  assert.equal(r.feeShare, 0);
  assert.equal(r.debtShare, 0);
});

test("rounding: just over half a cent rounds up", () => {
  // 51 * 0.01 = 0.51 -> 1
  const r = debt({ disputedCents: 51, feeCents: 51, share: 0.01, alreadyPaid: true });
  assert.equal(r.dispShare, 1);
  assert.equal(r.feeShare, 1);
  assert.equal(r.debtShare, 1);
});

test("rounding: exactly half a cent rounds to nearest (up)", () => {
  // 10 * 0.25 = 2.5 -> 3
  const r = debt({ disputedCents: 10, feeCents: 10, share: 0.25, alreadyPaid: true });
  assert.equal(r.dispShare, 3);
  assert.equal(r.feeShare, 3);
  assert.equal(r.debtShare, 3);
});

test("rounding: 1 cent at share 0.5 is 0.5 and rounds to 1", () => {
  const r = debt({ disputedCents: 1, feeCents: 1, share: 0.5, alreadyPaid: true });
  assert.equal(r.dispShare, 1);
  assert.equal(r.feeShare, 1);
});

test("rounding applies independently to disputed and fee", () => {
  // 1000 * 0.333 = 333; 1500 * 0.333 = 499.5 -> 500
  const r = debt({ disputedCents: 1000, feeCents: 1500, share: 0.333, alreadyPaid: true });
  assert.equal(r.dispShare, 333);
  assert.equal(r.feeShare, 500);
  assert.equal(r.debtShare, 333);
});

test("rounding: one third share of 1000 is 333", () => {
  const r = debt({ disputedCents: 1000, feeCents: 1000, share: 1 / 3, alreadyPaid: true });
  assert.equal(r.dispShare, 333);
  assert.equal(r.feeShare, 333);
});

test("rounding: two thirds share of 1000 is 667", () => {
  const r = debt({ disputedCents: 1000, feeCents: 1000, share: 2 / 3, alreadyPaid: true });
  assert.equal(r.dispShare, 667);
  assert.equal(r.feeShare, 667);
});

test("results are integers", () => {
  const r = debt({ disputedCents: 1234, feeCents: 1567, share: 0.37, alreadyPaid: true });
  assert.ok(Number.isInteger(r.dispShare));
  assert.ok(Number.isInteger(r.feeShare));
  assert.ok(Number.isInteger(r.debtShare));
  // 1234*0.37 = 456.58 -> 457 ; 1567*0.37 = 579.79 -> 580
  assert.equal(r.dispShare, 457);
  assert.equal(r.feeShare, 580);
  assert.equal(r.debtShare, 457);
});

test("unpaid: debtShare is 0 even with large amounts", () => {
  assert.equal(
    debt({ disputedCents: 1000000, feeCents: 1500, share: 1, alreadyPaid: false }).debtShare,
    0
  );
});

// ---------- splitChargebackReversal ----------

test("paid: reversal covering everything recovers dispute then fee", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1150, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

test("paid: reversal larger than dispute plus fee does not over-recover", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 5000, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

test("paid: reversal goes to dispute first (smaller than dispute)", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 400, alreadyPaid: true }),
    { disputeReversed: 400, feeReversed: 0, disputeShortfall: 600, feeAbsorbed: 150 }
  );
});

test("paid: reversal exactly equal to dispute leaves nothing for fee", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1000, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150 }
  );
});

test("paid: reversal one cent below dispute", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 999, alreadyPaid: true }),
    { disputeReversed: 999, feeReversed: 0, disputeShortfall: 1, feeAbsorbed: 150 }
  );
});

test("paid: reversal one cent above dispute spills 1 cent to fee", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1001, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 1, disputeShortfall: 0, feeAbsorbed: 149 }
  );
});

test("paid: partial fee recovery after dispute is fully covered", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1100, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 50 }
  );
});

test("paid: reversal one cent below dispute plus fee", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1149, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 149, disputeShortfall: 0, feeAbsorbed: 1 }
  );
});

test("paid: reversal exactly dispute plus fee", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1150, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

test("paid: reversal one cent above dispute plus fee is capped", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1151, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

test("paid: zero reversal means full shortfall and full fee absorbed", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 0, alreadyPaid: true }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150 }
  );
});

test("paid: negative reversal counts as 0", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: -500, alreadyPaid: true }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150 }
  );
});

test("paid: negative reversal of one cent counts as 0", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: -1, alreadyPaid: true }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150 }
  );
});

test("paid: reversal of 1 cent goes to dispute", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 1, alreadyPaid: true }),
    { disputeReversed: 1, feeReversed: 0, disputeShortfall: 999, feeAbsorbed: 150 }
  );
});

test("paid: zero dispute share sends the whole reversal to the fee", () => {
  assert.deepEqual(
    split({ dispShare: 0, feeShare: 150, reversedCents: 100, alreadyPaid: true }),
    { disputeReversed: 0, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 50 }
  );
});

test("paid: zero fee share, reversal beyond dispute is not applied to fee", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 0, reversedCents: 1200, alreadyPaid: true }),
    { disputeReversed: 1000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

test("paid: all zeros", () => {
  assert.deepEqual(
    split({ dispShare: 0, feeShare: 0, reversedCents: 0, alreadyPaid: true }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

test("unpaid: nothing recovered, no shortfall, platform absorbs whole fee share", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 0, alreadyPaid: false }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150 }
  );
});

test("unpaid: even a positive reversal amount recovers nothing", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: 5000, alreadyPaid: false }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150 }
  );
});

test("unpaid: negative reversal still absorbs whole fee share", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 150, reversedCents: -200, alreadyPaid: false }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150 }
  );
});

test("unpaid: zero fee share absorbs 0", () => {
  assert.deepEqual(
    split({ dispShare: 1000, feeShare: 0, reversedCents: 0, alreadyPaid: false }),
    { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0 }
  );
});

// ---------- end to end: debt then reversal ----------

test("flow: paid artist, 40% share, partial reversal", () => {
  // 5000*0.4 = 2000 ; 1500*0.4 = 600
  const d = debt({ disputedCents: 5000, feeCents: 1500, share: 0.4, alreadyPaid: true });
  assert.deepEqual(d, { dispShare: 2000, feeShare: 600, debtShare: 2000 });
  const s = split({ dispShare: d.dispShare, feeShare: d.feeShare, reversedCents: 2300, alreadyPaid: true });
  assert.deepEqual(s, { disputeReversed: 2000, feeReversed: 300, disputeShortfall: 0, feeAbsorbed: 300 });
});

test("flow: paid artist, reversal short of dispute leaves shortfall as debt", () => {
  const d = debt({ disputedCents: 5000, feeCents: 1500, share: 0.4, alreadyPaid: true });
  const s = split({ dispShare: d.dispShare, feeShare: d.feeShare, reversedCents: 500, alreadyPaid: true });
  assert.deepEqual(s, { disputeReversed: 500, feeReversed: 0, disputeShortfall: 1500, feeAbsorbed: 600 });
});

test("flow: unpaid artist, platform absorbs fee share, no debt", () => {
  const d = debt({ disputedCents: 5000, feeCents: 1500, share: 0.4, alreadyPaid: false });
  assert.deepEqual(d, { dispShare: 2000, feeShare: 600, debtShare: 0 });
  const s = split({ dispShare: d.dispShare, feeShare: d.feeShare, reversedCents: 0, alreadyPaid: false });
  assert.deepEqual(s, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 600 });
});
