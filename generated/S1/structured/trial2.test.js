const test = require("node:test");
const assert = require("node:assert/strict");
const mod = require("../../../sut/buyerPrice");

const { tierBps, pctFeeCents, unitFeeCents, buyerUnitCents, orderFeeCents } = mod;

// Constants
test("constant DEFAULT_BPS is 18000", () => {
  assert.equal(mod.DEFAULT_BPS, 18000);
});
test("constant CARD_BPS is 2900", () => {
  assert.equal(mod.CARD_BPS, 2900);
});
test("constant ORDER_FIXED_CENTS is 30", () => {
  assert.equal(mod.ORDER_FIXED_CENTS, 30);
});
test("constant TIER_BPS holds pro 12000 and power 10000", () => {
  assert.equal(mod.TIER_BPS.pro, 12000);
  assert.equal(mod.TIER_BPS.power, 10000);
});

// tierBps
test("tierBps pro is 12000", () => assert.equal(tierBps("pro"), 12000));
test("tierBps power is 10000", () => assert.equal(tierBps("power"), 10000));
test("tierBps unknown tier gets default 18000", () => assert.equal(tierBps("basic"), 18000));
test("tierBps missing tier (undefined) gets default 18000", () => assert.equal(tierBps(undefined), 18000));
test("tierBps null tier gets default 18000", () => assert.equal(tierBps(null), 18000));
test("tierBps empty string gets default 18000", () => assert.equal(tierBps(""), 18000));
test("tierBps custom default is used for unknown tier", () => assert.equal(tierBps("basic", 15000), 15000));
test("tierBps custom default is used for missing tier", () => assert.equal(tierBps(undefined, 15000), 15000));
test("tierBps custom default does not override pro", () => assert.equal(tierBps("pro", 15000), 12000));
test("tierBps custom default does not override power", () => assert.equal(tierBps("power", 15000), 10000));

// pctFeeCents
test("pctFeeCents default bps: 1000 cents -> 180 + 29 = 209", () => {
  assert.equal(pctFeeCents(1000), 209);
});
test("pctFeeCents pro: 1000 cents -> 120 + 29 = 149", () => {
  assert.equal(pctFeeCents(1000, 12000), 149);
});
test("pctFeeCents power: 1000 cents -> 100 + 29 = 129", () => {
  assert.equal(pctFeeCents(1000, 10000), 129);
});
test("pctFeeCents large price 100000 -> 18000 + 2900 = 20900", () => {
  assert.equal(pctFeeCents(100000), 20900);
});
test("pctFeeCents large price pro 100000 -> 14900, power -> 12900", () => {
  assert.equal(pctFeeCents(100000, 12000), 14900);
  assert.equal(pctFeeCents(100000, 10000), 12900);
});
test("pctFeeCents has no fixed 30 cents included", () => {
  assert.equal(pctFeeCents(100), 21);
});
test("pctFeeCents 1 cent rounds both parts to 0", () => {
  assert.equal(pctFeeCents(1), 0);
});
test("pctFeeCents zero price is 0", () => {
  assert.equal(pctFeeCents(0), 0);
});
test("pctFeeCents rounds each part separately: 24 cents -> 4 + 1 = 5 (sum 5.016 would also be 5)", () => {
  // 4.32 -> 4, 0.696 -> 1
  assert.equal(pctFeeCents(24), 5);
});
test("pctFeeCents half cent platform share rounds up: 25 cents -> 5 + 1 = 6", () => {
  // 4.5 -> 5, 0.725 -> 1
  assert.equal(pctFeeCents(25), 6);
});
test("pctFeeCents just above half cent: 26 cents -> 5 + 1 = 6", () => {
  // 4.68 -> 5, 0.754 -> 1
  assert.equal(pctFeeCents(26), 6);
});
test("pctFeeCents half cent at 10% share: 5 cents -> 1 + 0 = 1", () => {
  // 0.5 -> 1, 0.145 -> 0
  assert.equal(pctFeeCents(5, 10000), 1);
});
test("pctFeeCents just below half at 10% share: 4 cents -> 0 + 0 = 0", () => {
  // 0.4 -> 0, 0.116 -> 0
  assert.equal(pctFeeCents(4, 10000), 0);
});
test("pctFeeCents card part just below half: 17 cents -> 3 + 0 = 3", () => {
  // 3.06 -> 3, 0.493 -> 0
  assert.equal(pctFeeCents(17), 3);
});
test("pctFeeCents card part just above half: 18 cents -> 3 + 1 = 4", () => {
  // 3.24 -> 3, 0.522 -> 1
  assert.equal(pctFeeCents(18), 4);
});
test("pctFeeCents pro at 25 cents: 3 + 1 = 4", () => {
  // 3.0 -> 3, 0.725 -> 1
  assert.equal(pctFeeCents(25, 12000), 4);
});

// unitFeeCents
test("unitFeeCents default: 1000 cents -> 209 + 30 = 239", () => {
  assert.equal(unitFeeCents(1000), 239);
});
test("unitFeeCents pro: 1000 cents -> 149 + 30 = 179", () => {
  assert.equal(unitFeeCents(1000, 12000), 179);
});
test("unitFeeCents power: 1000 cents -> 129 + 30 = 159", () => {
  assert.equal(unitFeeCents(1000, 10000), 159);
});
test("unitFeeCents 100 cents -> 21 + 30 = 51", () => {
  assert.equal(unitFeeCents(100), 51);
});
test("unitFeeCents 1 cent (just above zero) still includes the 30 cents: 0 + 30 = 30", () => {
  assert.equal(unitFeeCents(1), 30);
});
test("unitFeeCents zero price has no fee at all, no 30 cents", () => {
  assert.equal(unitFeeCents(0), 0);
});
test("unitFeeCents negative price has no fee at all, no 30 cents", () => {
  assert.equal(unitFeeCents(-1), 0);
  assert.equal(unitFeeCents(-100), 0);
});
test("unitFeeCents zero price with pro and power bps has no fee", () => {
  assert.equal(unitFeeCents(0, 12000), 0);
  assert.equal(unitFeeCents(0, 10000), 0);
});
test("unitFeeCents half cent: 25 cents -> 6 + 30 = 36", () => {
  assert.equal(unitFeeCents(25), 36);
});

