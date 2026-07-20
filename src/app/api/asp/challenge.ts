// Lightweight x402 challenge layer — NO ethers / redis / SDK imports.
//
// OKX's marketplace checker probes the endpoint with an unauthenticated request
// FIRST, and it has a real request timeout. If the route eagerly loads heavy
// deps (ethers, the Anthropic SDK, Upstash) at module init, a cold start can
// take many seconds and the checker reports a "timeout" even though we'd answer
// correctly. Keeping the challenge path dependency-free lets that probe
// cold-start in milliseconds; the heavy modules are dynamically imported only
// on a paid request (see route.ts).

export const X402_GATE_ENABLED = process.env.X402_GATE_ENABLED === "true";

export const NETWORK = "eip155:196"; // X Layer
export const CHAIN_ID = 196;
export const PAYMENT_ASSET = "0x779ded0c9e1022225f8e0630b35a9b54be713736"; // USDT0 on X Layer
export const ASSET_DOMAIN_NAME = "USD" + String.fromCodePoint(0x20ae) + "0"; // "USD₮0"
export const ASSET_DOMAIN_VERSION = "1";
export const ASSET_DECIMALS = 6;
export const PRICE_ATOMIC = BigInt(process.env.X402_PRICE_ATOMIC || "200000"); // 0.2 USDT0
export const PAY_TO = (process.env.X402_PAY_TO || "0x643e96532de9e475ca1bc30c314216d25c59eef8").toLowerCase();
export const MAX_TIMEOUT_SECONDS = 3600;

export const RESOURCE_DESCRIPTION =
  "Scan a product image: returns the product name, expiry date (ISO), batch/lot number, quantity and an expiry-urgency assessment as structured JSON.";

export interface Eip3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string | number;
  validBefore: string | number;
  nonce: string;
}

// Human price without pulling in ethers (fixed 6 decimals).
export function humanPrice(): string {
  return `${Number(PRICE_ATOMIC) / 10 ** ASSET_DECIMALS} USDT0`;
}

export function buildPaymentRequiredPayload(resourceUrl: string) {
  return {
    x402Version: 2,
    resource: { url: resourceUrl, description: RESOURCE_DESCRIPTION, mimeType: "application/json" },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount: PRICE_ATOMIC.toString(),
        payTo: PAY_TO,
        maxTimeoutSeconds: MAX_TIMEOUT_SECONDS,
        asset: PAYMENT_ASSET,
        extra: { name: ASSET_DOMAIN_NAME, version: ASSET_DOMAIN_VERSION }
      }
    ]
  };
}

export function buildPaymentRequiredHeader(resourceUrl: string): string {
  return Buffer.from(JSON.stringify(buildPaymentRequiredPayload(resourceUrl))).toString("base64");
}
