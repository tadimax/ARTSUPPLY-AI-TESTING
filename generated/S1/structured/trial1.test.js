const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const { tierBps, pctFeeCents, unitFeeCents, buyerUnitCents, orderFeeCents } = mod;

test("constants: DEFAULT_BPS, CARD_BPS, ORDER_FIXED_CENTS", () => {
  assert.equal(mod.DEFAULT_BPS, 18000);
  assert.equal(mod.CARD_BPS, 2900);
  assert.equal(mod.ORDER_FIXED_CENTS, 30);
});

test("constants: TIER_BPS holds pro and power rates", () => {
  assert.equal(mod.TIER_BPS.pro, 12000);
  assert.equal(mod.TIER_BPS.power, 10000);
});

test("tierBps: pro is 12%", () => {
  assert.equal(tierBps("pro"), 12000);
});

test("tierBps: power is 10%", () => {
  assert.equal(tierBps("power"), 10000);
});

test("tierBps: unknown tier gets default 18%", () => {
  assert.equal(tierBps("gold"), 18000);
});

test("tierBps: missing tier gets default (undefined, null, no args)", () => {
  assert.equal(tierBps(undefined), 18000);
  assert.equal(tierBps(null), 18000);
  assert.equal(tierBps(), 18000);
});

test("tierBps: custom defaultBps used for unknown/missing tier only", () => {
  assert.equal(tierBps("gold", 15000), 15000);
  assert.equal(tierBps(undefined, 15000), 15000);
  assert.equal(tierBps("pro", 15000), 12000);
  assert.equal(tierBps("power", 15000), 10000);
});

test("pctFeeCents: 1000 at default is 180 + 29 = 209", () => {
  assert.equal(pctFeeCents(1000), 209);
  assert.equal(pctFeeCents(1000, 18000), 209);
});

test("pctFeeCents: pro and power rates", () => {
  assert.equal(pctFeeCents(1000, 12000), 149);
  assert.equal(pctFeeCents(1000, 10000), 129);
});

test("pctFeeCents: 2000 across tiers", () => {
  assert.equal(pctFeeCents(2000, 18000), 418);
  assert.equal(pctFeeCents(2000, 12000), 298);
  assert.equal(pctFeeCents(2000, 10000), 258);
});

test("pctFeeCents: 100 is 18 + round(2.9)=3 = 21", () => {
  assert.equal(pctFeeCents(100), 21);
});

test("pctFeeCents: zero price is zero", () => {
  assert.equal(pctFeeCents(0), 0);
});

test("pctFeeCents: does not include the fixed 30 cents", () => {
  assert.equal(pctFeeCents(1000), 209);
  assert.notEqual(pctFeeCents(1000), 239);
});

test("pctFeeCents: tiny prices round each part to zero", () => {
  assert.equal(pctFeeCents(1), 0);
  assert.equal(pctFeeCents(2), 0);
});

test("pctFeeCents rounding: platform 0.54 rounds up to 1 (unit 3)", () => {
  assert.equal(pctFeeCents(3), 1);
});

test("pctFeeCents rounding: platform just under half (24900 bps, unit 2 = 0.498) rounds down", () => {
  assert.equal(pctFeeCents(2, 24900), 0);
});

test("pctFeeCents rounding: platform just over half (25100 bps, unit 2 = 0.502) rounds up", () => {
  assert.equal(pctFeeCents(2, 25100), 1);
});

test("pctFeeCents rounding: card part just under half (unit 17 = 0.493) rounds down", () => {
  // platform 3.06 -> 3, card 0.493 -> 0
  assert.equal(pctFeeCents(17), 3);
});

test("pctFeeCents rounding: card part just over half (unit 18 = 0.522) rounds up", () => {
  // platform 3.24 -> 3, card 0.522 -> 1
  assert.equal(pctFeeCents(18), 4);
});

test("pctFeeCents rounding: parts are rounded separately, not summed first (unit 17)", () => {
  // combined 3.553 would round to 4; separate rounding gives 3
  assert.equal(pctFeeCents(17), 3);
  assert.notEqual(pctFeeCents(17), 4);
});