// buyerUnitCents
test("buyerUnitCents default: 1000 -> 1000 + 239 = 1239", () => {
  assert.equal(buyerUnitCents(1000), 1239);
});
test("buyerUnitCents pro: 1000 -> 1179", () => {
  assert.equal(buyerUnitCents(1000, 12000), 1179);
});
test("buyerUnitCents power: 1000 -> 1159", () => {
  assert.equal(buyerUnitCents(1000, 10000), 1159);
});
test("buyerUnitCents 100 -> 151", () => {
  assert.equal(buyerUnitCents(100), 151);
});
test("buyerUnitCents 1 cent -> 1 + 30 = 31", () => {
  assert.equal(buyerUnitCents(1), 31);
});
test("buyerUnitCents large price 100000 -> 120930", () => {
  assert.equal(buyerUnitCents(100000), 120930);
});
test("buyerUnitCents zero price stays 0 (no fee)", () => {
  assert.equal(buyerUnitCents(0), 0);
});
test("buyerUnitCents negative price counts as zero", () => {
  assert.equal(buyerUnitCents(-1), 0);
  assert.equal(buyerUnitCents(-500), 0);
});
test("buyerUnitCents seller still earns exactly the price they set", () => {
  for (const [p, b] of [[1000, 18000], [1000, 12000], [1000, 10000], [25, 18000], [1, 18000], [100000, 12000]]) {
    assert.equal(buyerUnitCents(p, b) - unitFeeCents(p, b), p);
  }
});

// orderFeeCents
test("orderFeeCents empty order has no fee and no 30 cents", () => {
  assert.equal(orderFeeCents([]), 0);
});
test("orderFeeCents single line quantity 1: 209 + 30 = 239", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 18000 }]), 239);
});
test("orderFeeCents quantity multiplies percentage fee only: qty 3 -> 627 + 30 = 657", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 3, bps: 18000 }]), 657);
});
test("orderFeeCents the 30 cents is not multiplied by quantity: qty 2 -> 418 + 30 = 448", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 2, bps: 18000 }]), 448);
});
test("orderFeeCents missing quantity counts as 1", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, bps: 18000 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: undefined, bps: 18000 }]), 239);
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: null, bps: 18000 }]), 239);
});
test("orderFeeCents zero quantity counts as 1", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 0, bps: 18000 }]), 239);
});
test("orderFeeCents missing bps uses the default 18000", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1 }]), 239);
});
test("orderFeeCents pro line: 149 + 30 = 179", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 12000 }]), 179);
});
test("orderFeeCents power line: 129 + 30 = 159", () => {
  assert.equal(orderFeeCents([{ unitCents: 1000, quantity: 1, bps: 10000 }]), 159);
});
test("orderFeeCents multi-line adds 30 once: 418 + 89 + 30 = 537", () => {
  // line1: 1000 @18% qty2 -> (180+29)*2 = 418; line2: 600 @12% qty1 -> 72 + 17 = 89
  assert.equal(
    orderFeeCents([
      { unitCents: 1000, quantity: 2, bps: 18000 },
      { unitCents: 600, quantity: 1, bps: 12000 },
    ]),
    537
  );
});
test("orderFeeCents three positive lines still adds 30 only once", () => {
  // 209 + 209 + 209 + 30 = 657
  assert.equal(
    orderFeeCents([
      { unitCents: 1000, quantity: 1, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 18000 },
    ]),
    657
  );
});
test("orderFeeCents all lines at zero or negative price: no fee, no 30 cents", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: 0, quantity: 1, bps: 18000 },
      { unitCents: -5, quantity: 2, bps: 18000 },
    ]),
    0
  );
});
test("orderFeeCents single zero-price line: no fee, no 30 cents", () => {
  assert.equal(orderFeeCents([{ unitCents: 0, quantity: 1, bps: 18000 }]), 0);
});
test("orderFeeCents zero-price line with a positive line: 30 added once, zero line adds nothing", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: 0, quantity: 5, bps: 18000 },
      { unitCents: 1000, quantity: 1, bps: 18000 },
    ]),
    239
  );
});
test("orderFeeCents positive line first then zero-price line gives same result", () => {
  assert.equal(
    orderFeeCents([
      { unitCents: 1000, quantity: 1, bps: 18000 },
      { unitCents: 0, quantity: 5, bps: 18000 },
    ]),
    239
  );
});
test("orderFeeCents 1 cent line is above zero so 30 cents is charged: 0 + 30 = 30", () => {
  assert.equal(orderFeeCents([{ unitCents: 1, quantity: 1, bps: 18000 }]), 30);
});
test("orderFeeCents half cent rounding per unit before quantity: 25 cents qty 4 -> 6*4 + 30 = 54", () => {
  assert.equal(orderFeeCents([{ unitCents: 25, quantity: 4, bps: 18000 }]), 54);
});
test("orderFeeCents order fee for one unit equals unitFeeCents", () => {
  for (const [p, b] of [[1000, 18000], [1000, 12000], [1000, 10000], [25, 18000], [1, 18000]]) {
    assert.equal(orderFeeCents([{ unitCents: p, quantity: 1, bps: b }]), unitFeeCents(p, b));
  }
});
