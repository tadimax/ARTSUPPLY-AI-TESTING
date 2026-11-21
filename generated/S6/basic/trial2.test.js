const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeChargebackDebt, splitChargebackReversal } = mod;

test("computeChargebackDebt: paid artist with full share owes the disputed amount", () => {
  const r = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 10000, feeShare: 1500, debtShare: 10000 });
});

test("computeChargebackDebt: unpaid artist owes nothing", () => {
  const r = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 0.5, alreadyPaid: false });
  assert.equal(r.dispShare, 5000);
  assert.equal(r.feeShare, 750);
  assert.equal(r.debtShare, 0);
});

test("computeChargebackDebt: fee is never part of debt", () => {
  const r = computeChargebackDebt({ disputedCents: 0, feeCents: 1500, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 1500, debtShare: 0 });
});

test("computeChargebackDebt: shares rounded to nearest cent", () => {
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 1500, share: 1 / 3, alreadyPaid: true });
  assert.equal(r.dispShare, 333);
  assert.equal(r.feeShare, 500);
  assert.equal(r.debtShare, 333);
  const r2 = computeChargebackDebt({ disputedCents: 1000, feeCents: 1000, share: 2 / 3, alreadyPaid: true });
  assert.equal(r2.dispShare, 667);
  assert.equal(r2.feeShare, 667);
});

test("computeChargebackDebt: defaults to zero and not paid", () => {
  assert.deepEqual(computeChargebackDebt({}), { dispShare: 0, feeShare: 0, debtShare: 0 });
  const r = computeChargebackDebt({ disputedCents: 500, feeCents: 100, share: 1 });
  assert.equal(r.debtShare, 0);
  assert.equal(r.dispShare, 500);
});

test("computeChargebackDebt: zero share", () => {
  const r = computeChargebackDebt({ disputedCents: 500, feeCents: 100, share: 0, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("splitChargebackReversal: reversal covers dispute first", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 600, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 600, feeReversed: 0, disputeShortfall: 400, feeAbsorbed: 150 });
});

test("splitChargebackReversal: leftover goes to fee", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 1100, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 1000, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 50 });
});

test("splitChargebackReversal: full recovery", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 1150, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("splitChargebackReversal: over-recovery is capped", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 5000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 1000, feeReversed: 150, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("splitChargebackReversal: paid with nothing reversed", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 0, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150 });
});

test("splitChargebackReversal: negative reversed counts as 0", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: -300, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 1000, feeAbsorbed: 150 });
});

test("splitChargebackReversal: unpaid artist has no recovery, no shortfall, platform absorbs fee", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 0, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 150 });
});

test("splitChargebackReversal: unpaid ignores any reversed amount", () => {
  const r = splitChargebackReversal({ dispShare: 1000, feeShare: 150, reversedCents: 700, alreadyPaid: false });
  assert.equal(r.disputeShortfall, 0);
  assert.equal(r.feeAbsorbed, 150);
  assert.equal(r.disputeReversed, 0);
  assert.equal(r.feeReversed, 0);
});

test("end to end: compute then split for a paid artist with partial recovery", () => {
  const d = computeChargebackDebt({ disputedCents: 2000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.deepEqual(d, { dispShare: 1000, feeShare: 750, debtShare: 1000 });
  const s = splitChargebackReversal({ ...d, reversedCents: 1200, alreadyPaid: true });
  assert.deepEqual(s, { disputeReversed: 1000, feeReversed: 200, disputeShortfall: 0, feeAbsorbed: 550 });
});

test("splitChargebackReversal: zero dispute share sends reversal to fee", () => {
  const r = splitChargebackReversal({ dispShare: 0, feeShare: 150, reversedCents: 100, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 50 });
});
