const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { allocateDebtRecovery, sumOutstandingDebtCents } = mod;

test("no debts: leftover is the whole amount and no actions", () => {
  assert.deepEqual(allocateDebtRecovery([], 500), { actions: [], leftover: 500 });
});

test("single debt fully covered is marked recovered with leftover reported", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00Z" }], 500);
  assert.deepEqual(r, { actions: [{ id: "a", recovered: true }], leftover: 200 });
});

test("debt exactly equal to remaining amount counts as fully recovered", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 500, createdAt: "2024-01-01T00:00:00Z" }], 500);
  assert.deepEqual(r, { actions: [{ id: "a", recovered: true }], leftover: 0 });
});

test("debt one cent above remaining is partial, not recovered, nothing remains", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 501, createdAt: "2024-01-01T00:00:00Z" }], 500);
  assert.deepEqual(r, {
    actions: [{ id: "a", recovered: false, newAmountCents: 1, partialRecoveredCents: 500 }],
    leftover: 0,
  });
});

test("debt one cent below remaining is fully recovered with 1 cent leftover", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 499, createdAt: "2024-01-01T00:00:00Z" }], 500);
  assert.deepEqual(r, { actions: [{ id: "a", recovered: true }], leftover: 1 });
});

test("partial recovery reports newAmountCents and partialRecoveredCents", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 1000, createdAt: "2024-01-01T00:00:00Z" }], 250);
  assert.deepEqual(r, {
    actions: [{ id: "a", recovered: false, newAmountCents: 750, partialRecoveredCents: 250 }],
    leftover: 0,
  });
});

test("debts are applied oldest first by createdAt regardless of input order", () => {
  const debts = [
    { id: "new", amountCents: 100, createdAt: "2024-03-01T00:00:00Z" },
    { id: "old", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "mid", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 200);
  assert.deepEqual(r, {
    actions: [
      { id: "old", recovered: true },
      { id: "mid", recovered: true },
    ],
    leftover: 0,
  });
});

test("oldest debt is the one partly paid when money runs out", () => {
  const debts = [
    { id: "new", amountCents: 100, createdAt: "2024-03-01T00:00:00Z" },
    { id: "old", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 50);
  assert.deepEqual(r, {
    actions: [{ id: "old", recovered: false, newAmountCents: 50, partialRecoveredCents: 50 }],
    leftover: 0,
  });
});

test("full recovery then partial on the next debt, nothing remains", () => {
  const debts = [
    { id: "b", amountCents: 400, createdAt: "2024-02-01T00:00:00Z" },
    { id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 500);
  assert.deepEqual(r, {
    actions: [
      { id: "a", recovered: true },
      { id: "b", recovered: false, newAmountCents: 200, partialRecoveredCents: 200 },
    ],
    leftover: 0,
  });
});

test("all debts paid with money remaining reports leftover", () => {
  const debts = [
    { id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "b", amountCents: 200, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 1000);
  assert.deepEqual(r, {
    actions: [
      { id: "a", recovered: true },
      { id: "b", recovered: true },
    ],
    leftover: 700,
  });
});

test("debts with no createdAt sort as the oldest", () => {
  const debts = [
    { id: "dated", amountCents: 100, createdAt: "2020-01-01T00:00:00Z" },
    { id: "undated", amountCents: 100 },
  ];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r, { actions: [{ id: "undated", recovered: true }], leftover: 0 });
});

test("debt with null createdAt sorts as the oldest", () => {
  const debts = [
    { id: "dated", amountCents: 100, createdAt: "2020-01-01T00:00:00Z" },
    { id: "nulled", amountCents: 100, createdAt: null },
  ];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r, { actions: [{ id: "nulled", recovered: true }], leftover: 0 });
});

test("zero recovered amount causes no actions", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" }], 0);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("negative recovered amount counts as 0 so no actions occur", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" }], -50);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("non-numeric recovered amount counts as 0 so no actions occur", () => {
  for (const bad of ["abc", undefined, null, NaN]) {
    const r = allocateDebtRecovery([{ id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" }], bad);
    assert.deepEqual(r.actions, [], String(bad));
    assert.equal(r.leftover, 0, String(bad));
  }
});

test("negative debt amount counts as 0 and is not partially applied", () => {
  const debts = [
    { id: "neg", amountCents: -100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "pos", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 100);
  const pos = r.actions.find((a) => a.id === "pos");
  assert.deepEqual(pos, { id: "pos", recovered: true });
  const neg = r.actions.find((a) => a.id === "neg");
  if (neg) assert.deepEqual(neg, { id: "neg", recovered: true });
  assert.equal(r.leftover, 0);
});

test("non-numeric debt amount counts as 0 and does not consume money", () => {
  const debts = [
    { id: "bad", amountCents: "xyz", createdAt: "2024-01-01T00:00:00Z" },
    { id: "pos", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 100);
  const pos = r.actions.find((a) => a.id === "pos");
  assert.deepEqual(pos, { id: "pos", recovered: true });
  assert.equal(r.leftover, 0);
});

test("input list and its debts are not modified or reordered", () => {
  const debts = [
    { id: "b", amountCents: 400, createdAt: "2024-02-01T00:00:00Z" },
    { id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00Z" },
  ];
  const copy = JSON.parse(JSON.stringify(debts));
  allocateDebtRecovery(debts, 500);
  assert.deepEqual(debts, copy);
  assert.equal(debts[0].id, "b");
  assert.equal(debts[1].id, "a");
});

test("sumOutstandingDebtCents sums amountCents", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: 250 }, { amountCents: 1 }]), 351);
});

test("sumOutstandingDebtCents counts negative amounts as 0", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: -500 }, { amountCents: 200 }]), 200);
});

test("sumOutstandingDebtCents counts non-numeric amounts as 0", () => {
  assert.equal(
    sumOutstandingDebtCents([{ amountCents: "abc" }, { amountCents: undefined }, { amountCents: null }, { amountCents: 70 }]),
    70
  );
});

test("sumOutstandingDebtCents returns 0 for a missing list", () => {
  assert.equal(sumOutstandingDebtCents(undefined), 0);
  assert.equal(sumOutstandingDebtCents(null), 0);
});

test("sumOutstandingDebtCents returns 0 for an empty list", () => {
  assert.equal(sumOutstandingDebtCents([]), 0);
});
