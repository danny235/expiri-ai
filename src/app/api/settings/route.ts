import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/store";
import { DEFAULT_SETTINGS, Settings } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Settings>;
  const current = await getSettings();
  const next: Settings = {
    notifyEmail: body.notifyEmail ?? current.notifyEmail,
    nearExpiryDays: clampDays(body.nearExpiryDays, current.nearExpiryDays),
    returnWindowDays: clampDays(body.returnWindowDays, current.returnWindowDays)
  };
  // Return window must be >= near-expiry window to make sense as a ladder.
  if (next.returnWindowDays < next.nearExpiryDays) next.returnWindowDays = next.nearExpiryDays;
  await saveSettings(next);
  return NextResponse.json({ settings: next });
}

function clampDays(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback || DEFAULT_SETTINGS.nearExpiryDays;
  return Math.min(Math.round(n), 730);
}
