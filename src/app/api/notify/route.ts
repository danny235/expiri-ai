import { NextResponse } from "next/server";
import { listItems, getSettings, ensureSeed } from "@/lib/store";
import { buildDigest, daysUntil } from "@/lib/status";
import { Digest } from "@/lib/status";

// Daily notification. Driven by Vercel Cron (see vercel.json). Sends an email
// via Resend when RESEND_API_KEY + a notify address are set; otherwise returns
// the digest JSON so the flow is still fully demoable without an email account.
export const maxDuration = 30;

function line(item: { name: string; expiryDate: string; quantity: number; batchLot?: string }) {
  const d = daysUntil(item.expiryDate);
  const when = d < 0 ? `expired ${-d}d ago` : `${d}d left`;
  const lot = item.batchLot ? ` · lot ${item.batchLot}` : "";
  return `• ${item.name} (x${item.quantity})${lot} — ${item.expiryDate} (${when})`;
}

function renderText(digest: Digest): string {
  const parts: string[] = [];
  if (digest.expired.length) parts.push(`EXPIRED — remove now (${digest.expired.length}):\n` + digest.expired.map(line).join("\n"));
  if (digest.expiring_soon.length) parts.push(`EXPIRING SOON (${digest.expiring_soon.length}):\n` + digest.expiring_soon.map(line).join("\n"));
  if (digest.return_window.length) parts.push(`RETURN TO SUPPLIER FOR CREDIT (${digest.return_window.length}):\n` + digest.return_window.map(line).join("\n"));
  return parts.join("\n\n") || "Nothing needs attention today.";
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || "Expiry.ai <onboarding@resend.dev>",
      to,
      subject,
      text
    })
  });
  return res.ok;
}

async function run() {
  await ensureSeed();
  const [items, settings] = await Promise.all([listItems(), getSettings()]);
  const digest = buildDigest(items, settings);
  const text = renderText(digest);
  const subject = `Expiry.ai — ${digest.actionable} item(s) need attention`;

  let emailed = false;
  if (digest.actionable > 0) {
    emailed = await sendEmail(settings.notifyEmail, subject, text);
  }

  return {
    ok: true,
    emailed,
    to: settings.notifyEmail || null,
    counts: {
      expired: digest.expired.length,
      expiring_soon: digest.expiring_soon.length,
      return_window: digest.return_window.length,
      total: digest.total
    },
    preview: text
  };
}

// Protect the cron with CRON_SECRET when set (Vercel Cron sends it as Bearer).
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}
