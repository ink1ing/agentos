# x402 協議研究筆記

> 整理日期:2026-09-02

## 是什麼

x402 是一個開放的 HTTP 支付協議,由 Coinbase 於 2025 年 5 月發布,啟用了 HTTP/1.0 規範中閒置 35 年的 `402 Payment Required` 狀態碼。目前由 x402 Foundation 治理(Coinbase 與 Cloudflare 為共同創始管理者)。它讓伺服器可以直接在 HTTP 請求-回應週期內向 AI agent / 機器收取穩定幣付款,**不需要 API key、帳號、訂閱**。

## 支付流程(核心)

1. Client(人 / 腳本 / AI agent)發送標準 HTTP 請求
2. 伺服器回 `402 Payment Required`,在結構化 header 裡帶付款指令(價格、可接受代幣、鏈 ID)
3. Client 用支援的穩定幣(通常 USDC)構造簽名付款 payload,帶 `X-PAYMENT` header 重試請求
4. 伺服器把驗證與結算交給 **facilitator**(Coinbase 託管或自建節點)
5. Facilitator 確認鏈上交易後,伺服器回傳資源

## 開發者接入方式

- 商家 / API 提供方在伺服器加上 x402 middleware(有 **Node.js / Python / Go SDK**),配置每個 endpoint 的定價,指向一個 facilitator
- Coinbase 公共 facilitator:每月 1,000 筆免費,之後每筆 $0.001
- 最小接入 = Node.js server + x402 middleware + 收款錢包(任何 EVM 或 Solana 錢包)+ client SDK
- Agent 側:錢包 + 處理 402 回應的邏輯;多數 agent 框架正在內建
- **建議用 V2 協議版本**(改進了識別符與模組化)

## 規模與採用

- 上線 5 個月處理超過 1 億筆交易
- 截至 2026 年 3 月:Base 上超過 1.19 億筆、Solana 上 3,500 萬筆,年化交易量約 $6 億,協議零手續費
- 支援鏈:Base、Ethereum、Arbitrum、Polygon、Solana(+ BNB Chain,見 Binance 筆記)

## 與其他協議的關係

- **x402 = 支付執行協議**(鏈上移動穩定幣)
- **Google A2A / AP2 = agent 通訊/授權協議**(發現與協調),兩者互補不互斥
- x402 不是代幣、不是鏈,是開放協議標準

## 已知風險

- 2026-05-12 有研究指出 x402 實作層潛在漏洞:metadata 過濾、payment pre-execution 風險 → 我們的框架要注意

## 來源

- [x402 官方白皮書 (PDF)](https://www.x402.org/x402-whitepaper.pdf)
- [Eco: x402 Protocol Explained](https://eco.com/support/en/articles/14839402-x402-protocol-explained)
- [Eco: How AI Agents Pay Onchain](https://eco.com/support/en/articles/12328618-x402-protocol-explained-how-ai-agents-pay-onchain)
- [Allium: x402 Explained](https://www.allium.so/blog/x402-explained-the-internet-native-payments-standard-for-apis-data-and-agent-commerce/)
- [Sherlock: The HTTP 402 Payment Protocol](https://sherlock.xyz/post/x402-explained-the-http-402-payment-protocol)
- [RZLT: Agentic Payments in 2026](https://www.rzlt.io/blog/agentic-payments-2026-x402-explainer)
- [Ad Valorem: Agentic Commerce and the x402 Protocol](https://advalorem.substack.com/p/agentic-commerce-and-the-x402-protocol)
- [Stablecoin Insider: x402 Protocol](https://stablecoininsider.org/x402-protocol/)
