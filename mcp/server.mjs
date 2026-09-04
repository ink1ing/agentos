#!/usr/bin/env node
// AgentPay MCP server (stdio, JSON-RPC 2.0, zero deps)
// Tools: list_products / quote_product / buy_product / get_order
import readline from "node:readline";
import { defaultWallet } from "../gateway/lib/wallet.mjs";

const GATEWAY = process.env.GATEWAY || "http://localhost:8402";
const wallet = defaultWallet();

const TOOLS = [
  {
    name: "list_products",
    description:
      "List or search digital products an agent can buy with x402/USDT on BNB Chain. Call this before quoting.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string", description: "Optional search string (name/subtitle/description)" },
      },
    },
  },
  {
    name: "quote_product",
    description:
      "Prepare a purchase quote. Returns price, network, asset, and a one-time confirmToken. Show the quote to the human and wait for explicit approval before calling buy_product.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        productId: { type: "string", description: "Product id from list_products" },
        email: { type: "string", description: "Optional receipt email" },
      },
      required: ["productId"],
    },
  },
  {
    name: "buy_product",
    description:
      "Complete an x402 purchase. Requires confirmToken from quote_product. Handles HTTP 402, signs with the configured wallet adapter, settles, returns pickup URL and receipt. Never invent a confirmToken.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        productId: { type: "string" },
        confirmToken: { type: "string", description: "One-time token from quote_product" },
        email: { type: "string" },
      },
      required: ["productId", "confirmToken"],
    },
  },
  {
    name: "get_order",
    description: "Look up an AgentPay order by orderNumber (AP-YYYYMMDD-XXXXXX).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { orderNumber: { type: "string" } },
      required: ["orderNumber"],
    },
  },
];

function ok(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function fail(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textResult(obj) {
  const text = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  return { content: [{ type: "text", text }] };
}

async function listProducts(query) {
  const res = await fetch(`${GATEWAY}/.well-known/agent-store.json`);
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const store = await res.json();
  let products = store.products || [];
  if (query) {
    const q = String(query).toLowerCase();
    products = products.filter((p) => (p.name + p.subtitle + p.description).toLowerCase().includes(q));
  }
  return {
    store: store.store,
    paymentProtocol: store.paymentProtocol,
    count: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      priceUsd: p.price.amountCents / 100,
      deliveryEta: p.deliveryEta,
      category: p.category,
      buyable: p.price.amountCents <= 1000,
    })),
  };
}

async function quoteProduct(productId, email) {
  const res = await fetch(`${GATEWAY}/agent/quote/${encodeURIComponent(productId)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email || "" }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || JSON.stringify(body));
  return {
    status: "needs_confirmation",
    instruction: "Show this quote to the user. Call buy_product only after they explicitly approve.",
    ...body,
  };
}

async function buyProduct(productId, confirmToken, email) {
  const catalog = await listProducts();
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) throw new Error(`unknown productId ${productId} — call list_products first`);
  if (!product.buyable) throw new Error(`${product.name} is $${product.priceUsd}, above demo cap $10`);

  const buyUrl = `${GATEWAY}/agent/buy/${encodeURIComponent(productId)}`;
  const challengeRes = await fetch(buyUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-confirm-token": confirmToken },
    body: JSON.stringify({ email: email || "", confirmToken }),
  });
  if (challengeRes.status === 409) {
    const body = await challengeRes.json();
    throw new Error(body.error || "confirmation required or invalid");
  }
  if (challengeRes.status !== 402) {
    const body = await challengeRes.text();
    throw new Error(`expected HTTP 402, got ${challengeRes.status}: ${body.slice(0, 300)}`);
  }
  const challengeBody = await challengeRes.json();
  const challenge = challengeBody.accepts?.[0];
  if (!challenge) throw new Error("402 missing accepts[0]");

  const paid = await fetch(buyUrl, {
    method: "POST",
    headers: {
      "x-payment": wallet.sign({ challenge, email: email || "" }),
      "content-type": "application/json",
      "user-agent": "agentpay-mcp/0.1",
    },
    body: JSON.stringify({ email: email || "" }),
  });
  const result = await paid.json();
  if (!result.ok) throw new Error(result.error || JSON.stringify(result));
  return {
    status: "paid",
    protocol: "x402/v2",
    wallet: wallet.kind,
    challenge: { amount: challenge.maxAmountRequired, asset: challenge.asset, network: challenge.network },
    ...result,
  };
}

async function getOrder(orderNumber) {
  const res = await fetch(`${GATEWAY}/agent/order/${encodeURIComponent(orderNumber)}`);
  if (res.status === 404) throw new Error("order not found");
  if (!res.ok) throw new Error(`order lookup ${res.status}`);
  return res.json();
}

async function callTool(name, args = {}) {
  if (name === "list_products") return listProducts(args.query);
  if (name === "quote_product") return quoteProduct(args.productId, args.email);
  if (name === "buy_product") return buyProduct(args.productId, args.confirmToken, args.email);
  if (name === "get_order") return getOrder(args.orderNumber);
  throw new Error(`unknown tool ${name}`);
}

async function handle(msg) {
  if (msg.method === "initialize") {
    return ok(msg.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "agentpay", version: "0.2.0" },
    });
  }
  if (msg.method === "notifications/initialized") return null;
  if (msg.method === "ping") return ok(msg.id, {});
  if (msg.method === "tools/list") return ok(msg.id, { tools: TOOLS });
  if (msg.method === "tools/call") {
    try {
      const data = await callTool(msg.params?.name, msg.params?.arguments || {});
      return ok(msg.id, textResult(data));
    } catch (err) {
      return ok(msg.id, { content: [{ type: "text", text: String(err.message || err) }], isError: true });
    }
  }
  if (msg.id !== undefined) return fail(msg.id, -32601, `method not found: ${msg.method}`);
  return null;
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  try {
    const reply = await handle(msg);
    if (reply) process.stdout.write(JSON.stringify(reply) + "\n");
  } catch (err) {
    if (msg.id !== undefined) {
      process.stdout.write(JSON.stringify(fail(msg.id, -32603, String(err.message || err))) + "\n");
    }
  }
});
