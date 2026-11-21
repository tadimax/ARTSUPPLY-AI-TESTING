const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/moneyMath");

const { allocateDebtRecovery, sumOutstandingDebtCents } = mod;

test("oldest debt by createdAt is recovered first regardless of input order", () => {
  const debts = [
    { id: "new", amountCents: 100, createdAt: "2024-03-01T00:00:00.000Z" },
    { id: "old", amountCents: 100, createdAt: "2024-01-01T00:00:00.000Z" },
    { id: "mid", amountCents: 100, createdAt: "2024-02-01T00:00:00.000Z" },
  ];
  const r = allocateDebtRecovery(debts, 200);
  assert.deepEqual(r.actions, [
    { id: "old", recovered: true },
    { id: "mid", recovered: true },
  ]);
  assert.equal(r.leftover, 0);
});

test("debts with no createdAt sort as the oldest", () => {
  const debts = [
    { id: "dated", amountCents: 100, createdAt: "2020-01-01T00:00:00.000Z" },
    { id: "undated", amountCents: 100 },
  ];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r.actions, [{ id: "undated", recovered: true }]);
  assert.equal(r.leftover, 0);
});

test("null createdAt sorts as the oldest too", () => {
  const debts = [
    { id: "dated", amountCents: 100, createdAt: "2020-01-01T00:00:00.000Z" },
    { id: "nullDate", amountCents: 100, createdAt: null },
  ];
  const r = allocateDebtRecovery(debts, 100);
  assert.deepEqual(r.actions, [{ id: "nullDate", recovered: true }]);
  assert.equal(r.leftover, 0);
});

test("fully covered debt is marked recovered and remaining shrinks, leftover reported", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" }],
    1000
  );
  assert.deepEqual(r.actions, [{ id: "a", recovered: true }]);
  assert.equal(r.leftover, 700);
});

test("remaining shrinks by each recovered debt across several debts", () => {
  const r = allocateDebtRecovery(
    [
      { id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "b", amountCents: 400, createdAt: "2024-01-02T00:00:00.000Z" },
      { id: "c", amountCents: 500, createdAt: "2024-01-03T00:00:00.000Z" },
    ],
    1000
  );
  assert.deepEqual(r.actions, [
    { id: "a", recovered: true },
    { id: "b", recovered: true },
    { id: "c", recovered: false, newAmountCents: 200, partialRecoveredCents: 300 },
  ]);
  assert.equal(r.leftover, 0);
});

test("partial coverage: not recovered, newAmountCents reduced, partialRecoveredCents reported, nothing remains", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 1000, createdAt: "2024-01-01T00:00:00.000Z" }],
    400
  );
  assert.deepEqual(r.actions, [
    { id: "a", recovered: false, newAmountCents: 600, partialRecoveredCents: 400 },
  ]);
  assert.equal(r.leftover, 0);
});

test("partial after a full recovery: remaining after first debt is applied to second", () => {
  const r = allocateDebtRecovery(
    [
      { id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "b", amountCents: 500, createdAt: "2024-01-02T00:00:00.000Z" },
    ],
    600
  );
  assert.deepEqual(r.actions, [
    { id: "a", recovered: true },
    { id: "b", recovered: false, newAmountCents: 200, partialRecoveredCents: 300 },
  ]);
  assert.equal(r.leftover, 0);
});

test("partial coverage with the oldest debt first: newer debts untouched", () => {
  const r = allocateDebtRecovery(
    [
      { id: "newer", amountCents: 500, createdAt: "2024-02-01T00:00:00.000Z" },
      { id: "older", amountCents: 500, createdAt: "2024-01-01T00:00:00.000Z" },
    ],
    200
  );
  assert.deepEqual(r.actions, [
    { id: "older", recovered: false, newAmountCents: 300, partialRecoveredCents: 200 },
  ]);
  assert.equal(r.leftover, 0);
});

test("boundary: debt one cent above remaining is partial", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 501, createdAt: "2024-01-01T00:00:00.000Z" }],
    500
  );
  assert.deepEqual(r.actions, [
    { id: "a", recovered: false, newAmountCents: 1, partialRecoveredCents: 500 },
  ]);
  assert.equal(r.leftover, 0);
});

test("boundary: debt exactly equal to remaining counts as fully recovered", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 500, createdAt: "2024-01-01T00:00:00.000Z" }],
    500
  );
  assert.deepEqual(r.actions, [{ id: "a", recovered: true }]);
  assert.equal(r.leftover, 0);
});

