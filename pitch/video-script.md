# Demo video — 40 seconds, Track A

Record 1920×1080, 16:9. English VO. Burn English subs. Keep a silent B-roll of the CLI as backup.

## Shot list

| t | Screen | VO |
|---|---|---|
| 0:00–0:04 | https://pay.shangdian.me/shop (fake USDT QR) | "This shop still collects USDT with a QR code." |
| 0:04–0:08 | Green **agent-ready · x402** badge already on the shop page | "One script. The catalog is now agent-readable." |
| 0:08–0:16 | Claude Desktop: "Buy Apple One under ten dollars." MCP `list_products` then `quote_product` card ($8.88 USDT / bsc) | "Claude finds Apple One at eight eighty-eight USDT on BNB Chain." |
| 0:16–0:20 | You type "yes". `buy_product` with confirmToken | "I confirm. The agent cannot pay without this token." |
| 0:20–0:28 | Terminal or network panel: HTTP 402 accepts[] → X-PAYMENT → 200 + tx hash | "HTTP 402, x402 v2, Binance B402 settlement path." |
| 0:28–0:36 | Pickup page + HTML receipt (order id, tx, timeline) | "Pickup link and receipt. No new account for the buyer." |
| 0:36–0:40 | End card: AgentPay · Track A · pay.shangdian.me · github.com/ink1ing/agentos | "AgentPay. Track A. GitHub in the post." |

## Backup if Claude Desktop flakes

Same VO, replace 0:08–0:28 with:

```
node gateway/server.mjs
node agent/buy.mjs apple
```

CLI already does quote → confirm → 402 → settle.

## Do not show

`.env`, `B402_PRIVATE_KEY`, production admin, any real seed, emails that are not `demo@`.
