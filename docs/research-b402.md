# Binance OnchainPay B402 — 開發者接入筆記

> 整理日期:2026-09-03
> 主要來源:`@bnb-chain/b402@0.2.1` 官方 SDK README + `dist/server/Client.d.ts` / `Types.d.ts`

## 是什麼

B402 = Binance OnchainPay 的 **x402 v2 facilitator**,跑在 BNB Chain 上。商家不自己驗簽、不上鏈、不處理 gas;把付款轉發給 B402 的 `/verify` 與 `/settle`。

官方 npm:`pnpm add @bnb-chain/b402 @x402/core @x402/fetch viem`

相關文檔:[B402 Bazaar](https://developers.binance.com/docs/onchainpay-x402/b402-bazaar)(CDP Bazaar 擴展欄位對齊,可複用 `@coinbase/x402-fetch` 產出的 blob)。

## 支援 / 不支援

- 支援:`exact` scheme × **eip3009** 或 **permit2-exact**
- **不支援** permit2-upto(SDK 明確拒絕)
- 協議版本:**只接受 x402Version = 2**
- 穩定幣(先前調研):BNB Chain 上 U / USDT / USD1 / USDC;`extra.name` 是代幣 EIP-712 domain name,不是 ticker(例如 `"United Stables"` 不是 `"U"`)

## Facilitator 三端點

Base URL 來自商家 onboarding,例:`https://cb.binanceapi.com`

| 方法 | 路徑 | 作用 |
|---|---|---|
| POST | `/papi/v2/b402/supported` | 支援的 payment kinds + signer 地址(應快取) |
| POST | `/papi/v2/b402/verify` | **離線驗簽,無 gas,可重試** |
| POST | `/papi/v2/b402/settle` | **不可逆上鏈轉帳。必須先 verify** |

HTTP 永遠可能是 200;應用結果在信封 `data.isValid` / `data.success`。只有傳輸/認證問題才非 2xx。

信封:`{ code, message, data }`,`code === "000000"` 才是成功。

## Tesla 簽名(每筆請求)

```
to_sign   = JSON body 原文 + timestamp(毫秒字串,緊接)
signature = base64( RSA_PKCS1v15_SHA256(to_sign) )
headers   X-Tesla-ClientId / SignAccessToken / Timestamp / Signature
```

商家 RSA 私鑰格式:一行 Base64 PKCS#8 DER、Base64 包的 PEM、或 raw PEM。

## 環境變數(SDK `B402Client.fromEnv()`)

四個全無 → 視為未配置,安靜跳過。
只設一部分 → **直接 throw**(避免靜默換成別的結算語義)。

```
B402_BASE_URL
B402_CLIENT_ID
B402_ACCESS_TOKEN
B402_PRIVATE_KEY   # 或 B402_PRIVATE_KEY_B64
```

我們的 gateway 已按同一契約實作 `gateway/lib/facilitator.mjs` 的 `binance` 模式(未裝 SDK,手寫 Tesla 簽名,避免 hackathon 原型被依賴綁死)。上線切 `FACILITATOR=binance` + 四個 env。

## 商家伺服器最小接入(官方範例)

```ts
import { x402ResourceServer } from '@x402/core/server'
import { B402Client, B402ExactServerScheme, B402FacilitatorClient } from '@bnb-chain/b402/server'

const transport = B402Client.fromEnv()
const facilitator = new B402FacilitatorClient({ client: transport, onSettlementUnknown: queueForReconciliation })
const payments = new x402ResourceServer(facilitator).register('eip155:*', new B402ExactServerScheme({ facilitator }))
await payments.initialize()
```

買家側:`B402ExactClientScheme` + 錢包 account。EIP-3009 不需要 ERC-20 approve;Permit2 Exact 需要一次性 approve 到 canonical Permit2,並顯式列出受信任的 B402 spender。

## 安全注意

- `B402SettlementUnknownError`:結算可能已上鏈。必須持久化 handler event,對帳完成前不要接受第二次付款。
- 我們的 nonce 一次性消費 + 單筆 $10 上限仍要保留,即使切到真 facilitator。

## 來源

- npm [`@bnb-chain/b402`](https://www.npmjs.com/package/@bnb-chain/b402)
- [Coinbase x402 Facilitator API](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/x402-facilitator)(協議對照)
- [B402 Bazaar](https://developers.binance.com/docs/onchainpay-x402/b402-bazaar)
- [Binance x402 新聞稿(FinanceFeeds)](https://financefeeds.com/binance-launches-x402-for-programmable-payments-on-bnb-chain/)
