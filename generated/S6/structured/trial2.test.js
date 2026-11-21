const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeChargebackDebt, splitChargebackReversal } = mod;

// ---------- computeChargebackDebt ----------

test("share of 1 gives the artist the whole disputed amount and fee", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 1500, debtShare: 5000 });
});

test("share of 0 gives zero shares and zero debt even when paid", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 0, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("share boundary just below 1 (0.99) rounds each share separately", () => {
  // 5000*0.99=4950, 1500*0.99=1485
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 0.99, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 4950, feeShare: 1485, debtShare: 4950 });
});

test("share boundary just above 0 (0.01) rounds each share", () => {
  // 5000*0.01=50, 1500*0.01=15
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 0.01, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 50, feeShare: 15, debtShare: 50 });
});

test("half share splits an even amount exactly", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 2500, feeShare: 750, debtShare: 2500 });
});

test("shares round to the nearest cent: just under a half cent rounds down", () => {
  // 1001*0.499 = 499.499 -> 499 ; 1003*0.499 = 500.497 -> 500
  const r = computeChargebackDebt({ disputedCents: 1001, feeCents: 1003, share: 0.499, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 499, feeShare: 500, debtShare: 499 });
});

test("shares round to the nearest cent: just over a half cent rounds up", () => {
  // 1001*0.501 = 501.501 -> 502 ; 1003*0.501 = 502.503 -> 503
  const r = computeChargebackDebt({ disputedCents: 1001, feeCents: 1003, share: 0.501, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 502, feeShare: 503, debtShare: 502 });
});

test("one third share rounds down (333.33 -> 333, 100 -> 100)", () => {
  // 1000/3 = 333.33 -> 333 ; 300/3 = 100
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 300, share: 1 / 3, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 333, feeShare: 100, debtShare: 333 });
});

test("two thirds share rounds up (666.67 -> 667)", () => {
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 1500, share: 2 / 3, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 667, feeShare: 1000, debtShare: 667 });
});

test("artist not paid out owes nothing for the disputed amount", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 0.5, alreadyPaid: false });
  assert.equal(r.debtShare, 0);
  assert.equal(r.dispShare, 2500);
  assert.equal(r.feeShare, 750);
});

test("paid artist owes exactly their dispute share, not the fee (fee is never debt)", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.equal(r.debtShare, 2500);
  assert.notEqual(r.debtShare, r.dispShare + r.feeShare);
});

test("debt is dispute share only even when fee is large", () => {
  const r = computeChargebackDebt({ disputedCents: 100, feeCents: 9000, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 100, feeShare: 9000, debtShare: 100 });
});

test("alreadyPaid defaults to false", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 1 });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 1500, debtShare: 0 });
});

test("missing disputedCents defaults to 0", () => {
  const r = computeChargebackDebt({ feeCents: 1500, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 1500, debtShare: 0 });
});

test("missing feeCents defaults to 0", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 0, debtShare: 5000 });
});

test("missing share defaults to 0", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("empty object defaults everything to zero and not paid", () => {
  const r = computeChargebackDebt({});
  assert.deepEqual(r, { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("zero disputed and zero fee give zero shares", () => {
  const r = computeChargebackDebt({ disputedCents: 0, feeCents: 0, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("unpaid artist with full share: debt 0 but fee share still computed", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 1, alreadyPaid: false });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 1500, debtShare: 0 });
});

// ---------- splitChargebackReversal ----------

test("paid: reversal covering everything recovers dispute and fee fully", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6500, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1500, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("paid: reversal goes to dispute first, then fee (partial fee)", () => {
  // 5000 to dispute, 500 to fee
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 5500, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 500, disputeShortfall: 0, feeAbsorbed: 1000 });
});

test("paid: reversal smaller than dispute goes all to dispute, fee gets nothing", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 3000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 3000, feeReversed: 0, disputeShortfall: 2000, feeAbsorbed: 1500 });
});

test("paid: reversal just below dispute share leaves 1 cent shortfall and fee untouched", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 4999, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 4999, feeReversed: 0, disputeShortfall: 1, feeAbsorbed: 1500 });
});

test("paid: reversal exactly equal to dispute share clears dispute, fee gets 0", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 5000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("paid: reversal just above dispute share sends 1 cent to fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 5001, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1, disputeShortfall: 0, feeAbsorbed: 1499 });
});

test("paid: reversal just below dispute plus fee leaves 1 cent absorbed", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6499, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1499, disputeShortfall: 0, feeAbsorbed: 1 });
});

test("paid: reversal exactly dispute plus fee absorbs nothing", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6500, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1500, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("paid: reversal above dispute plus fee does not over-recover", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6501, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1500, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("paid: very large reversal is capped at the shares", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 1000000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1500, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("paid: zero reversal leaves full shortfall and platform absorbs full fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 0, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 1500 });
});

test("paid: negative reversal counts as 0", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: -300, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 1500 });
});

test("paid: negative reversal of -1 counts as 0", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: -1, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 1500 });
});

test("paid: zero dispute share sends the whole reversal to the fee", () => {
  const r = splitChargebackReversal({ dispShare: 0, feeShare: 1500, reversedCents: 1000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 1000, disputeShortfall: 0, feeAbsorbed: 500 });
});

test("paid: zero fee share, reversal beyond dispute is not applied to fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 0, reversedCents: 7000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("paid: all zeros gives all zeros", () => {
  const r = splitChargebackReversal({ dispShare: 0, feeShare: 0, reversedCents: 0, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("not paid: nothing recovered, no shortfall, platform absorbs whole fee share", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 0, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("not paid: a reversed amount is ignored, nothing recovered", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6500, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("not paid: negative reversal still yields no shortfall and full fee absorbed", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: -50, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("not paid: no shortfall even for a very large dispute share", () => {
  const r = splitChargebackReversal({ dispShare: 999999, feeShare: 1500, reversedCents: 0, alreadyPaid: false });
  assert.equal(r.disputeShortfall, 0);
  assert.equal(r.feeAbsorbed, 1500);
});

// ---------- end to end: computeChargebackDebt feeding splitChargebackReversal ----------

test("flow: paid artist with half share and partial reversal", () => {
  const d = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.deepEqual(d, { dispShare: 5000, feeShare: 750, debtShare: 5000 });
  const r = splitChargebackReversal({
    dispShare: d.dispShare,
    feeShare: d.feeShare,
    reversedCents: 5200,
    alreadyPaid: true,
  });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 200, disputeShortfall: 0, feeAbsorbed: 550 });
});

test("flow: unpaid artist, platform absorbs the fee share and the artist owes nothing", () => {
  const d = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 0.5, alreadyPaid: false });
  assert.deepEqual(d, { dispShare: 5000, feeShare: 750, debtShare: 0 });
  const r = splitChargebackReversal({
    dispShare: d.dispShare,
    feeShare: d.feeShare,
    reversedCents: 0,
    alreadyPaid: false,
  });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 750 });
});
