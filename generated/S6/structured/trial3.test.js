const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const debt = (o) => mod.computeChargebackDebt(o);
const split = (o) => mod.splitChargebackReversal(o);

// ---------- computeChargebackDebt ----------

test("share of 1 gives the artist the whole disputed amount and fee", () => {
  assert.deepEqual(debt({ disputedCents: 5000, feeCents: 1500, share: 1, alreadyPaid: true }), {
    dispShare: 5000, feeShare: 1500, debtShare: 5000,
  });
});

test("share of 0 gives zero shares and zero debt even when paid", () => {
  assert.deepEqual(debt({ disputedCents: 5000, feeCents: 1500, share: 0, alreadyPaid: true }), {
    dispShare: 0, feeShare: 0, debtShare: 0,
  });
});

test("share just below 1, exactly 1 (boundary) for disputed amount", () => {
  assert.equal(debt({ disputedCents: 1000, feeCents: 0, share: 0.999, alreadyPaid: true }).dispShare, 999);
  assert.equal(debt({ disputedCents: 1000, feeCents: 0, share: 1, alreadyPaid: true }).dispShare, 1000);
});

test("share just above 0, exactly 0 for disputed amount", () => {
  assert.equal(debt({ disputedCents: 1000, feeCents: 0, share: 0.001, alreadyPaid: true }).dispShare, 1);
  assert.equal(debt({ disputedCents: 1000, feeCents: 0, share: 0, alreadyPaid: true }).dispShare, 0);
});

test("half share splits evenly for even amounts", () => {
  assert.deepEqual(debt({ disputedCents: 1000, feeCents: 1500, share: 0.5, alreadyPaid: true }), {
    dispShare: 500, feeShare: 750, debtShare: 500,
  });
});

test("dispShare rounds down just under a half cent", () => {
  // 100 * 0.504 = 50.4 -> 50
  assert.equal(debt({ disputedCents: 100, feeCents: 0, share: 0.504, alreadyPaid: true }).dispShare, 50);
});

test("dispShare rounds up just over a half cent", () => {
  // 100 * 0.506 = 50.6 -> 51
  assert.equal(debt({ disputedCents: 100, feeCents: 0, share: 0.506, alreadyPaid: true }).dispShare, 51);
});

test("feeShare rounds to nearest cent: one third of 100 is 33", () => {
  assert.equal(debt({ disputedCents: 0, feeCents: 100, share: 0.3333, alreadyPaid: false }).feeShare, 33);
});

test("feeShare rounds to nearest cent: two thirds of 100 is 67", () => {
  assert.equal(debt({ disputedCents: 0, feeCents: 100, share: 0.6667, alreadyPaid: false }).feeShare, 67);
});

test("dispShare and feeShare are rounded independently", () => {
  // 100*0.3333=33.33->33 ; 200*0.3333=66.66->67
  const r = debt({ disputedCents: 100, feeCents: 200, share: 0.3333, alreadyPaid: true });
  assert.equal(r.dispShare, 33);
  assert.equal(r.feeShare, 67);
  assert.equal(r.debtShare, 33);
});

test("paid artist owes the disputed share (debtShare equals dispShare)", () => {
  const r = debt({ disputedCents: 2000, feeCents: 1500, share: 0.25, alreadyPaid: true });
  assert.equal(r.dispShare, 500);
  assert.equal(r.debtShare, 500);
});

test("unpaid artist owes nothing: debtShare is 0 but shares are still computed", () => {
  const r = debt({ disputedCents: 2000, feeCents: 1500, share: 0.25, alreadyPaid: false });
  assert.equal(r.dispShare, 500);
  assert.equal(r.feeShare, 375);
  assert.equal(r.debtShare, 0);
});

test("the fee is never part of the artist's debt (paid)", () => {
  const r = debt({ disputedCents: 0, feeCents: 1500, share: 1, alreadyPaid: true });
  assert.equal(r.feeShare, 1500);
  assert.equal(r.debtShare, 0);
});

test("alreadyPaid defaults to false", () => {
  const r = debt({ disputedCents: 1000, feeCents: 100, share: 1 });
  assert.equal(r.debtShare, 0);
  assert.equal(r.dispShare, 1000);
});

test("all numeric fields default to 0 when omitted", () => {
  assert.deepEqual(debt({}), { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("missing disputedCents defaults to 0", () => {
  assert.deepEqual(debt({ feeCents: 1000, share: 0.5, alreadyPaid: true }), {
    dispShare: 0, feeShare: 500, debtShare: 0,
  });
});

test("missing feeCents defaults to 0", () => {
  assert.deepEqual(debt({ disputedCents: 1000, share: 0.5, alreadyPaid: true }), {
    dispShare: 500, feeShare: 0, debtShare: 500,
  });
});

test("missing share defaults to 0", () => {
  assert.deepEqual(debt({ disputedCents: 1000, feeCents: 1000, alreadyPaid: true }), {
    dispShare: 0, feeShare: 0, debtShare: 0,
  });
});

test("zero disputed and zero fee give all zeros", () => {
  assert.deepEqual(debt({ disputedCents: 0, feeCents: 0, share: 0.7, alreadyPaid: true }), {
    dispShare: 0, feeShare: 0, debtShare: 0,
  });
});

test("returns integer cents", () => {
  const r = debt({ disputedCents: 777, feeCents: 1313, share: 0.37, alreadyPaid: true });
  assert.ok(Number.isInteger(r.dispShare));
  assert.ok(Number.isInteger(r.feeShare));
  assert.ok(Number.isInteger(r.debtShare));
  // 777*0.37=287.49 -> 287 ; 1313*0.37=485.81 -> 486
  assert.equal(r.dispShare, 287);
  assert.equal(r.feeShare, 486);
});

// ---------- splitChargebackReversal ----------

test("paid, reversal covers everything: both fully reversed, no shortfall, nothing absorbed", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1150, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid, reversal larger than needed: capped, nothing extra assigned", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 5000, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid, reversal below disputed share: all goes to dispute, fee gets nothing", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 600, alreadyPaid: true }), {
    disputeReversed: 600, feeReversed: 0, disputeShortfall: 400, feeAbsorbed: 150,
  });
});

