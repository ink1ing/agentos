# AgentPay

**One line of code turns any shop into an x402 store that AI agents can pay in stablecoins.**

Binance Agent OS Mini Hackathon — **Track A** (build an AI agent with Agent OS). Deadline 2026-09-08 23:59 UTC.

Stripe put card checkout on a website with one snippet. MoonPay did the same for fiat on-ramps. AgentPay does it for **agent commerce**: a merchant pastes a script, an agent reads `/.well-known/agent-store.json`, hits HTTP 402, pays USDT on BNB Chain via Binance OnchainPay (B402), and the buyer gets a pickup link plus a receipt.

The first live catalog is [store.shangdian.me](https://store.shangdian.me) (read-only). Production orders and SQLite are never written.

## Quick start

Node 18+. No npm install.

```bash
node gateway/server.mjs
# another terminal
node agent/buy.mjs apple
npm test
```

Live: [pay.shangdian.me](https://pay.shangdian.me) (landing + mock buy) · [shop demo](https://pay.shangdian.me/shop) (merchant snippet + badge) · [agent-store.json](https://pay.shangdian.me/.well-known/agent-store.json). Facilitator is mock until B402 merchant keys are set.

Claude Desktop: merge `mcp/claude-desktop.json`. Local: `GATEWAY=http://localhost:8402`. Remote: `GATEWAY=https://pay.shangdian.me`. Then say *buy me Apple One under ten dollars*.

## What the agent does

1. `list_products` — search the real digital catalog
2. `quote_product` — price, network, asset, one-time `confirmToken`
3. Human must approve the quote
4. `buy_product` — HTTP 402 → wallet adapter signs → settle → pickup URL
5. `get_order` — timeline + tx hash

Default facilitator is **mock** (no funds move). Wire shape is x402 v2 / B402 (`/papi/v2/b402/{supported,verify,settle}` + Tesla RSA). Set `FACILITATOR=binance` and the four `B402_*` env vars after merchant onboarding.

Per-tx cap: **$10** (Agent OS x402 daily cap is $20). Demo SKUs: Apple One **$8.88**, Notion team **$10**.

## Layout

| Path | Role |
|---|---|
| `gateway/` | Catalog proxy, quote, x402 buy, pickup, receipts |
| `mcp/server.mjs` | stdio MCP for Claude Desktop / Claude Code |
| `agent/buy.mjs` | CLI buyer (same protocol as MCP) |
| `public/` | Landing + merchant shop demo |
| `snippet/agentpay.js` | Merchant `<script>` — JSON-LD scan + agent-ready badge |
| `gateway/lib/wallet.mjs` | `MockWallet` now; Trust Wallet AgentKit / viem EIP-3009 later |
| `docs/` | Protocol notes, B402, hackathon rules |
| `pitch/` | Tweet copy, video script, architecture |

## Env

See `.env.example`. Never commit `B402_PRIVATE_KEY`.

## Security

Confirm tokens and payment nonces are one-shot. See `SECURITY.md`.

## License

MIT
