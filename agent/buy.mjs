#!/usr/bin/env node
// Demo buyer agent: search → quote → confirm → x402 pay → pickup
// Usage: node agent/buy.mjs "apple" [email]
import { defaultWallet } from "../gateway/lib/wallet.mjs";

const GATEWAY = process.env.GATEWAY || "http://localhost:8402";
const query = process.argv[2] || "apple";
const email = process.argv[3] || "";
const wallet = defaultWallet();
const log = (role, msg) => console.log(`\n[${role}] ${msg}`);

log("agent", `search: "${query}"`);
const store = await (await fetch(`${GATEWAY}/.well-known/agent-store.json`)).json();
const q = query.toLowerCase();
const hits = store.products.filter((p) => (p.name + p.subtitle + p.description).toLowerCase().includes(q));
if (!hits.length) {
  log("agent", "no matching product");
  process.exit(1);
}
const pick = hits.sort((a, b) => a.price.amountCents - b.price.amountCents)[0];
log("agent", `found ${hits.length}, pick: ${pick.name} — $${(pick.price.amountCents / 100).toFixed(2)} (${pick.deliveryEta})`);

const quoteRes = await fetch(`${GATEWAY}/agent/quote/${encodeURIComponent(pick.id)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email }),
});
const quote = await quoteRes.json();
if (!quote.confirmToken) {
  log("gateway", `quote failed: ${JSON.stringify(quote)}`);
  process.exit(1);
}
log("gateway", `quote ${quote.amount} ${quote.asset} on ${quote.network} (confirm ${quote.expiresInSec}s)`);
log("human", "approved");

let res = await fetch(pick.x402.buy, {
  method: "POST",
  headers: { "content-type": "application/json", "x-confirm-token": quote.confirmToken },
  body: JSON.stringify({ email, confirmToken: quote.confirmToken }),
});
if (res.status !== 402) {
  log("agent", `expected 402, got ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const challenge = (await res.json()).accepts[0];
log("gateway", `HTTP 402 — ${challenge.maxAmountRequired} ${challenge.asset} on ${challenge.network}`);

res = await fetch(pick.x402.buy, {
  method: "POST",
  headers: {
    "x-payment": wallet.sign({ challenge, email }),
    "content-type": "application/json",
    "user-agent": "demo-shopping-agent/0.2",
  },
  body: JSON.stringify({ email }),
});
const result = await res.json();
if (!result.ok) {
  log("gateway", `pay failed: ${JSON.stringify(result)}`);
  process.exit(1);
}
log("gateway", `paid ✅ tx: ${result.paid.txHash.slice(0, 22)}…`);
log("agent", `order ${result.orderNumber}\n  pickup: ${result.pickupUrl}\n  receipt: ${result.receipt.emailedTo} (${result.receipt.file})`);
