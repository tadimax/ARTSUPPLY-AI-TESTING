"use strict";

// What a buyer pays for one unit of merch: the seller's price with our service fee folded in, so the price shown
// on the site is the price at checkout (Canada's drip-pricing rule: a mandatory fee belongs in the advertised
// price). The seller still earns exactly the price they set.
//
//   fee = platform share of each unit's price (18% default, 12% Pro, 10% Power, or a founding-artist rate)
//       + the card cost estimate on each unit (2.9%)
//       + 30 cents once per order
//
// The shown price includes the 30 cents so a single item matches exactly. In a bigger order the 30 cents is
// charged once, so the buyer never pays more than the prices they saw.
// assets/js/buyer-price.js repeats the display formula for the browser; a test keeps the two identical.

const DEFAULT_BPS = 18000;                      // of 100000, same unit as PLATFORM_FEE_BPS
const TIER_BPS = { pro: 12000, power: 10000 };
const CARD_BPS = 2900;                          // 2.9%
const ORDER_FIXED_CENTS = 30;                   // once per order
const FOUNDING_DEFAULT_BPS = 12000;
const FOUNDING_DEFAULT_MONTHS = 12;

const tierBps = (tier, defaultBps = DEFAULT_BPS) => TIER_BPS[String(tier || "").trim()] ?? defaultBps;

// A founding-artist rate is { bps, until (ISO) } on the seller's user doc, set by an admin. It applies until it
// runs out and never raises the rate above what their tier already gives.
function foundingActive(user, nowMs = Date.now()) {
  const f = user && user.foundingFee;
  return !!f && Number.isFinite(Number(f.bps)) && Number(f.bps) >= 0 && Date.parse(f.until) > nowMs;
}
function bpsFor(user, defaultBps = DEFAULT_BPS, nowMs = Date.now()) {
  const base = tierBps(user && user.sellerTier, defaultBps);
  return foundingActive(user, nowMs) ? Math.min(base, Number(user.foundingFee.bps)) : base;
}

// The part of the fee that depends on the price (no fixed cents).
function pctFeeCents(unitCents, bps = DEFAULT_BPS) {
  const u = Math.max(0, Math.round(Number(unitCents) || 0));
  return Math.round((u * bps) / 100000) + Math.round((u * CARD_BPS) / 100000);
}

// The fee included in the price shown for one unit (the order's 30 cents counted in full).
const unitFeeCents = (unitCents, bps = DEFAULT_BPS) => (Math.round(Number(unitCents) || 0) > 0 ? pctFeeCents(unitCents, bps) + ORDER_FIXED_CENTS : 0);
const buyerUnitCents = (unitCents, bps = DEFAULT_BPS) => Math.max(0, Math.round(Number(unitCents) || 0)) + unitFeeCents(unitCents, bps);

// The whole order's fee. lines: [{ unitCents, quantity, bps }]. The 30 cents is added once if anything is priced.
function orderFeeCents(lines) {
  let total = 0; let priced = false;
  for (const l of lines) {
    const q = Math.max(1, Number(l.quantity) || 1);
    if ((Number(l.unitCents) || 0) > 0) { priced = true; total += pctFeeCents(l.unitCents, l.bps) * q; }
  }
  return total + (priced ? ORDER_FIXED_CENTS : 0);
}

module.exports = {
  DEFAULT_BPS, TIER_BPS, CARD_BPS, ORDER_FIXED_CENTS, FOUNDING_DEFAULT_BPS, FOUNDING_DEFAULT_MONTHS,
  tierBps, foundingActive, bpsFor, pctFeeCents, unitFeeCents, buyerUnitCents, orderFeeCents,
};
