const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const {
  tierBps, pctFeeCents, unitFeeCents, buyerUnitCents, orderFeeCents,
  DEFAULT_BPS, TIER_BPS, CARD_BPS, ORDER_FIXED_CENTS,
} = mod;

// ---------- constants ----------
test("constants: default, card, fixed fee values", () => {
  assert.equal(DEFAULT_BPS, 18000);
  assert.equal(CARD_BPS, 2900);
  assert.equal(ORDER_FIXED_CENTS, 30);
});

test("constants: TIER_BPS holds pro and power rates", () => {
  assert.equal(TIER_BPS.pro, 12000);
  assert.equal(TIER_BPS.power, 10000);
});

// ---------- tierBps ----------
test("tierBps: pro is 12000", () => assert.equal(tierBps("pro"), 12000));
test("tierBps: power is 10000", () => assert.equal(tierBps("power"), 10000));
test("tierBps: unknown tier gets default 18000", () => assert.equal(tierBps("gold"), 18000));
test("tierBps: missing tier gets default 18000", () => {
  assert.equal(tierBps(undefined), 18000);
  assert.equal(tierBps(null), 18000);
});
test("tierBps: custom default used for unknown and missing tiers", () => {
  assert.equal(tierBps("gold", 15000), 15000);
  assert.equal(tierBps(undefined, 15000), 15000);
  assert.equal(tierBps(null, 15000), 15000);
});
test("tierBps: custom default does not change pro or power", () => {
  assert.equal(tierBps("pro", 15000), 12000);
  assert.equal(tierBps("power", 15000), 10000);
});

// ---------- pctFeeCents: platform + card, no 30 cents ----------
test("pctFeeCents: default rate on 1000 is 180 + 29 = 209, no fixed 30", () => {
  assert.equal(pctFeeCents(1000), 209);
  assert.equal(pctFeeCents(1000, 18000), 209);
});
test("pctFeeCents: pro rate on 1000 is 120 + 29 = 149", () => assert.equal(pctFeeCents(1000, 12000), 149));
test("pctFeeCents: power rate on 1000 is 100 + 29 = 129", () => assert.equal(pctFeeCents(1000, 10000), 129));
test("pctFeeCents: zero price has zero percentage fee", () => assert.equal(pctFeeCents(0), 0));

// rounding: each part rounded separately
test("pctFeeCents: parts rounded separately, pro unit 4 (0.48 + 0.116) is 0 not 1", () => {
  assert.equal(pctFeeCents(4, 12000), 0);
});
test("pctFeeCents: power unit 4 (0.4 + 0.116) is 0", () => {
  assert.equal(pctFeeCents(4, 10000), 0);
});
test("pctFeeCents: default unit 4 (0.72 -> 1, 0.116 -> 0) is 1", () => {
  assert.equal(pctFeeCents(4), 1);
});
test("pctFeeCents: platform just under half cent rounds down (pro 29: 3.48 -> 3, card 0.841 -> 1)", () => {
  assert.equal(pctFeeCents(29, 12000), 4);
});
test("pctFeeCents: platform just over half cent rounds up (pro 21: 2.52 -> 3, card 0.609 -> 1)", () => {
  assert.equal(pctFeeCents(21, 12000), 4);
});
test("pctFeeCents: default 36 (6.48 -> 6, card 1.044 -> 1) is 7", () => {
  assert.equal(pctFeeCents(36), 7);
});
test("pctFeeCents: default 14 (2.52 -> 3, card 0.406 -> 0) is 3", () => {
  assert.equal(pctFeeCents(14), 3);
});
test("pctFeeCents: default 24 (4.32 -> 4, card 0.696 -> 1) is 5", () => {
  assert.equal(pctFeeCents(24), 5);
});
test("pctFeeCents: default 26 (4.68 -> 5, card 0.754 -> 1) is 6", () => {
  assert.equal(pctFeeCents(26), 6);
});
test("pctFeeCents: card part just under half cent (power 17: 1.7 -> 2, card 0.493 -> 0) is 2", () => {
  assert.equal(pctFeeCents(17, 10000), 2);
});
test("pctFeeCents: card part just over half cent (power 18: 1.8 -> 2, card 0.522 -> 1) is 3", () => {
  assert.equal(pctFeeCents(18, 10000), 3);
});
test("pctFeeCents: tiny unit 1 rounds both parts to 0", () => {
  assert.equal(pctFeeCents(1), 0);
});
test("pctFeeCents: unit 2 gives 0, unit 3 gives 1 (default)", () => {
  assert.equal(pctFeeCents(2), 0);
  assert.equal(pctFeeCents(3), 1);
});

// ---------- unitFeeCents ----------
test("unitFeeCents: includes the 30 cents (1000 default = 209 + 30 = 239)", () => {
  assert.equal(unitFeeCents(1000), 239);
  assert.equal(unitFeeCents(1000, 18000), 239);
});
test("unitFeeCents: pro 1000 = 149 + 30 = 179", () => assert.equal(unitFeeCents(1000, 12000), 179));
test("unitFeeCents: power 1000 = 129 + 30 = 159", () => assert.equal(unitFeeCents(1000, 10000), 159));
test("unitFeeCents: zero price has no fee, no 30 cents", () => assert.equal(unitFeeCents(0), 0));
test("unitFeeCents: negative price has no fee", () => {
  assert.equal(unitFeeCents(-1), 0);
  assert.equal(unitFeeCents(-1000), 0);
});
test("unitFeeCents: price of 1 cent (just above zero) is charged the 30 cents", () => {
  assert.equal(unitFeeCents(1), 30);
});
test("unitFeeCents: rounding applies, pro 4 = 0 + 30", () => {
  assert.equal(unitFeeCents(4, 12000), 30);
});
test("unitFeeCents: default 26 = 6 + 30", () => assert.equal(unitFeeCents(26), 36));

