// Facilitator 抽象:驗證與結算可插拔
// - mock:本地 demo,校驗 payload 結構與金額,生成偽 tx hash
// - binance:Binance OnchainPay B402 facilitator(官方,BNB Chain)
//   協議來源:@bnb-chain/b402 SDK(/papi/v2/b402/supported·verify·settle,
//   RSA "Tesla" 簽名:sign(body+timestamp),信封 {code:"000000",message,data})
import crypto from "node:crypto";
import { CONFIG } from "../config.mjs";

// ---------- mock ----------
async function mockVerify({ payment, challenge }) {
  const p = payment?.payload || {};
  if (!p.from || !p.signature) return { ok: false, reason: "missing from/signature" };
  if (String(payment.network) !== CONFIG.network) return { ok: false, reason: "wrong network" };
  if (String(payment.asset || CONFIG.asset) !== CONFIG.asset) return { ok: false, reason: "wrong asset" };
  if (Number(p.amountCents) !== challenge.amountCents) return { ok: false, reason: "amount mismatch" };
  await new Promise((r) => setTimeout(r, 300));
  return {
    ok: true,
    txHash: "0x" + crypto.createHash("sha256").update(p.signature + challenge.productId).digest("hex"),
    settledBy: "mock-facilitator",
  };
}

// ---------- Binance B402 ----------
// 需要商家 onboarding 後的四個環境變數:
//   B402_BASE_URL(如 https://cb.binanceapi.com)、B402_CLIENT_ID、
//   B402_ACCESS_TOKEN、B402_PRIVATE_KEY(base64 PKCS#8 DER 或 PEM)
function b402Env() {
  const { B402_BASE_URL, B402_CLIENT_ID, B402_ACCESS_TOKEN, B402_PRIVATE_KEY } = process.env;
  if (!B402_BASE_URL || !B402_CLIENT_ID || !B402_ACCESS_TOKEN || !B402_PRIVATE_KEY) return null;
  return { baseUrl: B402_BASE_URL, clientId: B402_CLIENT_ID, accessToken: B402_ACCESS_TOKEN, privateKey: B402_PRIVATE_KEY };
}

function loadRsaKey(raw) {
  if (raw.includes("BEGIN")) return crypto.createPrivateKey(raw);
  // 一行 base64:可能是 PKCS#8 DER,也可能是包了 base64 的 PEM
  const buf = Buffer.from(raw.trim(), "base64");
  const asText = buf.toString("utf8");
  if (asText.includes("BEGIN")) return crypto.createPrivateKey(asText);
  return crypto.createPrivateKey({ key: buf, format: "der", type: "pkcs8" });
}

async function b402Call(env, path, request) {
  const body = JSON.stringify(request);
  const timestamp = String(Date.now());
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(body + timestamp), loadRsaKey(env.privateKey))
    .toString("base64");
  const res = await fetch(env.baseUrl + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Tesla-ClientId": env.clientId,
      "SignAccessToken": env.accessToken,
      "Timestamp": timestamp,
      "Signature": signature,
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`b402 ${path} HTTP ${res.status}`);
  const envelope = await res.json();
  if (envelope.code !== "000000") throw new Error(`b402 ${path} ${envelope.code}: ${envelope.message}`);
  return envelope.data; // 應用層失敗(isValid:false / success:false)仍是 HTTP 200,由呼叫方判斷
}

async function binanceVerify({ payment, challenge, requirements }) {
  const env = b402Env();
  if (!env) return { ok: false, reason: "B402_* env not configured (需先完成商家 onboarding)" };
  const request = {
    x402Version: 2,
    paymentPayload: payment,          // x402 V2 payment payload(eip3009 / permit2-exact)
    paymentRequirements: requirements, // 402 挑戰時下發的 accepts[0]
  };
  const verify = await b402Call(env, "/papi/v2/b402/verify", request); // 離線驗簽,無 gas 可重試
  if (!verify?.isValid) return { ok: false, reason: `b402 verify: ${verify?.invalidReason || "invalid"}` };
  const settle = await b402Call(env, "/papi/v2/b402/settle", request); // 不可逆上鏈,verify 通過才調
  if (!settle?.success) return { ok: false, reason: `b402 settle: ${settle?.errorReason || "failed"}` };
  return { ok: true, txHash: settle.transaction || settle.txHash || "", settledBy: "binance-b402" };
}

export async function verifyAndSettle(args) {
  return CONFIG.facilitator === "binance" ? binanceVerify(args) : mockVerify(args);
}
