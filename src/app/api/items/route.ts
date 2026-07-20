import { NextResponse } from "next/server";
import { listItems, saveItem, getSettings, ensureSeed, STORAGE_MODE } from "@/lib/store";
import { SCAN_MODE } from "@/lib/scan";
import { WORKSPACE_PLAN, itemLimit } from "@/lib/plan";
import { sortByUrgency, buildDigest } from "@/lib/status";
import { Item, ItemInput } from "@/lib/types";

export async function GET() {
  await ensureSeed();
  const [items, settings] = await Promise.all([listItems(), getSettings()]);
  const limit = itemLimit();
  return NextResponse.json({
    items: sortByUrgency(items),
    digest: buildDigest(items, settings),
    settings,
    mode: { storage: STORAGE_MODE, scan: SCAN_MODE },
    usage: { count: items.length, limit, plan: WORKSPACE_PLAN }
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ItemInput>;
  if (!body.name || !body.expiryDate) {
    return NextResponse.json({ error: "name and expiryDate are required" }, { status: 400 });
  }

  // Freemium cap — soft-gate the create when the free workspace is full.
  const limit = itemLimit();
  if (limit !== null) {
    const current = await listItems();
    if (current.length >= limit) {
      return NextResponse.json(
        { error: `Free plan limit reached (${limit} items). Upgrade to Business for unlimited tracking.`, code: "limit_reached", limit },
        { status: 402 }
      );
    }
  }

  const item: Item = {
    id: crypto.randomUUID(),
    name: body.name,
    category: body.category || "Uncategorised",
    expiryDate: body.expiryDate,
    quantity: typeof body.quantity === "number" && body.quantity > 0 ? body.quantity : 1,
    batchLot: body.batchLot || undefined,
    location: body.location || undefined,
    supplier: body.supplier || undefined,
    addedAt: Date.now()
  };
  await saveItem(item);
  return NextResponse.json({ item }, { status: 201 });
}
