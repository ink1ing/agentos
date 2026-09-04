import crypto from "node:crypto";

const tokens = new Map(); // token -> { productId, amountCents, email, exp }
const TTL_MS = Number(process.env.CONFIRM_TTL_MS || 120_000);

export function issueConfirm({ productId, amountCents, email }) {
  const token = crypto.randomBytes(18).toString("base64url");
  tokens.set(token, { productId, amountCents, email: email || "", exp: Date.now() + TTL_MS });
  return { confirmToken: token, expiresInSec: Math.floor(TTL_MS / 1000) };
}

export function consumeConfirm(token) {
  const rec = tokens.get(token);
  if (!rec) return null;
  tokens.delete(token);
  if (Date.now() > rec.exp) return null;
  return rec;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tokens) if (now > v.exp) tokens.delete(k);
}, 30_000).unref();
