"use strict";

// Ticket platform-fee tier, based purely on trailing 30-day ticket sales
// volume — no subscription required. This is deliberately decoupled from
// `users/{uid}.sellerTier` (the merch/payout tier, which DOES require an
// active paid subscription, see sellerTiers.js): ticket volume alone earns
// the discount, since the marginal cost per ticket is just the Stripe
// processing pass-through, already billed separately to the buyer. See
// knowledge/ticket_policy.md for the buyer/seller-facing explanation.

const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const TICKET_TIER_THRESHOLDS = { growth: 40, scale: 90 };

function tierForCount(ticketCount30d) {
  const count = Number(ticketCount30d) || 0;
  if (count >= TICKET_TIER_THRESHOLDS.scale) return "scale";
  if (count >= TICKET_TIER_THRESHOLDS.growth) return "growth";
  return "free";
}

function ticketsUntilNextTier(ticketCount30d) {
  const count = Number(ticketCount30d) || 0;
  if (count >= TICKET_TIER_THRESHOLDS.scale) return 0;
  if (count >= TICKET_TIER_THRESHOLDS.growth) return TICKET_TIER_THRESHOLDS.scale - count;
  return TICKET_TIER_THRESHOLDS.growth - count;
}

async function getRollingTicketCount(db, artistUid) {
  if (!artistUid) return 0;
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString();
  const snap = await db.collection("ticket_sales")
    .where("artistUid", "==", artistUid)
    .where("createdAt", ">=", windowStart)
    .get();

  let count = 0;
  snap.docs.forEach((d) => {
    count += Number((d.data() || {}).qty) || 0;
  });
  return count;
}

async function computeRollingTicketTier(db, artistUid) {
  const ticketCount30d = await getRollingTicketCount(db, artistUid);
  return { tier: tierForCount(ticketCount30d), ticketCount30d };
}

module.exports = {
  TICKET_TIER_THRESHOLDS,
  tierForCount,
  ticketsUntilNextTier,
  getRollingTicketCount,
  computeRollingTicketTier,
};
