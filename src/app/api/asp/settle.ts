import { ethers } from "ethers";
import { redis } from "@/lib/redis";

// x402 settlement for the Expiri.ai ASP. transferWithAuthorization is
// permissionless to broadcast, so the settler key custodies nothing — it only
// relays (X Layer gas is negligible). No key set => settlement is a no-op and
// callers are still served (verified but uncollected), same as before.

const CHAIN_ID = 196;
const PAYMENT_ASSET = "0x779ded0c9e1022225f8e0630b35a9b54be713736"; // USDT0 on X Layer
const XLAYER_RPC_URL = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";

const FN_VRS =
  "function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,uint8 v,bytes32 r,bytes32 s)";
const FN_SIG =
  "function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,bytes signature)";
const FN_STATE = "function authorizationState(address authorizer,bytes32 nonce) view returns (bool)";
const SELECTOR_VRS =
  "transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)";
const SELECTOR_SIG = "transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,bytes)";

export const SETTLER_ENABLED = Boolean(process.env.X402_SETTLER_PRIVATE_KEY);

export interface Eip3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string | number;
  validBefore: string | number;
  nonce: string;
}

export interface StoredAuth {
  signature: string;
  authorization: Eip3009Authorization;
  receivedAt: number;
  settled?: { txHash: string; at: number };
}

export interface SettleResult {
  ok: boolean;
  txHash?: string;
  alreadySettled?: boolean;
  reason?: string;
}

export const authKey = (nonce: string) => `expiri:x402:auth:${nonce.toLowerCase()}`;

function settlerWallet(): ethers.Wallet | null {
  const pk = process.env.X402_SETTLER_PRIVATE_KEY;
  if (!pk) return null;
  try {
    const provider = new ethers.JsonRpcProvider(XLAYER_RPC_URL, CHAIN_ID);
    return new ethers.Wallet(pk, provider);
  } catch {
    return null;
  }
}

export async function settleAuthorization(stored: StoredAuth): Promise<SettleResult> {
  const wallet = settlerWallet();
  if (!wallet) return { ok: false, reason: "settler key not configured" };

  const a = stored.authorization;
  const now = Math.floor(Date.now() / 1000);
  if (Number(a.validBefore) <= now) {
    return { ok: false, reason: `expired at ${a.validBefore} (now ${now}) — no longer claimable` };
  }

  const token = new ethers.Contract(PAYMENT_ASSET, [FN_VRS, FN_SIG, FN_STATE], wallet);

  try {
    const used: boolean = await token.authorizationState(a.from, a.nonce);
    if (used) return { ok: true, alreadySettled: true, reason: "authorization already used on-chain" };
  } catch {
    // token may not expose authorizationState — fall through and try.
  }

  const sig = ethers.Signature.from(stored.signature);
  try {
    const tx = await token[SELECTOR_VRS](a.from, a.to, a.value, a.validAfter, a.validBefore, a.nonce, sig.v, sig.r, sig.s);
    return { ok: true, txHash: tx.hash };
  } catch (errVrs) {
    try {
      const tx = await token[SELECTOR_SIG](a.from, a.to, a.value, a.validAfter, a.validBefore, a.nonce, stored.signature);
      return { ok: true, txHash: tx.hash };
    } catch (errSig) {
      const m1 = errVrs instanceof Error ? errVrs.message : String(errVrs);
      const m2 = errSig instanceof Error ? errSig.message : String(errSig);
      return { ok: false, reason: `vrs: ${m1.slice(0, 120)} | sig: ${m2.slice(0, 120)}` };
    }
  }
}

export async function markSettled(nonce: string, txHash: string): Promise<void> {
  const key = authKey(nonce);
  const current = (await redis.get(key)) as StoredAuth | null;
  if (!current || typeof current !== "object") return;
  await redis.set(key, { ...current, settled: { txHash, at: Date.now() } }, { ex: 7 * 86400 });
}
