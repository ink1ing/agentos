#!/usr/bin/env node
// Zero-dep test runner for AgentPay gateway + MCP
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "tests/fixtures/catalog.json");

let passed = 0;
let failed = 0;
function assert(cond, name) {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

async function startFixtureCatalog() {
  const catalog = fs.readFileSync(FIXTURE);
  return new Promise((resolve) => {
    const s = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(catalog);
    });
    s.listen(0, "127.0.0.1", () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

async function startGateway({ catalogUrl, tmp }) {
  const env = {
    ...process.env,
    PORT: "0",
    UPSTREAM_CATALOG: catalogUrl,
    AGENTPAY_DATA_DIR: path.join(tmp, "data"),
    AGENTPAY_OUTBOX_DIR: path.join(tmp, "outbox"),
    FACILITATOR: "mock",
    CATALOG_TTL_MS: "0",
  };
  // import after env so CONFIG picks it up — spawn a child instead
  const child = spawn(process.execPath, [path.join(ROOT, "scripts/listen.mjs")], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("gateway start timeout")), 8000);
    let buf = "";
    child.stdout.on("data", (c) => {
      buf += c;
      const m = buf.match(/PORT=(\d+)/);
      if (m) {
        clearTimeout(t);
        resolve(Number(m[1]));
      }
    });
    child.stderr.on("data", (c) => process.stderr.write(c));
    child.on("exit", (code) => reject(new Error(`gateway exited ${code}`)));
  });
  return { child, base: `http://127.0.0.1:${port}` };
}

function rpc(proc, method, params, id) {
  return new Promise((resolve, reject) => {
    const onLine = (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.id === id) {
          proc.stdout.off("line", onLine);
          resolve(msg);
        }
      } catch {}
    };
    proc.stdout.on("line", onLine);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => reject(new Error(`rpc timeout ${method}`)), 8000);
  });
}

