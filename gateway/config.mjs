// AgentPay gateway config
export const CONFIG = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 8402),
  upstreamCatalog: process.env.UPSTREAM_CATALOG || "https://store.shangdian.me/api/catalog",
  storeName: process.env.STORE_NAME || "Silas Store",
  storeUrl: process.env.STORE_URL || "https://store.shangdian.me",
  payTo: process.env.PAY_TO || "0xDEMO000000000000000000000000000000000402",
  network: process.env.X402_NETWORK || "bsc",
  asset: process.env.X402_ASSET || "USDT",
  facilitator: process.env.FACILITATOR || "mock",
  challengeTtlSec: Number(process.env.CHALLENGE_TTL_SEC || 300),
  maxAmountCents: Number(process.env.MAX_AMOUNT_CENTS || 1000),
  dataDir: process.env.AGENTPAY_DATA_DIR || new URL("./data/", import.meta.url).pathname,
  outboxDir: process.env.AGENTPAY_OUTBOX_DIR || new URL("./outbox/", import.meta.url).pathname,
};