test("pctFeeCents rounding: units 16 and 19", () => {
  // 16: 2.88->3, 0.464->0
  assert.equal(pctFeeCents(16), 3);
  // 19: 3.42->3, 0.551->1
  assert.equal(pctFeeCents(19), 4);
});

test("pctFeeCents: zero platform rate leaves only the card part", () => {
  assert.equal(pctFeeCents(1000, 0), 29);
});

test("unitFeeCents: adds 30 cents to the percentage fee", () => {
  assert.equal(unitFeeCents(1000), 239);
  assert.equal(unitFeeCents(1000, 18000), 239);
});

test("unitFeeCents: pro and power tiers", () => {
  assert.equal(unitFeeCents(1000, 12000), 179);
  assert.equal(unitFeeCents(1000, 10000), 159);
});

test("unitFeeCents: 2000 across tiers", () => {
  assert.equal(unitFeeCents(2000, 18000), 448);
  assert.equal(unitFeeCents(2000, 12000), 328);
  assert.equal(unitFeeCents(2000, 10000), 288);
});

test("unitFeeCents: 100 is 21 + 30 = 51", () => {
  assert.equal(unitFeeCents(100), 51);
});

test("unitFeeCents boundary: price 1 (just above zero) still gets the 30 cents", () => {
  assert.equal(unitFeeCents(1), 30);
});

test("unitFeeCents boundary: price 0 has no fee, no 30 cents", () => {
  assert.equal(unitFeeCents(0), 0);
});

test("unitFeeCents boundary: price -1 (just below zero) has no fee", () => {
  assert.equal(unitFeeCents(-1), 0);
});

test("unitFeeCents: large negative price has no fee", () => {
  assert.equal(unitFeeCents(-1000), 0);
});

test("unitFeeCents: zero price is not charged 30 cents on any tier rate", () => {
  assert.equal(unitFeeCents(0, 12000), 0);
  assert.equal(unitFeeCents(0, 10000), 0);
  assert.equal(unitFeeCents(0, 18000), 0);
});

test("unitFeeCents rounding: unit 17 is 3 + 30 = 33, unit 18 is 4 + 30 = 34", () => {
  assert.equal(unitFeeCents(17), 33);
  assert.equal(unitFeeCents(18), 34);
});

test("buyerUnitCents: price plus unit fee", () => {
  assert.equal(buyerUnitCents(1000), 1239);
  assert.equal(buyerUnitCents(1000, 18000), 1239);
});

test("buyerUnitCents: pro and power tiers", () => {
  assert.equal(buyerUnitCents(1000, 12000), 1179);
  assert.equal(buyerUnitCents(1000, 10000), 1159);
});

test("buyerUnitCents: 2000 across tiers", () => {
  assert.equal(buyerUnitCents(2000, 18000), 2448);
  assert.equal(buyerUnitCents(2000, 12000), 2328);
  assert.equal(buyerUnitCents(2000, 10000), 2288);
});

test("buyerUnitCents: 100 is 151", () => {
  assert.equal(buyerUnitCents(100), 151);
});

test("buyerUnitCents boundary: price 1 is 31", () => {
  assert.equal(buyerUnitCents(1), 31);
});

test("buyerUnitCents boundary: price 0 is 0 (no 30 cents)", () => {
  assert.equal(buyerUnitCents(0), 0);
});

test("buyerUnitCents: negative prices count as zero", () => {
  assert.equal(buyerUnitCents(-1), 0);
  assert.equal(buyerUnitCents(-500), 0);
  assert.equal(buyerUnitCents(-500, 12000), 0);
});

test("buyerUnitCents: seller earns exactly the price they set", () => {
  for (const [p, bps] of [[1000, 18000], [2000, 12000], [100, 10000], [17, 18000]]) {
    assert.equal(buyerUnitCents(p, bps) - unitFeeCents(p, bps), p);
  }
});

test("orderFeeCents: single line quantity 1 is pct fee plus 30", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]), 239);
});

test("orderFeeCents: quantity multiplies the percentage fee only, 30 added once", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 3, bps: 18000 }]), 657);
});

