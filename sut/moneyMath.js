"use strict";

// Pure money calculations — NO Firestore / Stripe / network. Everything here is a
// deterministic function of its inputs so it can be unit-tested (functions/test/).
// The live handlers (returns.js, stripe.js, payouts.js) import these instead of
// inlining the math, so the tested code is the code that runs.

// Stripe processing fee estimate: 2.9% + 30¢.
function estimateStripeFeeCents(amountCents) {
  return Math.round((Number(amountCents) || 0) * 0.029) + 30;
}

// Event ticket fees. Buyer pays both as separate Stripe Checkout line items;
// artist receives the full ticket face value. Two components:
//  - Platform fee: a commission on the ticket subtotal, varies by ticket tier
//    (free/growth/scale — set automatically by trailing 30-day ticket volume,
//    see ticketTiers.js. Deliberately NOT the same as users.sellerTier, which
//    is the paid-subscription merch tier).
//  - Processing fee: 2.9% + 58¢, SAME across all tiers. Of the 58¢ flat portion,
//    30¢ is Stripe's real per-transaction flat fee (pass-through) and 28¢ is
//    platform margin — bundled into the single "Processing fee" line the buyer
//    sees, but counted as platform revenue (not a true pass-through cost) for
//    accounting (see accounting.js summarizeRevenue, which rolls the *entire*
//    fee total into platform ticket revenue, so this is already correct there).
const TICKET_PLATFORM_MARGIN_BPS = { free: 500, growth: 350, scale: 200 }; // 5% / 3.5% / 2%
const TICKET_PROCESSING_PCT_BPS = 290; // 2.9% — mirrors Stripe's real per-transaction rate
const TICKET_PROCESSING_FLAT_CENTS = 58; // 30¢ Stripe + 28¢ platform margin

function computeTicketFees({ grossCents = 0, tier = "free" } = {}) {
  const gross = Number(grossCents) || 0;
  const marginBps = TICKET_PLATFORM_MARGIN_BPS[tier] ?? TICKET_PLATFORM_MARGIN_BPS.free;
  const platformFeeCents = Math.round(gross * marginBps / 10000);
  const processingFeeCents = Math.round(gross * TICKET_PROCESSING_PCT_BPS / 10000) + TICKET_PROCESSING_FLAT_CENTS;
  const payoutCents = Math.max(0, gross - platformFeeCents - processingFeeCents);
  return { marginBps, platformFeeCents, processingFeeCents, payoutCents };
}

// Buyer refund for a single returned line item. The platform service fee is only
// refunded when the seller is at fault; change-of-mind refunds the item minus the
// return shipping the buyer pays.
function computeReturnRefund({
  itemCents = 0,
  orderSubtotalCents = 0,
  serviceFeeLineItemCents = 0,
  shippingCents = 0,
  taxCents = 0,
  returnShippingCents = 0,
  sellerAtFault = false,
} = {}) {
  itemCents = Number(itemCents) || 0;
  const orderSubtotal = Number(orderSubtotalCents) || itemCents || 1;
  const ratio = Math.min(1, itemCents / orderSubtotal);
  const feeShare = Math.round((Number(serviceFeeLineItemCents) || 0) * ratio);
  const shipShare = Math.round((Number(shippingCents) || 0) * ratio);
  const taxShare = Math.round((Number(taxCents) || 0) * ratio);
  const returnShipCents = Number(returnShippingCents) || shipShare;

  const buyerRefundCents = sellerAtFault
    ? (itemCents + feeShare + shipShare + taxShare + returnShipCents)
    : Math.max(0, itemCents - returnShipCents);

  return { ratio, feeShare, shipShare, taxShare, returnShipCents, buyerRefundCents };
}

// Seller-debt for an at-fault return. 1st offense: shipping (out + return) + Stripe
// fee. Repeat offenders (2nd+) also eat the platform fee share.
function computeFaultDebt({ shipShare = 0, returnShipCents = 0, buyerRefundCents = 0, feeShare = 0, repeatOffender = false } = {}) {
  const stripeFee = estimateStripeFeeCents(buyerRefundCents);
  const platformFeePenalty = repeatOffender ? (Number(feeShare) || 0) : 0;
  return (Number(shipShare) || 0) + (Number(returnShipCents) || 0) + stripeFee + platformFeePenalty;
}

// One artist's share of a chargeback. The seller owes the disputed amount only if already paid
// out (an unpaid sale is simply never paid). The chargeback fee is taken from the seller's
// Stripe Connect balance first (a transfer reversal) and ArtSupply covers whatever that cannot
// reach, so the fee is never seller debt. See splitChargebackReversal.
function computeChargebackDebt({ disputedCents = 0, feeCents = 0, share = 0, alreadyPaid = false } = {}) {
  const dispShare = Math.round((Number(disputedCents) || 0) * share);
  const feeShare = Math.round((Number(feeCents) || 0) * share);
  return { dispShare, feeShare, debtShare: alreadyPaid ? dispShare : 0 };
}

