// 訂單層:本地 JSON 存儲(原型),不碰生產 SQLite
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG } from "../config.mjs";

const FILE = path.join(CONFIG.dataDir, "orders.json");

function readAll() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; }
}
function writeAll(orders) {
  fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(orders, null, 2));
}

export function createOrder({ product, buyer, txHash, settledBy }) {
  const now = new Date().toISOString();
  const order = {
    orderNumber: "AP-" + now.slice(0, 10).replaceAll("-", "") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
    pickupToken: crypto.randomBytes(18).toString("base64url"),
    productId: product.id,
    productName: product.name,
    amountCents: product.price_cents,
    asset: CONFIG.asset,
    network: CONFIG.network,
    txHash,
    settledBy,
    buyerEmail: buyer?.email || "",
    buyerAgent: buyer?.agent || "unknown-agent",
    deliveryNote: product.delivery_note || "",
    timeline: [
      { at: now, event: "payment_settled", detail: `x402 ${CONFIG.asset} on ${CONFIG.network}` },
      { at: now, event: "order_created", detail: "instant digital fulfillment" },
    ],
    createdAt: now,
  };
  const orders = readAll();
  orders.push(order);
  writeAll(orders);
  return order;
}

export function findByPickupToken(token) {
  return readAll().find((o) => o.pickupToken === token) || null;
}

export function findByOrderNumber(orderNumber) {
  return readAll().find((o) => o.orderNumber === orderNumber) || null;
}
