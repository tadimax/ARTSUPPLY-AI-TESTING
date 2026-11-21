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
  assert.equal(mod.tierBps("bogus", 15000), 15000);
});

test("pctFeeCents default rate", () => {
  assert.equal(mod.pctFeeCents(1000), 209);
  assert.equal(mod.pctFeeCents(100), 21);
  assert.equal(mod.pctFeeCents(0), 0);
});

test("pctFeeCents tier rates", () => {
  assert.equal(mod.pctFeeCents(1000, 12000), 149);
  assert.equal(mod.pctFeeCents(1000, 10000), 129);
});

test("pctFeeCents rounds each part separately", () => {
  // 17 * 18% = 3.06 -> 3 ; 17 * 2.9% = 0.493 -> 0 ; total 3 (combined rounding would give 4)
  assert.equal(mod.pctFeeCents(17), 3);
  // 333: 59.94 -> 60 ; 9.657 -> 10
  assert.equal(mod.pctFeeCents(333), 70);
});

test("unitFeeCents adds 30 cents for positive price", () => {
  assert.equal(mod.unitFeeCents(1000), 239);
  assert.equal(mod.unitFeeCents(1000, 12000), 179);
  assert.equal(mod.unitFeeCents(1000, 10000), 159);
  assert.equal(mod.unitFeeCents(1), 30);
});

test("unitFeeCents is zero for zero or negative price", () => {
  assert.equal(mod.unitFeeCents(0), 0);
  assert.equal(mod.unitFeeCents(-500), 0);
});

test("buyerUnitCents is price plus unit fee", () => {
  assert.equal(mod.buyerUnitCents(1000), 1239);
  assert.equal(mod.buyerUnitCents(1000, 12000), 1179);
  assert.equal(mod.buyerUnitCents(1000, 10000), 1159);
  assert.equal(mod.buyerUnitCents(1), 31);
});

test("buyerUnitCents treats zero and negative as zero", () => {
  assert.equal(mod.buyerUnitCents(0), 0);
  assert.equal(mod.buyerUnitCents(-100), 0);
});

test("orderFeeCents single line equals unit fee", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]), 239);
});

test("orderFeeCents charges 30 cents once across lines, qty multiplies pct only", () => {
  const lines = [
    { unitCents: 1000, quantity: 1, bps: 18000 },
    { unitCents: 2000, quantity: 3, bps: 12000 },
  ];
  // 209 + 298*3 + 30
  assert.equal(mod.orderFeeCents(lines), 1133);
});

test("orderFeeCents quantity multiplies pct fee but not the fixed cents", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 5, bps: 18000 }]), 209 * 5 + 30);
});

test("orderFeeCents missing or zero quantity counts as 1", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, bps: 18000 }]), 239);
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 0, bps: 18000 }]), 239);
});

test("orderFeeCents zero-priced lines add no fee, and no fixed cents if all zero", () => {
  assert.equal(mod.orderFeeCents([]), 0);
  assert.equal(mod.orderFeeCents([{ unitCents: 0, quantity: 2, bps: 18000 }]), 0);
  assert.equal(
    mod.orderFeeCents([
      { unitCents: 0, quantity: 1, bps: 18000 },
      { unitCents: -50, quantity: 1, bps: 18000 },
    ]),
    0
  );
});

test("orderFeeCents free line alongside paid line still charges 30 once", () => {
  const lines = [
    { unitCents: 0, quantity: 4, bps: 18000 },
    { unitCents: 1000, quantity: 1, bps: 18000 },
  ];
  assert.equal(mod.orderFeeCents(lines), 239);
});

test("orderFeeCents uses default bps when line bps missing", () => {
  assert.equal(mod.orderFeeCents([{ unitCents: 1000, quantity: 1 }]), 239);
});
