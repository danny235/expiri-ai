// Core domain: an expiry-sensitive inventory item. Generic across retail
// (supermarket, restaurant, warehouse) with pharmacy as the hero case —
// hence batchLot and the return-window concept are first-class, not bolted on.

export interface Item {
  id: string;
  name: string;
  category: string; // e.g. "Medication", "Dairy", "Produce"
  expiryDate: string; // ISO date (YYYY-MM-DD)
  quantity: number;
  batchLot?: string; // pharma batch / lot number — optional for general retail
  location?: string; // shelf / store / fridge
  supplier?: string; // who to return it to
  addedAt: number; // epoch ms
}

export type ItemInput = Omit<Item, "id" | "addedAt">;

// Per-workspace settings. In the MVP a "workspace" is one store/pharmacy.
export interface Settings {
  notifyEmail: string;
  nearExpiryDays: number; // alert when expiry is within this many days
  returnWindowDays: number; // supplier-return deadline lead time (pharma killer feature)
}

export const DEFAULT_SETTINGS: Settings = {
  notifyEmail: "",
  nearExpiryDays: 30,
  returnWindowDays: 90
};

// Urgency states, most severe first. "return_window" is the differentiator:
// stock still sellable but entering the window to return to the supplier for
// credit before it becomes a total write-off.
export type Urgency = "expired" | "expiring_soon" | "return_window" | "ok";

export interface ScanResult {
  name: string;
  category: string;
  expiryDate: string; // ISO or "" if unreadable
  quantity: number;
  batchLot: string;
  confidence: "high" | "medium" | "low";
  note?: string; // e.g. "expiry date was blurry"
}
