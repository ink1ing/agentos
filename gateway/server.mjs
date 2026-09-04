// AgentPay gateway: make a store agent-readable and x402-payable
import http from "node:http";
import { pathToFileURL } from "node:url";
import { CONFIG } from "./config.mjs";
import { loadCatalog, toAgentStore, findProduct } from "./lib/catalog.mjs";
import { buildChallenge, decodePayment, consumeChallenge } from "./lib/x402.mjs";
import { verifyAndSettle } from "./lib/facilitator.mjs";
import { createOrder, findByPickupToken, findByOrderNumber } from "./lib/orders.mjs";
import { sendReceipt } from "./lib/mailer.mjs";
import { issueConfirm, consumeConfirm } from "./lib/confirm.mjs";

const json = (res, status, body, extra = {}) => {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...extra });
  res.end(data);
};
const html = (res, status, body) => {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
};
const readBody = (req) =>
  new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c).length > 65536 && req.destroy());
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve({});
      }
    });
  });

export function createServer() {
  return http.createServer(async (req, res) => {
    const host = req.headers.host || `127.0.0.1:${CONFIG.port}`;
    const url = new URL(req.url, `http://${host}`);
    const base = `http://${host}`;
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        return json(res, 200, { ok: true, facilitator: CONFIG.facilitator, network: CONFIG.network, asset: CONFIG.asset });
      }
      if (req.method === "GET" && url.pathname === "/.well-known/agent-store.json") {
        const raw = await loadCatalog();
        return json(res, 200, toAgentStore(raw, base));
      }

      const quoteMatch = url.pathname.match(/^\/agent\/quote\/([^/]+)$/);
      if (req.method === "POST" && quoteMatch) {
        const product = await findProduct(decodeURIComponent(quoteMatch[1]));
        if (!product) return json(res, 404, { error: "product not found or not digital" });
        if (product.price_cents > CONFIG.maxAmountCents) {
          return json(res, 400, { error: `demo cap: max $${CONFIG.maxAmountCents / 100} per tx` });
        }
        const body = await readBody(req);
        const issued = issueConfirm({ productId: product.id, amountCents: product.price_cents, email: body.email || "" });
        return json(res, 200, {
          productId: product.id,
          product: product.name,
          amount: `$${(product.price_cents / 100).toFixed(2)}`,
          amountCents: product.price_cents,
          asset: CONFIG.asset,
          network: CONFIG.network,
          payTo: CONFIG.payTo,
          deliveryEta: product.delivery_note || "instant",
          ...issued,
        });
      }

      const buyMatch = url.pathname.match(/^\/agent\/buy\/([^/]+)$/);
      if (req.method === "POST" && buyMatch) {
        const product = await findProduct(decodeURIComponent(buyMatch[1]));
        if (!product) return json(res, 404, { error: "product not found or not digital" });
        if (product.price_cents > CONFIG.maxAmountCents) {
          return json(res, 400, { error: `demo cap: max $${CONFIG.maxAmountCents / 100} per tx (Agent OS x402 limit is $20/day)` });
        }

        const paymentHeader = req.headers["x-payment"];
        if (!paymentHeader) {
          const confirmToken = req.headers["x-confirm-token"] || "";
          const rec = confirmToken ? consumeConfirm(confirmToken) : null;
          if (!rec || rec.productId !== product.id) {
            return json(res, 409, { error: "confirmation required: call POST /agent/quote/:id first, then retry with X-Confirm-Token" });
          }
          if (rec.amountCents !== product.price_cents) {
            return json(res, 409, { error: "quoted amount no longer matches catalog price" });
          }
          return json(res, 402, buildChallenge(product));
        }

        const payment = decodePayment(paymentHeader);
        if (!payment) return json(res, 400, { error: "malformed X-PAYMENT header" });
        const challenge = consumeChallenge(payment?.payload?.nonce);
        if (!challenge || challenge.productId !== product.id) {
          return json(res, 402, { ...buildChallenge(product), error: "challenge expired or invalid, retry with new nonce" });
        }

        const settle = await verifyAndSettle({ payment, challenge, requirements: challenge.requirements });
        if (!settle.ok) return json(res, 402, { ...buildChallenge(product), error: `payment rejected: ${settle.reason}` });

        const body = await readBody(req);
        const order = createOrder({
          product,
          buyer: { email: body.email || payment.payload?.email || "", agent: req.headers["user-agent"] || "" },
          txHash: settle.txHash,
          settledBy: settle.settledBy,
        });
        const pickupUrl = `${base}/pickup/${order.pickupToken}`;
        const receiptFile = sendReceipt({ order, pickupUrl });
        console.log(`[order] ${order.orderNumber} ${product.name} $${(product.price_cents / 100).toFixed(2)} → ${pickupUrl}`);
        return json(
          res,
          200,
          {
            ok: true,
            orderNumber: order.orderNumber,
            product: product.name,
            paid: {
              amount: `$${(product.price_cents / 100).toFixed(2)}`,
              asset: CONFIG.asset,
              network: CONFIG.network,
              txHash: settle.txHash,
            },
            pickupUrl,
            receipt: { emailedTo: order.buyerEmail || "(no email, see outbox)", file: receiptFile },
          },
          { "x-payment-response": Buffer.from(JSON.stringify({ success: true, txHash: settle.txHash })).toString("base64") }
        );
      }

      const pickupMatch = url.pathname.match(/^\/pickup\/([A-Za-z0-9_-]+)$/);
      if (req.method === "GET" && pickupMatch) {
        const order = findByPickupToken(pickupMatch[1]);
        if (!order) return html(res, 404, "<h2>Invalid pickup link</h2>");
        return html(
          res,
          200,
          `<!doctype html><meta charset="utf-8"><title>Pickup ${order.orderNumber}</title>
<body style="font-family:system-ui;max-width:560px;margin:40px auto">
<h2>✅ ${order.productName}</h2>
<p>Order <code>${order.orderNumber}</code> paid (<code>${order.txHash.slice(0, 18)}…</code>)</p>
<p style="background:#eff6ff;padding:12px;border-radius:8px">Fulfillment: ${order.deliveryNote || "instant"}<br>
<i>Prototype: merchant injects codes/download links here in production.</i></p></body>`
        );
      }

      const orderMatch = url.pathname.match(/^\/agent\/order\/([^/]+)$/);
      if (req.method === "GET" && orderMatch) {
        const order = findByOrderNumber(decodeURIComponent(orderMatch[1]));
        if (!order) return json(res, 404, { error: "order not found" });
        const { pickupToken, ...pub } = order;
        return json(res, 200, { ...pub, pickupUrl: `${base}/pickup/${pickupToken}` });
      }

      if (url.pathname === "/") {
        return json(res, 200, {
          service: "agentpay-gateway",
          catalog: "/.well-known/agent-store.json",
          health: "/health",
          mcp: "stdio mcp/server.mjs",
        });
      }
      json(res, 404, { error: "not found" });
    } catch (err) {
      console.error(err);
      json(res, 500, { error: "internal error", detail: String(err.message || err) });
    }
  });
}

const isMain = Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
if (isMain) {
  createServer().listen(CONFIG.port, CONFIG.host, () =>
    console.log(`AgentPay gateway → http://${CONFIG.host}:${CONFIG.port}  (facilitator: ${CONFIG.facilitator}, upstream: ${CONFIG.upstreamCatalog})`)
  );
}