function attachLine(proc) {
  let buf = "";
  proc.stdout.on("data", (c) => {
    buf += c;
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      proc.stdout.emit("line", line);
    }
  });
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agentpay-"));
  const cat = await startFixtureCatalog();
  const gw = await startGateway({ catalogUrl: cat.url, tmp });
  const base = gw.base;

  console.log("\n[gateway]");
  const health = await (await fetch(`${base}/health`)).json();
  assert(health.ok && health.facilitator === "mock", "health");

  const store = await (await fetch(`${base}/.well-known/agent-store.json`)).json();
  assert(store.products.length === 3, "digital-only catalog (3, not shipping)");
  assert(store.products.every((p) => p.id !== "prod-phone"), "excludes physical");
  assert(store.paymentProtocol === "x402/v2", "protocol x402/v2");

  const over = await fetch(`${base}/agent/buy/prod-chatgpt`, { method: "POST" });
  assert(over.status === 400, "over cap rejected");

  const noConfirm = await fetch(`${base}/agent/buy/prod-brief`, { method: "POST" });
  assert(noConfirm.status === 409, "buy without confirm → 409");

  const quote = await (
    await fetch(`${base}/agent/quote/prod-brief`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
  ).json();
  assert(!!quote.confirmToken && quote.amountCents === 888, "quote issues token");

  const chalRes = await fetch(`${base}/agent/buy/prod-brief`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-confirm-token": quote.confirmToken },
    body: "{}",
  });
  assert(chalRes.status === 402, "confirmed buy → 402");
  const chal = await chalRes.json();
  assert(chal.accepts[0].nonce && chal.accepts[0].asset === "USDT", "402 accepts USDT");

  const replayConfirm = await fetch(`${base}/agent/buy/prod-brief`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-confirm-token": quote.confirmToken },
    body: "{}",
  });
  assert(replayConfirm.status === 409, "confirm token one-shot");

  const quote2 = await (
    await fetch(`${base}/agent/quote/prod-brief`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "demo@agentpay.local" }),
    })
  ).json();
  const chal2 = await (
    await fetch(`${base}/agent/buy/prod-brief`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-confirm-token": quote2.confirmToken },
      body: "{}",
    })
  ).json();
  const { defaultWallet } = await import(path.join(ROOT, "gateway/lib/wallet.mjs"));
  const header = defaultWallet().sign({ challenge: chal2.accepts[0], email: "demo@agentpay.local" });
  const paid = await fetch(`${base}/agent/buy/prod-brief`, {
    method: "POST",
    headers: { "x-payment": header, "content-type": "application/json", "user-agent": "test" },
    body: JSON.stringify({ email: "demo@agentpay.local" }),
  });
  const paidBody = await paid.json();
  assert(paid.status === 200 && paidBody.ok, "settled order");
  assert(paidBody.paid.txHash.startsWith("0x"), "tx hash");

  const replayPay = await fetch(`${base}/agent/buy/prod-brief`, {
    method: "POST",
    headers: { "x-payment": header, "content-type": "application/json" },
    body: "{}",
  });
  const replayBody = await replayPay.json();
  assert(replayPay.status === 402 && /expired|invalid/.test(replayBody.error || ""), "nonce replay rejected");

  const pickup = await fetch(paidBody.pickupUrl);
  assert(pickup.status === 200 && (await pickup.text()).includes("apple one"), "pickup page");

  const looked = await (await fetch(`${base}/agent/order/${paidBody.orderNumber}`)).json();
  assert(looked.orderNumber === paidBody.orderNumber && !looked.pickupToken, "order lookup hides token field");

  console.log("\n[mcp]");
  const mcp = spawn(process.execPath, [path.join(ROOT, "mcp/server.mjs")], {
    env: { ...process.env, GATEWAY: base },
    stdio: ["pipe", "pipe", "pipe"],
  });
  attachLine(mcp);
  const init = await rpc(mcp, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "0" } }, 1);
  assert(init.result.serverInfo.name === "agentpay", "mcp initialize");
  const tools = await rpc(mcp, "tools/list", undefined, 2);
  const names = tools.result.tools.map((t) => t.name).sort();
  assert(names.join(",") === "buy_product,get_order,list_products,quote_product", "four tools");

  const listed = await rpc(mcp, "tools/call", { name: "list_products", arguments: { query: "apple" } }, 3);
  const listedData = JSON.parse(listed.result.content[0].text);
  assert(listedData.count === 1 && listedData.products[0].id === "prod-brief", "mcp list apple");

  const noTok = await rpc(mcp, "tools/call", { name: "buy_product", arguments: { productId: "prod-brief", confirmToken: "bogus" } }, 4);
  assert(noTok.result.isError, "mcp buy without valid confirm is error");

  const q = await rpc(mcp, "tools/call", { name: "quote_product", arguments: { productId: "prod-brief", email: "a@b.c" } }, 5);
  const qData = JSON.parse(q.result.content[0].text);
  assert(qData.status === "needs_confirmation" && qData.confirmToken, "mcp quote");

  const bought = await rpc(
    mcp,
    "tools/call",
    { name: "buy_product", arguments: { productId: "prod-brief", confirmToken: qData.confirmToken, email: "a@b.c" } },
    6
  );
  assert(!bought.result.isError, "mcp buy after quote");
  const bData = JSON.parse(bought.result.content[0].text);
  assert(bData.status === "paid" && bData.orderNumber, "mcp paid");

  const got = await rpc(mcp, "tools/call", { name: "get_order", arguments: { orderNumber: bData.orderNumber } }, 7);
  assert(JSON.parse(got.result.content[0].text).orderNumber === bData.orderNumber, "mcp get_order");

  const unknown = await rpc(mcp, "tools/call", { name: "nope", arguments: {} }, 8);
  assert(unknown.result.isError, "unknown tool is error");

  mcp.kill();
  gw.child.kill();
  cat.server.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