test("orderFeeCents: the fixed 30 is not multiplied by quantity", () => {
  const q1 = orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]);
  const q2 = orderFeeCents([{ unitCents: 1000, quantity: 2, bps: 18000 }]);
  assert.equal(q2 - q1, 209);
});

test("orderFeeCents: missing quantity counts as 1", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, bps: 18000 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: undefined, bps: 18000 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: null, bps: 18000 }]), 239);
});

test("orderFeeCents: zero quantity counts as 1", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 0, bps: 18000 }]), 239);
});

test("orderFeeCents: missing bps defaults to 18000", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000 }]), 239);
});

test("orderFeeCents: bps rates differ per tier", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 12000 }]), 179);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 10000 }]), 159);
});

test("orderFeeCents: multiple lines add percentage fees and one 30 cents", () => {
  // 1000 x2 @18%: 418; 1000 x1 @12%: 149; +30 once
  assert.equal(
    orderFeeCents([
      { unitCents: 1000, quantity: 2, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 12000 },
    ]),
    597
  );
});

test("orderFeeCents: three lines still add 30 only once", () => {
  // 209 + 149 + 129 + 30
  assert.equal(
    orderFeeCents([
      { unitCents: 1000, quantity: 1, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 12000 },
      { unitCents: 1000, quantity: 1, bps: 10000 },
    ]),
    517
  );
});

test("orderFeeCents: zero-price line alongside a positive line adds no fee of its own", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: 0, quantity: 5, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 18000 },
    ]),
    239
  );
});

test("orderFeeCents: negative-price line alongside a positive line adds no fee of its own", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: -500, quantity: 2, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 18000 },
    ]),
    239
  );
});

test("orderFeeCents: positive line order does not depend on position of zero line", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: 1000, quantity: 1, bps: 18000 },
      { unitCents: 0, quantity: 5, bps: 18000 },
    ]),
    239
  );
});

test("orderFeeCents: all lines priced zero means no 30 cents and no fee", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: 0, quantity: 1, bps: 18000 },
      { unitCents: 0, quantity: 4, bps: 12000 },
    ]),
    0
  );
});

test("orderFeeCents: single zero-price line is free", () => {
  assert.equal(orderFeeCents([{ unitCents: 0, quantity: 1, bps: 18000 }]), 0);
});

test("orderFeeCents: all negative-price lines mean no fee", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: -100, quantity: 1, bps: 18000 },
      { unitCents: -1, quantity: 3, bps: 18000 },
    ]),
    0
  );
});

test("orderFeeCents boundary: price 1 line (just above zero) triggers the 30 cents", () => {
  // pct fee of 1 is 0, plus 30
  assert.equal(orderFeeCents([{ unitCents: 1, quantity: 1, bps: 18000 }]), 30);
});

test("orderFeeCents boundary: price 0 line does not trigger the 30 cents", () => {
  assert.equal(orderFeeCents([{ unitCents: 0, quantity: 1, bps: 18000 }]), 0);
});

test("orderFeeCents boundary: price -1 line does not trigger the 30 cents", () => {
  assert.equal(orderFeeCents([{ unitCents: -1, quantity: 1, bps: 18000 }]), 0);
});

test("orderFeeCents rounding: per-unit rounding is multiplied by quantity (unit 17 x 10)", () => {
  // pct fee of one unit is 3, x10 = 30, +30
  assert.equal(orderFeeCents([{ unitCents: 17, quantity: 10, bps: 18000 }]), 60);
});

test("orderFeeCents rounding: unit 18 x 10", () => {
  // pct fee of one unit is 4, x10 = 40, +30
  assert.equal(orderFeeCents([{ unitCents: 18, quantity: 10, bps: 18000 }]), 70);
});

test("orderFeeCents: order total matches sum of pct fees plus 30", () => {
  const lines = [
    { unitCents: 2000, quantity: 2, bps: 12000 },
    { unitCents: 100, quantity: 3, bps: 18000 },
  ];
  // 298*2 + 21*3 + 30 = 596 + 63 + 30
  assert.equal(orderFeeCents(lines), 689);
});
