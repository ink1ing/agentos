// 憑證層:原型階段把「郵件」寫成 outbox/ 下的 HTML 檔(demo 時直接開給評審看)
// 上線換成真 SMTP(Resend/SendGrid),接口不變
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.mjs";

export function sendReceipt({ order, pickupUrl }) {
  fs.mkdirSync(CONFIG.outboxDir, { recursive: true });
  const rows = order.timeline
    .map((t) => `<tr><td>${t.at}</td><td>${t.event}</td><td>${t.detail}</td></tr>`)
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><title>收據 ${order.orderNumber}</title>
<body style="font-family:system-ui;max-width:560px;margin:40px auto;color:#222">
<h2>🧾 ${CONFIG.storeName} — 訂單收據</h2>
<p><b>${order.productName}</b> · $${(order.amountCents / 100).toFixed(2)} ${order.asset} (${order.network})</p>
<p>訂單號:<code>${order.orderNumber}</code><br>
鏈上交易:<code>${order.txHash}</code><br>
下單 agent:${order.buyerAgent}</p>
<p style="background:#f0fdf4;padding:12px;border-radius:8px">📦 取貨連結:<a href="${pickupUrl}">${pickupUrl}</a><br>
預計交付:${order.deliveryNote || "即時"}</p>
<h3>全程記錄</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px">${rows}</table>
</body>`;
  const file = path.join(CONFIG.outboxDir, `${order.orderNumber}${order.buyerEmail ? "-" + order.buyerEmail.replace(/[^a-z0-9@.]/gi, "_") : ""}.html`);
  fs.writeFileSync(file, html);
  return file;
}
