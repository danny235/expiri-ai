import { ethers } from "ethers";
import { redis } from "@/lib/redis";
import {
  CHAIN_ID,
  PAYMENT_ASSET,
  ASSET_DOMAIN_NAME,
  ASSET_DOMAIN_VERSION,
  NETWORK,
  PRICE_ATOMIC,
  PAY_TO,
  humanPrice,
  type Eip3009Authorization
} from "./challenge";

// ---------------------------------------------------------------------------
// x402 verification + settlement-side crypto (the ethers/redis-heavy half).
// This module is imported dynamically from route.ts ONLY on a paid request, so
// the unauthenticated 402 probe never pays its cold-start cost. Challenge
// building lives in the dependency-free ./challenge module.
// ---------------------------------------------------------------------------

const XLAYER_RPC_URL = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
};

const EIP712_DOMAIN = {
  name: ASSET_DOMAIN_NAME,
  version: ASSET_DOMAIN_VERSION,
  chainId: CHAIN_ID,
  verifyingContract: PAYMENT_ASSET
};

export interface VerifyResult {
  verified: boolean;
  reason: string;
  payer?: string;
  amountAtomic?: string;
  proof?: { signature: string; authorization: Eip3009Authorization };
}

function decodeProofHeader(headerValue: string): { signature: string; authorization: Eip3009Authorization } | null {
  let decoded: any;
  try {
    const normalized = headerValue.replace(/-/g, "+").replace(/_/g, "/");
    decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
  const container = decoded?.payload && decoded.payload.authorization ? decoded.payload : decoded;
  const signature = container?.signature;
  const authorization = container?.authorization;
  if (typeof signature !== "string" || !authorization?.from || !authorization?.to || !authorization?.nonce) {
    return null;
  }
  if (decoded?.scheme && decoded.scheme !== "exact") return null;
  return { signature, authorization };
}

export async function verifyPayment(headerValue: string): Promise<VerifyResult> {
  const proof = decodeProofHeader(headerValue);
  if (!proof) {
    return { verified: false, reason: "Malformed payment header — expected base64 JSON with {signature, authorization}" };
  }
  const { signature, authorization } = proof;

  if (authorization.to.toLowerCase() !== PAY_TO) {
    return { verified: false, reason: `Payment recipient mismatch — expected ${PAY_TO}` };
  }

  let value: bigint;
  try {
    value = BigInt(authorization.value);
  } catch {
    return { verified: false, reason: "Invalid authorization.value" };
  }
  if (value < PRICE_ATOMIC) {
    return { verified: false, reason: `Insufficient amount — need ${PRICE_ATOMIC} atomic (${humanPrice()})` };
  }

  const now = Math.floor(Date.now() / 1000);
  const validAfter = Number(authorization.validAfter);
  const validBefore = Number(authorization.validBefore);
  if (!Number.isFinite(validAfter) || !Number.isFinite(validBefore) || now < validAfter || now > validBefore) {
    return { verified: false, reason: "Authorization outside its validity window — request a fresh challenge and re-sign" };
  }

  let recovered: string;
  try {
    recovered = ethers.verifyTypedData(
      EIP712_DOMAIN,
      EIP3009_TYPES,
      {
        from: authorization.from,
        to: authorization.to,
        value: authorization.value,
        validAfter: authorization.validAfter,
        validBefore: authorization.validBefore,
        nonce: authorization.nonce
      },
      signature
    );
  } catch {
    return { verified: false, reason: "Signature recovery failed — not a valid EIP-3009 TransferWithAuthorization signature" };
  }
  if (recovered.toLowerCase() !== authorization.from.toLowerCase()) {
    return { verified: false, reason: "Signature does not match authorization.from" };
  }

  const nonceKey = `expiri:x402:nonce:${authorization.nonce.toLowerCase()}`;
  const ttl = Math.max(validBefore - now, 60) + 86400;
  const claimed = await redis.set(nonceKey, authorization.from, { nx: true, ex: ttl });
  if (claimed === null) {
    return { verified: false, reason: "Replay rejected — this authorization nonce was already used" };
  }

  const skipBalanceCheck = process.env.X402_SKIP_BALANCE_CHECK === "true" && process.env.NODE_ENV !== "production";
  if (!skipBalanceCheck) {
    try {
      const provider = new ethers.JsonRpcProvider(XLAYER_RPC_URL);
      const token = new ethers.Contract(PAYMENT_ASSET, ["function balanceOf(address) view returns (uint256)"], provider);
      const balance: bigint = await token.balanceOf(authorization.from);
      if (balance < value) {
        await redis.del(nonceKey);
        return { verified: false, reason: "Payer balance insufficient on X Layer — authorization is unfunded" };
      }
    } catch {
      await redis.del(nonceKey);
      return { verified: false, reason: "Could not confirm payer balance on-chain — try again shortly" };
    }
  }

  await redis.set(
    `expiri:x402:auth:${authorization.nonce.toLowerCase()}`,
    { signature, authorization, receivedAt: Date.now() },
    { ex: 7 * 86400 }
  );

  return { verified: true, reason: "ok", payer: authorization.from, amountAtomic: value.toString(), proof: { signature, authorization } };
}

export function buildPaymentResponseHeader(
  result: VerifyResult,
  settlement?: { status: "settled" | "pending" | "deferred"; txHash?: string }
): string {
  return Buffer.from(
    JSON.stringify({
      status: "verified",
      settlement: settlement?.status ?? "deferred",
      ...(settlement?.txHash ? { txHash: settlement.txHash } : {}),
      network: NETWORK,
      asset: PAYMENT_ASSET,
      amount: result.amountAtomic,
      payer: result.payer
    })
  ).toString("base64");
}
