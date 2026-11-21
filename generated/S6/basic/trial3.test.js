const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { computeChargebackDebt, splitChargebackReversal } = mod;

test("computeChargebackDebt: paid artist owes disputed share only", () => {
  const r = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 0.5, alreadyPaid: true });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 750, debtShare: 5000 });
});

test("computeChargebackDebt: unpaid artist owes nothing", () => {
  const r = computeChargebackDebt({ disputedCents: 10000, feeCents: 1500, share: 0.5, alreadyPaid: false });
  assert.deepEqual(r, { dispShare: 5000, feeShare: 750, debtShare: 0 });
});

test("computeChargebackDebt: defaults to zero and unpaid", () => {
  assert.deepEqual(computeChargebackDebt({}), { dispShare: 0, feeShare: 0, debtShare: 0 });
});

test("computeChargebackDebt: alreadyPaid defaults to false", () => {
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 100, share: 1 });
  assert.equal(r.debtShare, 0);
  assert.equal(r.dispShare, 1000);
  assert.equal(r.feeShare, 100);
});

test("computeChargebackDebt: shares rounded to nearest cent", () => {
  const r = computeChargebackDebt({ disputedCents: 1000, feeCents: 1500, share: 1 / 3, alreadyPaid: true });
  assert.equal(r.dispShare, 333);
  assert.equal(r.feeShare, 500);
  assert.equal(r.debtShare, 333);
  const r2 = computeChargebackDebt({ disputedCents: 1001, feeCents: 1000, share: 2 / 3, alreadyPaid: true });
  assert.equal(r2.dispShare, 667);
  assert.equal(r2.feeShare, 667);
});

test("computeChargebackDebt: share 0 and share 1", () => {
  assert.deepEqual(
    computeChargebackDebt({ disputedCents: 999, feeCents: 15, share: 0, alreadyPaid: true }),
    { dispShare: 0, feeShare: 0, debtShare: 0 }
  );
  assert.deepEqual(
    computeChargebackDebt({ disputedCents: 999, feeCents: 15, share: 1, alreadyPaid: true }),
    { dispShare: 999, feeShare: 15, debtShare: 999 }
  );
});

test("computeChargebackDebt: results are integers", () => {
  const r = computeChargebackDebt({ disputedCents: 777, feeCents: 1313, share: 0.37, alreadyPaid: true });
  assert.ok(Number.isInteger(r.dispShare));
  assert.ok(Number.isInteger(r.feeShare));
  assert.ok(Number.isInteger(r.debtShare));
});

test("split: reversal smaller than dispute goes entirely to dispute", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 3000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 3000, feeReversed: 0, disputeShortfall: 2000, feeAbsorbed: 750 });
});

test("split: reversal covers dispute, remainder goes to fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 5300, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 300, disputeShortfall: 0, feeAbsorbed: 450 });
});

test("split: reversal covers everything", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 5750, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 750, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("split: reversal exceeding total is capped", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 99999, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 750, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("split: zero reversal for paid artist", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 0, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 750 });
});

test("split: negative reversal counts as zero", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: -400, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 5000, feeAbsorbed: 750 });
});

test("split: unpaid artist has nothing recovered, no shortfall, platform absorbs fee", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 2000, alreadyPaid: false });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 750 });
});

test("split: unpaid with default alreadyPaid", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 5000 });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 750 });
});

test("split: exact dispute amount recovered leaves fee fully absorbed", () => {
  const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: 5000, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 5000, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 750 });
});

test("split: zero shares", () => {
  const r = splitChargebackReversal({ dispShare: 0, feeShare: 0, reversedCents: 500, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 0, feeReversed: 0, disputeShortfall: 0, feeAbsorbed: 0 });
});

test("split: conservation of amounts", () => {
  for (const reversed of [0, 1, 100, 4999, 5000, 5001, 5749, 5750, 6000]) {
    const r = splitChargebackReversal({ dispShare: 5000, feeShare: 750, reversedCents: reversed, alreadyPaid: true });
    assert.equal(r.disputeReversed + r.disputeShortfall, 5000);
    assert.equal(r.feeReversed + r.feeAbsorbed, 750);
    assert.ok(r.disputeReversed + r.feeReversed <= reversed);
  }
});

test("end to end: dispute, paid artist, partial reversal", () => {
  const d = computeChargebackDebt({ disputedCents: 6000, feeCents: 1500, share: 0.25, alreadyPaid: true });
  assert.deepEqual(d, { dispShare: 1500, feeShare: 375, debtShare: 1500 });
  const r = splitChargebackReversal({ ...d, reversedCents: 1600, alreadyPaid: true });
  assert.deepEqual(r, { disputeReversed: 1500, feeReversed: 100, disputeShortfall: 0, feeAbsorbed: 275 });
});
