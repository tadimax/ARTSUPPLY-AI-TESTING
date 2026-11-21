const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { allocateDebtRecovery, sumOutstandingDebtCents } = mod;

test("no debts: leftover is the whole amount", () => {
  const r = allocateDebtRecovery([], 500);
  assert.deepEqual(r, { actions: [], leftover: 500 });
});

test("single debt fully covered with leftover", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00Z" }], 500);
  assert.deepEqual(r.actions, [{ id: "a", recovered: true }]);
  assert.equal(r.leftover, 200);
});

test("debt exactly equal to remaining is fully recovered", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 500, createdAt: "2024-01-01T00:00:00Z" }], 500);
  assert.deepEqual(r.actions, [{ id: "a", recovered: true }]);
  assert.equal(r.leftover, 0);
});

test("partial coverage reports new amount and applied amount, nothing remains", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 800, createdAt: "2024-01-01T00:00:00Z" }], 300);
  assert.deepEqual(r.actions, [{ id: "a", recovered: false, newAmountCents: 500, partialRecoveredCents: 300 }]);
  assert.equal(r.leftover, 0);
});

test("oldest first regardless of input order", () => {
  const debts = [
    { id: "new", amountCents: 100, createdAt: "2024-03-01T00:00:00Z" },
    { id: "old", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "mid", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 200);
  assert.deepEqual(r.actions, [
    { id: "old", recovered: true },
    { id: "mid", recovered: true },
  ]);
  assert.equal(r.leftover, 0);
});

test("multiple debts, last one partial", () => {
  const debts = [
    { id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "b", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
    { id: "c", amountCents: 100, createdAt: "2024-03-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 250);
  assert.deepEqual(r.actions, [
    { id: "a", recovered: true },
    { id: "b", recovered: true },
    { id: "c", recovered: false, newAmountCents: 50, partialRecoveredCents: 50 },
  ]);
  assert.equal(r.leftover, 0);
});

test("all debts paid and money left over", () => {
  const debts = [
    { id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "b", amountCents: 50, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 1000);
  assert.equal(r.actions.length, 2);
  assert.equal(r.leftover, 850);
});

test("debts without createdAt sort as oldest", () => {
  const debts = [
    { id: "dated", amountCents: 100, createdAt: "2020-01-01T00:00:00Z" },
    { id: "undated", amountCents: 100 },
  ];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r.actions, [{ id: "undated", recovered: true }]);
  assert.equal(r.leftover, 0);
});

test("negative recovered amount means no actions", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" }], -50);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("non-numeric recovered amount means no actions", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" }], "abc");
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("zero recovered amount means no actions", () => {
  const r = allocateDebtRecovery([{ id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" }], 0);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("negative debt amount counts as zero and does not consume money", () => {
  const debts = [
    { id: "neg", amountCents: -100, createdAt: "2024-01-01T00:00:00Z" },
    { id: "b", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
  ];
  const r = allocateDebtRecovery(debts, 150);
  const b = r.actions.find((x) => x.id === "b");
  assert.deepEqual(b, { id: "b", recovered: true });
  assert.equal(r.leftover, 50);
});

test("non-numeric debt amount counts as zero", () => {
  const debts = [{ id: "x", amountCents: "oops", createdAt: "2024-01-01T00:00:00Z" }];
  const r = allocateDebtRecovery(debts, 80);
  assert.equal(r.leftover, 80);
  for (const a of r.actions) {
    if (a.id === "x") assert.equal(a.recovered, true);
  }
});

test("input list is not modified", () => {
  const debts = [
    { id: "b", amountCents: 100, createdAt: "2024-02-01T00:00:00Z" },
    { id: "a", amountCents: 100, createdAt: "2024-01-01T00:00:00Z" },
  ];
  const copy = JSON.parse(JSON.stringify(debts));
  allocateDebtRecovery(debts, 150);
  assert.deepEqual(debts, copy);
});

test("sumOutstandingDebtCents sums amounts", () => {
  assert.equal(
    sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: 250 }]),
    350
  );
});

test("sumOutstandingDebtCents treats negative and non-numeric as 0", () => {
  assert.equal(
    sumOutstandingDebtCents([{ amountCents: -100 }, { amountCents: "x" }, { amountCents: 40 }, {}]),
    40
  );
});

test("sumOutstandingDebtCents returns 0 for missing list", () => {
  assert.equal(sumOutstandingDebtCents(undefined), 0);
  assert.equal(sumOutstandingDebtCents(null), 0);
  assert.equal(sumOutstandingDebtCents([]), 0);
});