test("paid, reversal just below disputed share (999 of 1000)", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 999, alreadyPaid: true }), {
    disputeReversed: 999, feeReversed: 0, disputeShortfall: 1, feeAbsorbed: 150,
  });
});

test("paid, reversal exactly equals disputed share: fee gets nothing", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1000, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150,
  });
});

test("paid, reversal just above disputed share: 1 cent goes to the fee", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1001, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 1, disputeShortfall: 0, feeAbsorbed: 149,
  });
});

test("paid, reversal covers dispute and part of fee", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1100, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 50,
  });
});

test("paid, reversal just below total (1149): fee absorbs 1", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1149, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 149, disputeShortfall: 0, feeAbsorbed: 1,
  });
});

test("paid, reversal exactly total (1150)", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1150, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid, reversal just above total (1151): capped", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 1151, alreadyPaid: true }), {
    disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid, zero reversal: full shortfall and full fee absorbed", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 0, alreadyPaid: true }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150,
  });
});

test("paid, negative reversal counts as 0", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: -500, alreadyPaid: true }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150,
  });
});

test("paid, reversal of -1 counts as 0", () => {
  assert.deepEqual(split({ dispShare: 200, feeShare: 30, reversedCents: -1, alreadyPaid: true }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 200, feeAbsorbed: 30,
  });
});

test("paid, zero fee share: reversal beyond dispute reverses no fee", () => {
  assert.deepEqual(split({ dispShare: 500, feeShare: 0, reversedCents: 800, alreadyPaid: true }), {
    disputeReversed: 500, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid, zero dispute share: reversal goes straight to the fee", () => {
  assert.deepEqual(split({ dispShare: 0, feeShare: 150, reversedCents: 100, alreadyPaid: true }), {
    disputeReversed: 0, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 50,
  });
});

test("paid, zero dispute share and reversal exceeds fee", () => {
  assert.deepEqual(split({ dispShare: 0, feeShare: 150, reversedCents: 400, alreadyPaid: true }), {
    disputeReversed: 0, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid, all zeros", () => {
  assert.deepEqual(split({ dispShare: 0, feeShare: 0, reversedCents: 0, alreadyPaid: true }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("not paid: nothing recovered, no shortfall, platform absorbs the whole fee share", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 0, alreadyPaid: false }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150,
  });
});

test("not paid: even a positive reversedCents recovers nothing", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: 5000, alreadyPaid: false }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150,
  });
});

test("not paid: negative reversal still gives zero recovery and full fee absorbed", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 150, reversedCents: -100, alreadyPaid: false }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150,
  });
});

test("not paid: zero fee share gives all zeros", () => {
  assert.deepEqual(split({ dispShare: 1000, feeShare: 0, reversedCents: 300, alreadyPaid: false }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0,
  });
});

test("paid versus unpaid differ for the same inputs", () => {
  const input = { dispShare: 700, feeShare: 90, reversedCents: 500 };
  assert.deepEqual(split({ ...input, alreadyPaid: true }), {
    disputeReversed: 500, feeReversed: 0, disputeShortfall: 200, feeAbsorbed: 90,
  });
  assert.deepEqual(split({ ...input, alreadyPaid: false }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 90,
  });
});

test("reversal priority: disputed amount first, then fee (not proportional)", () => {
  const r = split({ dispShare: 400, feeShare: 400, reversedCents: 500, alreadyPaid: true });
  assert.equal(r.disputeReversed, 400);
  assert.equal(r.feeReversed, 100);
  assert.equal(r.disputeShortfall, 0);
  assert.equal(r.feeAbsorbed, 300);
});

test("end to end: unpaid artist from computeChargebackDebt flows into split", () => {
  const d = debt({ disputedCents: 10000, feeCents: 1500, share: 0.4, alreadyPaid: false });
  assert.deepEqual(d, { dispShare: 4000, feeShare: 600, debtShare: 0 });
  assert.deepEqual(split({ dispShare: d.dispShare, feeShare: d.feeShare, reversedCents: 0, alreadyPaid: false }), {
    disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 600,
  });
});

test("end to end: paid artist with partial reversal", () => {
  const d = debt({ disputedCents: 10000, feeCents: 1500, share: 0.4, alreadyPaid: true });
  assert.deepEqual(d, { dispShare: 4000, feeShare: 600, debtShare: 4000 });
  const s = split({ dispShare: d.dispShare, feeShare: d.feeShare, reversedCents: 3000, alreadyPaid: true });
  assert.deepEqual(s, { disputeReversed: 3000, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 600 });
});
