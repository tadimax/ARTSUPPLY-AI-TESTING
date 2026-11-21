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

test("tierBps maps tiers and falls back to default", () => {
  assert.equal(mod.tierBps("pro"), 12000);
  assert.equal(mod.tierBps("power"), 10000);
  assert.equal(mod.tierBps("default"), 18000);
  assert.equal(mod.tierBps("unknown"), 18000);
  assert.equal(mod.tierBps(undefined), 18000);
  assert.equal(mod.tierBps(null), 18000);
  assert.equal(mod.tierBps("gold", 15000), 15000);
  assert.equal(mod.tierBps(undefined, 15000), 15000);
  assert.equal(mod.tierBps("pro", 15000), 12000);
});

test("pctFeeCents default rate", () => {
  assert.equal(mod.pctFeeCents(1000), 209);
  assert.equal(mod.pctFeeCents(10000), 2090);
});

test("pctFeeCents with tier rates", () => {
  assert.equal(mod.pctFeeCents(1000, 12000), 149);
  assert.equal(mod.pctFeeCents(1000, 10000), 129);
});

test("pctFeeCents rounds each part separately", () => {
  // 1050: 18% = 189, 2.9% = 30.45 -> 30
  assert.equal(mod.pctFeeCents(1050), 219);
  // 250: 45 + 7.25 -> 7
  assert.equal(mod.pctFeeCents(250), 52);
  // 50 at 10%: 5 + 1.45 -> 1
  assert.equal(mod.pctFeeCents(50, 10000), 6);
  // 600: 108 + 17.4 -> 17
  assert.equal(mod.pctFeeCents(600), 125);
});

test("pctFeeCents tiny unit", () => {
  assert.equal(mod.pctFeeCents(1), 0);
});

test("unitFeeCents adds the 30 cents for positive units", () => {
  assert.equal(mod.unitFeeCents(1000), 239);
  assert.equal(mod.unitFeeCents(1000, 12000), 179);
  assert.equal(mod.unitFeeCents(1000, 10000), 159);
  assert.equal(mod.unitFeeCents(1), 30);
});

test("unitFeeCents is zero for zero or negative units", () => {
  assert.equal(mod.unitFeeCents(0), 0);
  assert.equal(mod.unitFeeCents(-500), 0);
});

test("buyerUnitCents is price plus fee", () => {
  assert.equal(mod.buyerUnitCents(1000), 1239);
  assert.equal(mod.buyerUnitCents(10000), 12120);
  assert.equal(mod.buyerUnitCents(1000, 12000), 1179);
  assert.equal(mod.buyerUnitCents(1), 31);
});

test("buyerUnitCents treats zero and negative as zero", () => {
  assert.equal(mod.buyerUnitCents(0), 0);
  assert.equal(mod.buyerUnitCents(-100), 0);
});

test("orderFeeCents single line", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]), 239);
});

test("orderFeeCents quantity multiplies only the percentage fee", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 3, bps: 18000 }]), 3 * 209 + 30);
});

test("orderFeeCents missing or zero quantity counts as 1", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, bps: 18000 }]), 239);
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 0, bps: 18000 }]), 239);
});

test("orderFeeCents multi-line adds 30 cents once", () => {
  const lines = [
    { unitCents: 1000, quantity: 2, bps: 18000 },
    { unitCents: 600, quantity: 1, bps: 18000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 418 + 125 + 30);
});

test("orderFeeCents uses per-line rates", () => {
  const lines = [
    { unitCents: 1000, quantity: 1, bps: 12000 },
    { unitCents: 1000, quantity: 1, bps: 10000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 149 + 129 + 30);
});

test("orderFeeCents ignores zero-price lines but still charges 30 if another line is positive", () => {
  const lines = [
    { unitCents: 0, quantity: 5, bps: 18000 },
    { unitCents: 1000, quantity: 1, bps: 18000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 239);
});

test("orderFeeCents is zero when no line has a positive price", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 0, quantity: 2, bps: 18000 }]), 0);
  assert.equal(mod.orderFeeCents([{ unitCents: -100, quantity: 1, bps: 18000 }]), 0);
  assert.equal(mod.orderFeeCents([]), 0);
});
