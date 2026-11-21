const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { allocateDebtRecovery, sumOutstandingDebtCents } = mod;

const d = (id, amountCents, createdAt) => ({ id, amountCents, createdAt });

test("no debts: leftover is the whole amount and no actions", () => {
  assert.deepEqual(allocateDebtRecovery([], 500), { actions: [], leftover: 500 });
});

test("single debt fully covered with money to spare is recovered and leftover reported", () => {
  const r = allocateDebtRecovery([d("a", 300, "2024-01-01T00:00:00Z")], 500);
  assert.deepEqual(r, { actions: [{ id: "a", recovered: true }], leftover: 200 });
});

test("debt exactly equal to remaining amount counts as fully recovered with zero leftover", () => {
  const r = allocateDebtRecovery([d("a", 500, "2024-01-01T00:00:00Z")], 500);
  assert.deepEqual(r, { actions: [{ id: "a", recovered: true }], leftover: 0 });
});

test("debt one cent above remaining is partial (just above boundary)", () => {
  const r = allocateDebtRecovery([d("a", 501, "2024-01-01T00:00:00Z")], 500);
  assert.deepEqual(r, {
    actions: [{ id: "a", recovered: false, newAmountCents: 1, partialRecoveredCents: 500 }],
    leftover: 0,
  });
});

test("debt one cent below remaining is fully recovered with leftover 1 (just below boundary)", () => {
  const r = allocateDebtRecovery([d("a", 499, "2024-01-01T00:00:00Z")], 500);
  assert.deepEqual(r, { actions: [{ id: "a", recovered: true }], leftover: 1 });
});

test("partial recovery reduces outstanding amount, reports applied amount, nothing remains", () => {
  const r = allocateDebtRecovery([d("a", 1000, "2024-01-01T00:00:00Z")], 250);
  assert.deepEqual(r, {
    actions: [{ id: "a", recovered: false, newAmountCents: 750, partialRecoveredCents: 250 }],
    leftover: 0,
  });
  assert.equal(r.actions[0].recovered, false);
});

test("partial action is not marked recovered and has no recovered:true", () => {
  const r = allocateDebtRecovery([d("a", 1000, "2024-01-01T00:00:00Z")], 1);
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].recovered, false);
  assert.equal(r.actions[0].newAmountCents, 999);
  assert.equal(r.actions[0].partialRecoveredCents, 1);
  assert.equal(r.leftover, 0);
});

test("debts are applied oldest first by createdAt regardless of input order", () => {
  const debts = [
    d("new", 100, "2024-03-01T00:00:00Z"),
    d("old", 100, "2024-01-01T00:00:00Z"),
    d("mid", 100, "2024-02-01T00:00:00Z"),
  ];
  const r = allocateDebtRecovery(debts, 250);
  assert.deepEqual(r, {
    actions: [
      { id: "old", recovered: true },
      { id: "mid", recovered: true },
      { id: "new", recovered: false, newAmountCents: 50, partialRecoveredCents: 50 },
    ],
    leftover: 0,
  });
});

test("oldest debt wins when funds only cover one debt, newer is untouched", () => {
  const debts = [d("newer", 100, "2024-05-01T00:00:00Z"), d("older", 100, "2024-04-01T00:00:00Z")];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r, { actions: [{ id: "older", recovered: true }], leftover: 0 });
  assert.equal(r.actions.some((a) => a.id === "newer"), false);
});

test("debt with no createdAt sorts as oldest", () => {
  const debts = [
    d("dated", 100, "2020-01-01T00:00:00Z"),
    { id: "undated", amountCents: 100 },
  ];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r, { actions: [{ id: "undated", recovered: true }], leftover: 0 });
});

test("debt with null createdAt sorts as oldest", () => {
  const debts = [d("dated", 100, "2020-01-01T00:00:00Z"), d("nulled", 100, null)];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r, { actions: [{ id: "nulled", recovered: true }], leftover: 0 });
});

test("undated debt first, then dated debts in order, with partial on last", () => {
  const debts = [
    d("b", 100, "2024-02-01T00:00:00Z"),
    d("a", 100, "2024-01-01T00:00:00Z"),
    { id: "u", amountCents: 100 },
  ];
  const r = allocateDebtRecovery(debts, 250);
  assert.deepEqual(r, {
    actions: [
      { id: "u", recovered: true },
      { id: "a", recovered: true },
      { id: "b", recovered: false, newAmountCents: 50, partialRecoveredCents: 50 },
    ],
    leftover: 0,
  });
});

test("remaining amount shrinks by each fully covered debt, leftover after all paid", () => {
  const debts = [d("a", 100, "2024-01-01T00:00:00Z"), d("b", 200, "2024-01-02T00:00:00Z")];
  const r = allocateDebtRecovery(debts, 350);
  assert.deepEqual(r, {
    actions: [
      { id: "a", recovered: true },
      { id: "b", recovered: true },
    ],
    leftover: 50,
  });
});

test("multiple debts exactly consumed leave zero leftover and no partial", () => {
  const debts = [d("a", 100, "2024-01-01T00:00:00Z"), d("b", 200, "2024-01-02T00:00:00Z")];
  const r = allocateDebtRecovery(debts, 300);
  assert.deepEqual(r, {
    actions: [
      { id: "a", recovered: true },
      { id: "b", recovered: true },
    ],
    leftover: 0,
  });
});

