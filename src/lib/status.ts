import { Item, Settings, Urgency } from "./types";

export function daysUntil(expiryDate: string, now = new Date()): number {
  const exp = new Date(expiryDate + "T00:00:00");
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exp.getTime() - start.getTime()) / 86400000);
}

// Urgency ladder:
//   expired        — past its date, pull it now
//   expiring_soon  — within nearExpiryDays, sell-through / discount / use first
//   return_window  — still has shelf life but inside the supplier-return window,
//                    act to recover credit before it becomes a write-off
//   ok             — nothing to do yet
export function urgencyOf(item: Item, settings: Settings, now = new Date()): Urgency {
  const d = daysUntil(item.expiryDate, now);
  if (d < 0) return "expired";
  if (d <= settings.nearExpiryDays) return "expiring_soon";
  if (d <= settings.returnWindowDays) return "return_window";
  return "ok";
}

export const URGENCY_META: Record<Urgency, { label: string; tone: string; blurb: string }> = {
  expired: { label: "Expired", tone: "red", blurb: "Remove from shelf now" },
  expiring_soon: { label: "Expiring soon", tone: "amber", blurb: "Sell-through / discount / use first" },
  return_window: { label: "Return window", tone: "blue", blurb: "Return to supplier for credit" },
  ok: { label: "Safe", tone: "green", blurb: "No action needed" }
};

const ORDER: Record<Urgency, number> = { expired: 0, expiring_soon: 1, return_window: 2, ok: 3 };

// Sort by soonest expiry (most actionable first).
export function sortByUrgency(items: Item[]): Item[] {
  return [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

export interface Digest {
  expired: Item[];
  expiring_soon: Item[];
  return_window: Item[];
  total: number;
  actionable: number;
}

// Items needing attention, bucketed — used by the dashboard summary and the
// daily notification.
export function buildDigest(items: Item[], settings: Settings, now = new Date()): Digest {
  const digest: Digest = { expired: [], expiring_soon: [], return_window: [], total: items.length, actionable: 0 };
  for (const item of items) {
    const u = urgencyOf(item, settings, now);
    if (u === "ok") continue;
    digest[u].push(item);
    digest.actionable++;
  }
  for (const bucket of [digest.expired, digest.expiring_soon, digest.return_window]) {
    bucket.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }
  return digest;
}
