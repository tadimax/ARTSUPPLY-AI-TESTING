const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

test("constants", () => {
  assert.equal(mod.DEFAULT_BPS, 18000);
  assert.equal(mod.CARD_BPS, 2900);
  assert.equal(mod.ORDER_FIXED_CENTS, 30);
  assert.equal(mod.TIER_BPS.pro, 12000);
  assert.equal(mod.TIER_BPS.power, 10000);
});

test("tierBps maps known tiers", () => {
  assert.equal(mod.tierBps("pro"), 12000);
  assert.equal(mod.tierBps("power"), 10000);
  assert.equal(mod.tierBps("default"), 18000);
});

test("tierBps falls back to default for unknown or missing tier", () => {
  assert.equal(mod.tierBps("gold"), 18000);
  assert.equal(mod.tierBps(undefined), 18000);
  assert.equal(mod.tierBps(null), 18000);
  assert.equal(mod.tierBps(""), 18000);
});

test("tierBps honours custom default", () => {
  assert.equal(mod.tierBps("unknown", 15000), 15000);
  assert.equal(mod.tierBps(undefined, 15000), 15000);
  assert.equal(mod.tierBps("pro", 15000), 12000);
});

test("pctFeeCents sums platform and card parts", () => {
  assert.equal(mod.pctFeeCents(1000), 209);
  assert.equal(mod.pctFeeCents(1000, 12000), 12000 / 100 * 10 / 10 * 1 + 29 + 120 - 120);
  assert.equal(mod.pctFeeCents(1000, 10000), 129);
  assert.equal(mod.pctFeeCents(100), 21);
});

test("pctFeeCents rounds each part separately", () => {
  // 3 cents: 0.54 -> 1, 0.087 -> 0
  assert.equal(mod.pctFeeCents(3), 1);
  // 1 cent: both parts round to 0
  assert.equal(mod.pctFeeCents(1), 0);
  // 400: 72 + 11.6 -> 12
  assert.equal(mod.pctFeeCents(400), 84);
});

test("pctFeeCents is zero for zero price", () => {
  assert.equal(mod.pctFeeCents(0), 0);
});

test("unitFeeCents adds 30 cents", () => {
  assert.equal(mod.unitFeeCents(1000), 239);
  assert.equal(mod.unitFeeCents(2000, 12000), 328);
  assert.equal(mod.unitFeeCents(1000, 10000), 159);
  assert.equal(mod.unitFeeCents(1), 30);
  assert.equal(mod.unitFeeCents(50), 40);
});

test("unitFeeCents is zero for zero or negative price", () => {
  assert.equal(mod.unitFeeCents(0), 0);
  assert.equal(mod.unitFeeCents(-500), 0);
});

test("buyerUnitCents is price plus fee", () => {
  assert.equal(mod.buyerUnitCents(1000), 1239);
  assert.equal(mod.buyerUnitCents(2000, 12000), 2328);
  assert.equal(mod.buyerUnitCents(1000, 10000), 1159);
});

test("buyerUnitCents treats zero and negative as zero", () => {
  assert.equal(mod.buyerUnitCents(0), 0);
  assert.equal(mod.buyerUnitCents(-100), 0);
});

test("orderFeeCents single line", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]), 239);
});

test("orderFeeCents quantity multiplies only the percentage fee", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 2, bps: 18000 }]), 448);
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 3, bps: 18000 }]), 657);
});

test("orderFeeCents adds 30 cents once across lines", () => {
  const lines = [
    { unitCents: 1000, quantity: 2, bps: 18000 },
    { unitCents: 400, quantity: 1, bps: 18000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 418 + 84 + 30);
});

test("orderFeeCents missing or zero quantity counts as 1", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, bps: 18000 }]), 239);
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 0, bps: 18000 }]), 239);
});

test("orderFeeCents ignores zero-price lines but charges 30 if another is positive", () => {
  const lines = [
    { unitCents: 0, quantity: 5, bps: 18000 },
    { unitCents: 1000, quantity: 1, bps: 18000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 239);
});

test("orderFeeCents is zero when no line has a positive price", () => {
  assert.equal(mod.orderFeeCents([]), 0);
  assert.equal(mod.orderFeeCents([{ unitCents: 0, quantity: 2, bps: 18000 }]), 0);
  assert.equal(mod.orderFeeCents([{ unitCents: -100, quantity: 1, bps: 18000 }]), 0);
});

test("orderFeeCents uses each line's own bps", () => {
  const lines = [
    { unitCents: 1000, quantity: 1, bps: 12000 },
    { unitCents: 1000, quantity: 1, bps: 10000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 149 + 129 + 30);
});
