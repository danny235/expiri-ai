import { NextResponse } from "next/server";
import {
  X402_GATE_ENABLED,
  buildPaymentRequiredHeader,
  buildPaymentRequiredPayload,
  humanPrice
} from "../challenge";
import { urgencyOf } from "@/lib/status";
import { DEFAULT_SETTINGS, Item } from "@/lib/types";

// ---------------------------------------------------------------------------
// Expiri.ai "Expiry Scan" ASP endpoint (A2MCP, paid). GET and POST both served
// because OKX's validator probes with POST, and a GET-only route answers its
// probe with a bare 405 and fails.
//
// Cold-start discipline: this module statically imports ONLY the dependency-free
// ./challenge layer. The unauthenticated 402 probe (the checker's first hit)
// therefore loads no ethers / Anthropic SDK / Upstash and answers in ms. The
// heavy modules are dynamically imported only once a payment proof is present.
// ---------------------------------------------------------------------------

export const maxDuration = 30;

function paymentRequired(resourceUrl: string, reason?: string) {
  const headerValue = buildPaymentRequiredHeader(resourceUrl);
  return NextResponse.json(
    {
      error: reason || "Payment required",
      message: `This is a paid resource (${humanPrice()} per scan) served via the x402 protocol. Sign the PAYMENT-REQUIRED challenge and replay with a PAYMENT-SIGNATURE header.`,
      x402: buildPaymentRequiredPayload(resourceUrl)
    },
    { status: 402, headers: { "PAYMENT-REQUIRED": headerValue } }
  );
}

// A settlement problem is ours, never the payer's — must not deny a paid call.
async function settleVerified(
  proof: { signature: string; authorization: { nonce: string } }
): Promise<{ status: "settled" | "pending" | "deferred"; txHash?: string }> {
  const { settleAuthorization, markSettled, SETTLER_ENABLED } = await import("../settle");
  if (!SETTLER_ENABLED) {
    console.warn("x402: settler key not configured — payment verified but NOT collected.");
    return { status: "deferred" };
  }
  try {
    const result = await settleAuthorization({
      signature: proof.signature,
      authorization: proof.authorization as never,
      receivedAt: Date.now()
    });
    if (result.ok && result.txHash) {
      await markSettled(proof.authorization.nonce, result.txHash);
      return { status: "settled", txHash: result.txHash };
    }
    if (result.alreadySettled) return { status: "settled" };
    console.error("x402: inline settlement failed, sweep will retry:", result.reason);
    return { status: "pending" };
  } catch (err) {
    console.error("x402: inline settlement threw:", err instanceof Error ? err.message : err);
    return { status: "pending" };
  }
}

async function readImage(request: Request): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const { image, mediaType } = (await request.json()) as { image?: string; mediaType?: string };
    if (!image) return null;
    const m = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (m) return { base64: m[2], mediaType: m[1] };
    return { base64: image, mediaType: mediaType || "image/jpeg" };
  } catch {
    return null;
  }
}

async function runScan(request: Request, extraHeaders: Record<string, string> = {}) {
  const img = await readImage(request);
  if (!img) {
    return NextResponse.json(
      { error: "Provide a product image as a base64 data URL in the JSON body field 'image'." },
      { status: 400, headers: extraHeaders }
    );
  }
  const { scanImage, SCAN_MODE } = await import("@/lib/scan");
  const result = await scanImage(img.base64, img.mediaType);

  let urgency: string | null = null;
  if (result.expiryDate) {
    urgency = urgencyOf({ expiryDate: result.expiryDate } as Item, DEFAULT_SETTINGS);
  }

  return NextResponse.json({ result: { ...result, urgency }, mode: SCAN_MODE }, { headers: extraHeaders });
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const resourceUrl = `${url.origin}${url.pathname}`;

  if (X402_GATE_ENABLED) {
    const proofHeader = request.headers.get("PAYMENT-SIGNATURE") || request.headers.get("X-PAYMENT");
    if (!proofHeader) return paymentRequired(resourceUrl); // fast path — no heavy imports

    const { verifyPayment, buildPaymentResponseHeader } = await import("../x402");
    const verification = await verifyPayment(proofHeader);
    if (!verification.verified) return paymentRequired(resourceUrl, `Payment rejected: ${verification.reason}`);

    const settlement = verification.proof ? await settleVerified(verification.proof) : { status: "deferred" as const };
    return runScan(request, { "PAYMENT-RESPONSE": buildPaymentResponseHeader(verification, settlement) });
  }

  // Gate disabled (local dev) — serve free.
  return runScan(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