test("after a partial, later debts are not touched", () => {
  const debts = [
    d("a", 100, "2024-01-01T00:00:00Z"),
    d("b", 200, "2024-01-02T00:00:00Z"),
    d("c", 300, "2024-01-03T00:00:00Z"),
  ];
  const r = allocateDebtRecovery(debts, 150);
  assert.deepEqual(r, {
    actions: [
      { id: "a", recovered: true },
      { id: "b", recovered: false, newAmountCents: 150, partialRecoveredCents: 50 },
    ],
    leftover: 0,
  });
  assert.equal(r.actions.some((a) => a.id === "c"), false);
});

test("zero recovered amount causes no actions", () => {
  const r = allocateDebtRecovery([d("a", 100, "2024-01-01T00:00:00Z")], 0);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("negative recovered amount counts as 0, no actions", () => {
  const r = allocateDebtRecovery([d("a", 100, "2024-01-01T00:00:00Z")], -500);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("negative recovered amount of -1 counts as 0", () => {
  const r = allocateDebtRecovery([d("a", 100, "2024-01-01T00:00:00Z")], -1);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("non-numeric recovered amounts count as 0, no actions", () => {
  for (const bad of ["abc", NaN, undefined, null, {}]) {
    const r = allocateDebtRecovery([d("a", 100, "2024-01-01T00:00:00Z")], bad);
    assert.deepEqual(r.actions, [], String(bad));
    assert.equal(r.leftover, 0, String(bad));
  }
});

test("non-numeric recovered amount with no debts gives leftover 0", () => {
  const r = allocateDebtRecovery([], "abc");
  assert.deepEqual(r, { actions: [], leftover: 0 });
});

test("negative recovered amount with no debts gives leftover 0", () => {
  const r = allocateDebtRecovery([], -100);
  assert.deepEqual(r, { actions: [], leftover: 0 });
});

test("zero recovered with no debts gives leftover 0", () => {
  assert.deepEqual(allocateDebtRecovery([], 0), { actions: [], leftover: 0 });
});

test("negative debt amount counts as 0 so whole recovered amount is leftover", () => {
  const r = allocateDebtRecovery([d("a", -100, "2024-01-01T00:00:00Z")], 100);
  assert.equal(r.leftover, 100);
  assert.equal(r.actions.some((a) => a.recovered === false), false);
});

test("non-numeric debt amount counts as 0 so whole recovered amount is leftover", () => {
  const r = allocateDebtRecovery([d("a", "oops", "2024-01-01T00:00:00Z")], 100);
  assert.equal(r.leftover, 100);
  assert.equal(r.actions.some((a) => a.recovered === false), false);
});

test("negative-amount older debt does not consume funds meant for a later real debt", () => {
  const debts = [d("bad", -50, "2024-01-01T00:00:00Z"), d("real", 100, "2024-01-02T00:00:00Z")];
  const r = allocateDebtRecovery(debts, 100);
  assert.equal(r.leftover, 0);
  assert.equal(r.actions.some((a) => a.id === "real" && a.recovered === true), true);
});

test("input list is not modified (order and contents)", () => {
  const debts = [
    d("new", 100, "2024-03-01T00:00:00Z"),
    d("old", 100, "2024-01-01T00:00:00Z"),
    d("part", 500, "2024-02-01T00:00:00Z"),
  ];
  const snapshot = JSON.parse(JSON.stringify(debts));
  const refs = debts.slice();
  allocateDebtRecovery(debts, 250);
  assert.deepEqual(debts, snapshot);
  assert.equal(debts.length, 3);
  debts.forEach((x, i) => assert.equal(x, refs[i]));
  assert.equal(debts[2].amountCents, 500);
});

test("input list is not modified when debts are fully recovered", () => {
  const debts = [d("a", 100, "2024-01-01T00:00:00Z")];
  const snapshot = JSON.parse(JSON.stringify(debts));
  allocateDebtRecovery(debts, 1000);
  assert.deepEqual(debts, snapshot);
});

test("sumOutstandingDebtCents sums amounts", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: 250 }, { amountCents: 1 }]), 351);
});

test("sumOutstandingDebtCents counts negative amounts as 0", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: -50 }]), 100);
});

test("sumOutstandingDebtCents counts non-numeric amounts as 0", () => {
  assert.equal(
    sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: "abc" }, { amountCents: null }, { amountCents: undefined }, {}]),
    100
  );
});

test("sumOutstandingDebtCents returns 0 for a missing list", () => {
  assert.equal(sumOutstandingDebtCents(undefined), 0);
  assert.equal(sumOutstandingDebtCents(null), 0);
});

test("sumOutstandingDebtCents returns 0 for an empty list", () => {
  assert.equal(sumOutstandingDebtCents([]), 0);
});

test("sumOutstandingDebtCents with only negative amounts is 0", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: -1 }, { amountCents: -1000 }]), 0);
});

test("sumOutstandingDebtCents with a zero amount contributes 0", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: 0 }, { amountCents: 7 }]), 7);
});
