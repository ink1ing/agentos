# Architecture

```
Claude Desktop / Claude Code
        │  stdio MCP
        ▼
 mcp/server.mjs
   list_products | quote_product | buy_product | get_order
        │  HTTP
        ▼
 gateway/server.mjs  (https://pay.shangdian.me)
   GET  /  /shop  /snippet/agentpay.js
   GET  /.well-known/agent-store.json
   POST /agent/quote/:id     → confirmToken
   POST /agent/buy/:id       → 409 unless confirm, else 402 / settle
   GET  /pickup/:token
   GET  /agent/order/:id
        │
        ├── catalog.mjs  → store.shangdian.me/api/catalog (read-only, digital SKUs)
        ├── confirm.mjs  → one-shot human gate
        ├── x402.mjs     → v2 accepts[] + nonce
        ├── wallet.mjs   → MockWallet (demo) / Trust Wallet AgentKit (prod)
        ├── facilitator.mjs
        │     mock  → structured verify, fake tx
        │     binance → POST /papi/v2/b402/verify then /settle (Tesla RSA)
        └── mailer.mjs   → outbox/*.html (SMTP later)
```

Facilitator is swappable on purpose. Demo ships mock; B402 credentials flip the same wire to mainnet USDT.
