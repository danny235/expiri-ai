// Freemium limits. The MVP has one workspace, so the plan is process-level for
// now; when auth + billing land, this moves to per-workspace state set by the
// Stripe subscription status.
export type Plan = "free" | "business";

export const FREE_ITEM_LIMIT = Number(process.env.FREE_ITEM_LIMIT || 10);

export const WORKSPACE_PLAN: Plan = (process.env.WORKSPACE_PLAN as Plan) || "free";

// null = unlimited (business plan).
export function itemLimit(plan: Plan = WORKSPACE_PLAN): number | null {
  return plan === "business" ? null : FREE_ITEM_LIMIT;
}
