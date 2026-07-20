import { Redis } from "@upstash/redis";
import { Item, Settings, DEFAULT_SETTINGS } from "./types";

// Storage abstraction. If Upstash is configured we persist there; otherwise we
// fall back to an in-memory store so the app runs (and demos) with zero keys.
// A "workspace" is one store/pharmacy; the MVP uses a single default workspace.

const WORKSPACE = process.env.DEFAULT_WORKSPACE || "demo";
const itemsKey = (ws: string) => `expiry:${ws}:items`;
const settingsKey = (ws: string) => `expiry:${ws}:settings`;

const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

export const STORAGE_MODE: "upstash" | "memory" = upstashConfigured ? "upstash" : "memory";

interface Store {
  listItems(ws: string): Promise<Item[]>;
  saveItem(ws: string, item: Item): Promise<void>;
  deleteItem(ws: string, id: string): Promise<void>;
  getSettings(ws: string): Promise<Settings>;
  saveSettings(ws: string, settings: Settings): Promise<void>;
}

// ---- In-memory (dev / no-keys) ----
// Survives within a running process only; seeded so the demo is never empty.
const mem = new Map<string, Item[]>();
const memSettings = new Map<string, Settings>();

const memoryStore: Store = {
  async listItems(ws) {
    return mem.get(ws) ?? [];
  },
  async saveItem(ws, item) {
    const list = mem.get(ws) ?? [];
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item;
    else list.push(item);
    mem.set(ws, list);
  },
  async deleteItem(ws, id) {
    mem.set(ws, (mem.get(ws) ?? []).filter((x) => x.id !== id));
  },
  async getSettings(ws) {
    return memSettings.get(ws) ?? DEFAULT_SETTINGS;
  },
  async saveSettings(ws, settings) {
    memSettings.set(ws, settings);
  }
};

// ---- Upstash (persistent) ----
// Items stored as a JSON list under one key — fine at MVP scale (hundreds of
// items per workspace); revisit with a hash/sorted-set if volume grows.
function upstash(): Store {
  const redis = Redis.fromEnv();
  return {
    async listItems(ws) {
      return ((await redis.get<Item[]>(itemsKey(ws))) ?? []) as Item[];
    },
    async saveItem(ws, item) {
      const list = ((await redis.get<Item[]>(itemsKey(ws))) ?? []) as Item[];
      const i = list.findIndex((x) => x.id === item.id);
      if (i >= 0) list[i] = item;
      else list.push(item);
      await redis.set(itemsKey(ws), list);
    },
    async deleteItem(ws, id) {
      const list = ((await redis.get<Item[]>(itemsKey(ws))) ?? []) as Item[];
      await redis.set(itemsKey(ws), list.filter((x) => x.id !== id));
    },
    async getSettings(ws) {
      return ((await redis.get<Settings>(settingsKey(ws))) ?? DEFAULT_SETTINGS) as Settings;
    },
    async saveSettings(ws, settings) {
      await redis.set(settingsKey(ws), settings);
    }
  };
}

const store: Store = upstashConfigured ? upstash() : memoryStore;

export const listItems = () => store.listItems(WORKSPACE);
export const saveItem = (item: Item) => store.saveItem(WORKSPACE, item);
export const deleteItem = (id: string) => store.deleteItem(WORKSPACE, id);
export const getSettings = () => store.getSettings(WORKSPACE);
export const saveSettings = (settings: Settings) => store.saveSettings(WORKSPACE, settings);

// Seed the in-memory store once so a fresh demo shows the full urgency ladder.
let seeded = false;
export async function ensureSeed() {
  if (STORAGE_MODE !== "memory" || seeded) return;
  seeded = true;
  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const samples: Item[] = [
    { id: "seed-1", name: "Amoxicillin 500mg (30 caps)", category: "Medication", expiryDate: iso(-5), quantity: 4, batchLot: "AMX2394", location: "Shelf B2", supplier: "MedSupply Co", addedAt: Date.now() },
    { id: "seed-2", name: "Paracetamol Syrup 100ml", category: "Medication", expiryDate: iso(12), quantity: 9, batchLot: "PCM8821", location: "Shelf A1", supplier: "PharmaDirect", addedAt: Date.now() },
    { id: "seed-3", name: "Insulin Glargine (pack of 5)", category: "Medication", expiryDate: iso(60), quantity: 2, batchLot: "INS4410", location: "Fridge 1", supplier: "MedSupply Co", addedAt: Date.now() },
    { id: "seed-4", name: "Vitamin C 1000mg (60 tabs)", category: "Supplement", expiryDate: iso(210), quantity: 15, batchLot: "VTC1190", location: "Shelf C3", supplier: "HealthPlus", addedAt: Date.now() }
  ];
  for (const s of samples) await memoryStore.saveItem(WORKSPACE, s);
}