// Splits what a transfer reversal recovered between the disputed amount (first) and the fee.
// Returns the disputed amount still unrecovered (seller debt) and the fee ArtSupply absorbs.
function splitChargebackReversal({ dispShare = 0, feeShare = 0, reversedCents = 0, alreadyPaid = false } = {}) {
  const reversed = alreadyPaid ? Math.max(0, Number(reversedCents) || 0) : 0;
  const disputeReversed = Math.min(reversed, dispShare);
  const feeReversed = Math.min(reversed - disputeReversed, feeShare);
  return {
    disputeReversed, feeReversed,
    disputeShortfall: alreadyPaid ? dispShare - disputeReversed : 0,
    feeAbsorbed: feeShare - feeReversed,
  };
}

// FIFO allocation of a recovered amount against outstanding debts (oldest first).
// Pure: returns the actions to apply, plus any leftover. The caller turns actions
// into Firestore writes. `debts` = [{ id, amountCents, createdAt }].
function allocateDebtRecovery(debts, recoveredCents) {
  let remaining = Math.max(0, Number(recoveredCents) || 0);
  const actions = [];
  const ordered = [...(debts || [])].sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

  for (const d of ordered) {
    if (remaining <= 0) break;
    const amt = Math.max(0, Number(d.amountCents) || 0);
    if (amt <= remaining) {
      actions.push({ id: d.id, recovered: true });
      remaining -= amt;
    } else {
      actions.push({ id: d.id, recovered: false, newAmountCents: amt - remaining, partialRecoveredCents: remaining });
      remaining = 0;
    }
  }
  return { actions, leftover: remaining };
}

// On a WON dispute: which artist uids on this order had their payout slot
// blocked by this specific dispute (so we know whose slot to unblock). Scoped
// to `disputeId` so an order's slot blocked by a different/later dispute isn't
// touched.
function findChargedBackUidsForDispute(payouts, disputeId) {
  return Object.keys(payouts || {}).filter(
    (uid) => payouts[uid]?.status === "charged_back" && payouts[uid]?.disputeId === disputeId
  );
}

// Sum of still-outstanding seller_debts docs to waive for a won dispute.
// Debts already `recovered` from a completed payout are left alone - that's a
// manual reconciliation case, not an automatic one.
function sumOutstandingDebtCents(debtDocs) {
  return (debtDocs || []).reduce((s, d) => s + (Math.max(0, Number(d.amountCents) || 0)), 0);
}

// Fan points. Kept small on purpose, because there is no reward budget behind them:
//   earn   1 point for every whole dollar paid (it was 10, which gave back 5% of every order)
//   spend  500 points take $1 off, so a point is worth a fifth of a cent and earning is a 0.2% rebate
//   cap    points can cover at most 5% of an order's subtotal (it was 15%)
// Tune these three numbers as the business can afford; nothing else needs to change.
const POINTS_PER_DOLLAR_EARNED = 1;
const POINTS_PER_DOLLAR_OFF = 500;
const POINTS_MAX_DISCOUNT_BPS = 500;

function computePointsEarned(amountTotalCents) {
  return Math.max(0, Math.floor((Number(amountTotalCents) || 0) / 100)) * POINTS_PER_DOLLAR_EARNED;
}

// How many points to spend, and what they take off, for one order. Whole dollars only.
function computePointsRedemption(subtotalCents, availablePoints) {
  const have = Math.max(0, Math.floor(Number(availablePoints) || 0));
  if (have < POINTS_PER_DOLLAR_OFF) return { pointsRedeemed: 0, discountCents: 0 };
  const capDollars = Math.floor(Math.floor((Number(subtotalCents) || 0) * POINTS_MAX_DISCOUNT_BPS / 10000) / 100);
  const dollars = Math.min(capDollars, Math.floor(have / POINTS_PER_DOLLAR_OFF));
  return { pointsRedeemed: dollars * POINTS_PER_DOLLAR_OFF, discountCents: dollars * 100 };
}

module.exports = {
  POINTS_PER_DOLLAR_EARNED,
  POINTS_PER_DOLLAR_OFF,
  POINTS_MAX_DISCOUNT_BPS,
  computePointsEarned,
  computePointsRedemption,
  estimateStripeFeeCents,
  computeTicketFees,
  TICKET_PLATFORM_MARGIN_BPS,
  TICKET_PROCESSING_PCT_BPS,
  TICKET_PROCESSING_FLAT_CENTS,
  computeReturnRefund,
  computeFaultDebt,
  computeChargebackDebt,
  splitChargebackReversal,
  allocateDebtRecovery,
  findChargedBackUidsForDispute,
  sumOutstandingDebtCents,
};