// ---------- buyerUnitCents ----------
test("buyerUnitCents: 1000 default = 1000 + 239 = 1239", () => {
  assert.equal(buyerUnitCents(1000), 1239);
  assert.equal(buyerUnitCents(1000, 18000), 1239);
});
test("buyerUnitCents: pro 1000 = 1179", () => assert.equal(buyerUnitCents(1000, 12000), 1179));
test("buyerUnitCents: power 1000 = 1159", () => assert.equal(buyerUnitCents(1000, 10000), 1159));
test("buyerUnitCents: zero price stays 0 (no fee)", () => assert.equal(buyerUnitCents(0), 0));
test("buyerUnitCents: negative price counts as zero", () => {
  assert.equal(buyerUnitCents(-1), 0);
  assert.equal(buyerUnitCents(-500), 0);
});
test("buyerUnitCents: 1 cent price becomes 31", () => assert.equal(buyerUnitCents(1), 31));
test("buyerUnitCents: seller still earns the price (buyer price minus fee equals price)", () => {
  assert.equal(buyerUnitCents(1000) - unitFeeCents(1000), 1000);
  assert.equal(buyerUnitCents(26, 12000) - unitFeeCents(26, 12000), 26);
});

// ---------- orderFeeCents ----------
test("orderFeeCents: single line qty 1 = 209 + 30 = 239", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]), 239);
});
test("orderFeeCents: quantity multiplies percentage fee only (3 x 209 + 30 = 657)", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 3, bps: 18000 }]), 657);
});
test("orderFeeCents: 30 cents is NOT charged per item (qty 5 = 1045 + 30)", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 5, bps: 18000 }]), 1075);
});
test("orderFeeCents: missing quantity counts as 1", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, bps: 18000 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: undefined, bps: 18000 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: null, bps: 18000 }]), 239);
});
test("orderFeeCents: zero quantity counts as 1", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 0, bps: 18000 }]), 239);
});
test("orderFeeCents: quantity 2 vs 1 differ by exactly the percentage fee", () => {
  const q1 = orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]);
  const q2 = orderFeeCents([{ unitCents: 1000, quantity: 2, bps: 18000 }]);
  assert.equal(q2 - q1, 209);
  assert.equal(q2, 448);
});
test("orderFeeCents: multi-line adds fixed 30 once (2x209 + 298 + 30 = 746)", () => {
  assert.equal(orderFeeCents([
    { unitCents: 1000, quantity: 2, bps: 18000 },
    { unitCents: 2000, quantity: 1, bps: 12000 },
  ]), 746);
});
test("orderFeeCents: mixed tiers pro x2 + power x1 + 30 = 298 + 129 + 30 = 457", () => {
  assert.equal(orderFeeCents([
    { unitCents: 1000, quantity: 2, bps: 12000 },
    { unitCents: 1000, quantity: 1, bps: 10000 },
  ]), 457);
});
test("orderFeeCents: zero-priced line adds no fee, other line still triggers the 30", () => {
  assert.equal(orderFeeCents([
    { unitCents: 0, quantity: 5, bps: 18000 },
    { unitCents: 1000, quantity: 1, bps: 18000 },
  ]), 239);
});
test("orderFeeCents: negative-priced line adds no fee", () => {
  assert.equal(orderFeeCents([
    { unitCents: -1000, quantity: 1, bps: 18000 },
    { unitCents: 1000, quantity: 1, bps: 18000 },
  ]), 239);
});
test("orderFeeCents: all lines zero or negative means no fee and no 30 cents", () => {
  assert.equal(orderFeeCents([
    { unitCents: 0, quantity: 1, bps: 18000 },
    { unitCents: -100, quantity: 2, bps: 18000 },
  ]), 0);
});
test("orderFeeCents: single zero-priced line is 0", () => {
  assert.equal(orderFeeCents([{ unitCents: 0, quantity: 1, bps: 18000 }]), 0);
});
test("orderFeeCents: empty order has no fee", () => {
  assert.equal(orderFeeCents([]), 0);
});
test("orderFeeCents: price of 1 cent triggers the 30 with 0 percentage fee", () => {
  assert.equal(orderFeeCents([{ unitCents: 1, quantity: 1, bps: 18000 }]), 30);
});
test("orderFeeCents: rounding is per unit then multiplied (pro unit 4 x 10 = 0 + 30)", () => {
  assert.equal(orderFeeCents([{ unitCents: 4, quantity: 10, bps: 12000 }]), 30);
});
test("orderFeeCents: rounding per unit, default 26 x 3 = 18 + 30 = 48", () => {
  assert.equal(orderFeeCents([{ unitCents: 26, quantity: 3, bps: 18000 }]), 48);
});
