// x402 協議層:402 挑戰構造 + X-PAYMENT 解析驗證
import crypto from "node:crypto";
import { CONFIG } from "../config.mjs";

const challenges = new Map(); // nonce -> { productId, amountCents, exp }

export function buildChallenge(product) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + CONFIG.challengeTtlSec * 1000;
  // 對齊 x402 V2 的 accepts 結構
  const challenge = {
    x402Version: 2,
    error: "Payment required",
    accepts: [
      {
        scheme: "exact",
        network: CONFIG.network,
        asset: CONFIG.asset,
        maxAmountRequired: String(product.price_cents / 100),
        payTo: CONFIG.payTo,
        resource: `/agent/buy/${product.id}`,
        description: `${product.name} @ ${CONFIG.storeName}`,
        nonce,
        maxTimeoutSeconds: CONFIG.challengeTtlSec,
      },
    ],
  };
  challenges.set(nonce, { productId: product.id, amountCents: product.price_cents, exp, requirements: challenge.accepts[0] });
  return challenge;
}

export function decodePayment(header) {
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// 取出並消費一次性 nonce(防重放)
export function consumeChallenge(nonce) {
  const c = challenges.get(nonce);
  if (!c) return null;
  challenges.delete(nonce);
  if (Date.now() > c.exp) return null;
  return c;
}

// 定期清理過期挑戰
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challenges) if (now > v.exp) challenges.delete(k);
}, 60_000).unref();