test("boundary: debt one cent below remaining is fully recovered with 1 leftover", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 499, createdAt: "2024-01-01T00:00:00.000Z" }],
    500
  );
  assert.deepEqual(r.actions, [{ id: "a", recovered: true }]);
  assert.equal(r.leftover, 1);
});

test("exact equality on the second debt after the first is recovered", () => {
  const r = allocateDebtRecovery(
    [
      { id: "a", amountCents: 200, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "b", amountCents: 300, createdAt: "2024-01-02T00:00:00.000Z" },
    ],
    500
  );
  assert.deepEqual(r.actions, [
    { id: "a", recovered: true },
    { id: "b", recovered: true },
  ]);
  assert.equal(r.leftover, 0);
});

test("no debts: leftover is the whole amount and no actions", () => {
  const r = allocateDebtRecovery([], 1234);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 1234);
});

test("zero recovered amount: no actions occur", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" }],
    0
  );
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("negative recovered amount counts as 0: no actions, leftover 0", () => {
  const r = allocateDebtRecovery(
    [{ id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" }],
    -500
  );
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("non-numeric recovered amount counts as 0: no actions, leftover 0", () => {
  for (const bad of ["abc", NaN, undefined, null, {}]) {
    const r = allocateDebtRecovery(
      [{ id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" }],
      bad
    );
    assert.deepEqual(r.actions, []);
    assert.equal(r.leftover, 0);
  }
});

test("negative recovered amount with no debts gives leftover 0", () => {
  const r = allocateDebtRecovery([], -100);
  assert.deepEqual(r.actions, []);
  assert.equal(r.leftover, 0);
});

test("negative debt amount counts as 0 and does not reduce what is applied to a real debt", () => {
  const r = allocateDebtRecovery(
    [
      { id: "neg", amountCents: -500, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "real", amountCents: 300, createdAt: "2024-01-02T00:00:00.000Z" },
    ],
    1000
  );
  assert.equal(r.leftover, 700);
  const real = r.actions.find((a) => a.id === "real");
  assert.deepEqual(real, { id: "real", recovered: true });
});

test("non-numeric debt amount counts as 0 and does not reduce what is applied to a real debt", () => {
  const r = allocateDebtRecovery(
    [
      { id: "bad", amountCents: "lots", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "real", amountCents: 300, createdAt: "2024-01-02T00:00:00.000Z" },
    ],
    1000
  );
  assert.equal(r.leftover, 700);
  const real = r.actions.find((a) => a.id === "real");
  assert.deepEqual(real, { id: "real", recovered: true });
});

test("only a negative debt: whole amount is leftover", () => {
  const r = allocateDebtRecovery(
    [{ id: "neg", amountCents: -50, createdAt: "2024-01-01T00:00:00.000Z" }],
    400
  );
  assert.equal(r.leftover, 400);
  assert.ok(!r.actions.some((a) => a.recovered === false));
});

test("input list and its debts are not modified", () => {
  const debts = [
    { id: "b", amountCents: 500, createdAt: "2024-02-01T00:00:00.000Z" },
    { id: "a", amountCents: 300, createdAt: "2024-01-01T00:00:00.000Z" },
  ];
  const snapshot = JSON.parse(JSON.stringify(debts));
  allocateDebtRecovery(debts, 600);
  assert.deepEqual(debts, snapshot);
  assert.equal(debts[0].id, "b");
  assert.equal(debts[1].id, "a");
});

test("partial recovery does not mutate the original debt amount", () => {
  const debts = [{ id: "a", amountCents: 1000, createdAt: "2024-01-01T00:00:00.000Z" }];
  allocateDebtRecovery(debts, 250);
  assert.equal(debts[0].amountCents, 1000);
  assert.equal(debts[0].recovered, undefined);
});

test("sumOutstandingDebtCents sums amountCents", () => {
  assert.equal(
    sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: 250 }, { amountCents: 1 }]),
    351
  );
});

test("sumOutstandingDebtCents counts negative amounts as 0", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: 100 }, { amountCents: -400 }]), 100);
});

test("sumOutstandingDebtCents counts non-numeric amounts as 0", () => {
  assert.equal(
    sumOutstandingDebtCents([
      { amountCents: 100 },
      { amountCents: "abc" },
      { amountCents: undefined },
      { amountCents: null },
      {},
    ]),
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

test("sumOutstandingDebtCents zero amount contributes 0", () => {
  assert.equal(sumOutstandingDebtCents([{ amountCents: 0 }, { amountCents: 7 }]), 7);
});
