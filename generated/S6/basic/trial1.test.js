const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeChargebackDebt, splitChargebackReversal } = mod;

test("computeChargebackDebt: full share, paid out", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 1, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 1500, debtShare: 5000 });
});

test("computeChargebackDebt: not paid means no debt", () => {
  const r = computeChargebackDebt({ disputedCents: 5000, feeCents: 1500, share: 1, alreadyPaid: false });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 1500, debtShare: 0 });
});

test("computeChargebackDebt: half share paid", () => {
  const r = computeChargebackDebt({ disputedCents: 4000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.equal(r.dispShare, 2000);
  assert.equal(r.feeShare, 750);
  assert.equal(r.debtShare, 2000);
});

test("computeChargebackDebt: fee never part of debt", () => {
  const r = computeChargebackDebt({ disputedCents: 0, feeCents: 1500, share: 1, alreadyPaid: true });
  assert.equal(r.debtShare, 0);
  assert.equal(r.feeShare, 1500);
});

test("computeChargebackDebt: shares rounded to nearest cent", () => {
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 1001, share: 0.3336, alreadyPaid: true });
  assert.equal(r.dispShare, 334);
  assert.equal(r.feeShare, 334);
  assert.equal(r.debtShare, 334);
  const r2 = computeChargebackDebt({ disputedCents: 1001, feeCents: 1001, share: 0.3, alreadyPaid: true });
  assert.equal(r2.dispShare, 300);
  assert.equal(r2.feeShare, 300);
});

test("computeChargebackDebt: results are integers", () => {
  const r = computeChargebackDebt({ disputedCents: 9999, feeCents: 1550, share: 0.37, alreadyPaid: true });
  assert.ok(Number.isInteger(r.dispShare));
  assert.ok(Number.isInteger(r.feeShare));
  assert.ok(Number.isInteger(r.debtShare));
});

test("computeChargebackDebt: defaults", () => {
  assert.deepEqual(computeChargebackDebt({}), { dispShare: 0, feeShare: 0, debtShare: 0 });
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 100 });
  assert.equal(r.dispShare, 0);
  assert.equal(r.debtShare, 0);
  const r2 = computeChargebackDebt({ disputedCents: 1000, feeCents: 100, share: 1 });
  assert.deepEqual(r2, { dispShare: 1000, feeShare: 100, debtShare: 0 });
});

test("computeChargebackDebt: zero share", () => {
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 100, share: 0, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("splitChargebackReversal: not paid, nothing recovered, platform absorbs fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 0, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("splitChargebackReversal: not paid ignores reversedCents", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 3000, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("splitChargebackReversal: paid, nothing reversed", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 0, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 1500 });
});

test("splitChargebackReversal: partial reversal goes to dispute first", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 3000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 3000, feeReversed: 0, disputeShortfall: 2000, feeAbsorbed: 1500 });
});

test("splitChargebackReversal: exactly covers dispute", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 5000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 1500 });
});

test("splitChargebackReversal: overflow goes to fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1000, disputeShortfall: 0, feeAbsorbed: 500 });
});

test("splitChargebackReversal: full recovery", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 6500, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1500, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("splitChargebackReversal: over-recovery is capped", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: 99999, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 1500, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("splitChargebackReversal: negative reversed counts as 0", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 1500, reversedCents: -700, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 1500 });
});

test("splitChargebackReversal: zero dispute share, reversal goes to fee", () => {
  const r = splitChargebackReversal({ dispShare: 0, feeShare: 1500, reversedCents: 400, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 400, disputeShortfall: 0, feeAbsorbed: 1100 });
});

test("splitChargebackReversal: conservation of amounts", () => {
  for (const reversedCents of [-5, 0, 1, 999, 1000, 1001, 1500, 2500, 3000]) {
    const r = splitChargebackReversal({ dispShare: 1000, feeShare: 1500, reversedCents, alreadyPaid: true });
    assert.equal(r.disputeReversed + r.disputeShortfall, 1000);
    assert.equal(r.feeReversed + r.feeAbsorbed, 1500);
  }
});

test("end to end: computeChargebackDebt feeds splitChargebackReversal", () => {
  const d = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 0.4, alreadyPaid: true });
  assert.deepEqual(d, { dispShare: 4000, feeShare: 600, debtShare: 4000 });
  const r = splitChargebackReversal({ dispShare: d.dispShare, feeShare: d.feeShare, reversedCents: 4200, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 4000, feeReversed: 200, disputeShortfall: 0, feeAbsorbed: 400 });
});
