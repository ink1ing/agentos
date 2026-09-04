# Binance Agent OS 與 Binance x402 研究筆記

> 整理日期:2026-09-02

## Binance Agent OS(2026-08-20 發布)

開發者平台 + 標準化接入層,把 AI 應用連接到 Binance 的交易、行情、錢包、支付與鏈上能力。隸屬 Binance Intelligence。

**組成:**
- Binance APIs
- Binance Wallet Agentic Hub
- **Binance x402(可編程支付)** ← 我們賽道的核心
- Binance Skill Hub
- MCP 支援(`https://agent.binance.com/mcp/agentic`,Streamable HTTP;ChatGPT、Claude Code、Codex、Cursor 均可接)
- 注意:支付與鏈上能力**尚未進 MCP server 本體**,要走 Agent OS 其他整合

**預設限額(對 demo 設計很重要):**
- Swap:$50,000/日
- DeFi:$100,000/日
- **x402 支付:$20/日** ← demo 商品定價必須壓在小額(如 $0.5–$5)

## Binance x402(2026-05-19 發布)

- 定位:**Binance Pay 在 BNB Chain 上的 x402 facilitator**,幫開發者/商家把數位服務變現(API、資料、agent 工具、自動化工作流)
- Facilitator 模式:驗證、結算、gas 全由 Binance 處理,商家走標準 HTTP API 接入,「幾分鐘上線、零自寫支付代碼」
- 支付方法:`eip3009`、`permit2-exact`、`permit2-upto`
- BNB Chain 支援穩定幣:**U、USDT、USD1、USDC**
- Trust Wallet AgentKit 原生支援(首個自託管 agent 支付閉環,私鑰不離開設備);Binance Wallet Agentic Wallet 整合開發中
- BNB Chain 優勢:高吞吐、低成本、EVM 相容 → 適合小額高頻(micro-access、pay-per-use)

## Mini Hackathon 情報狀態

三輪搜尋(中英文)**均未找到** "Agent OS Mini Hackathon" 支付賽道的公開規則、獎金、時間表 —— 應該只發布在 Binance 官方渠道。待辦:
- [ ] 查 binance.com/agent-os、Binance Build、binance.com/activity
- [ ] 查 Binance Square、官方 X(@BinanceHelpDesk 有 Agent OS 推文)、Discord
- [ ] 確認:截止日期、評審標準、是否要求用 Binance x402 facilitator / BNB Chain、提交格式(video/repo/live demo)

## 來源

- [PR Newswire: Binance Introduces Agent OS](https://www.prnewswire.com/news-releases/binance-introduces-agent-os-to-connect-ai-applications-to-financial-infrastructure-302856306.html)
- [TechCrunch: Binance now lets AI agents trade](https://techcrunch.com/2026/08/20/binance-now-lets-ai-agents-trade-but-keeping-them-in-check-is-largely-up-to-users/)
- [HackerNoon: Binance Launches Agent OS](https://hackernoon.com/binance-launches-agent-os-letting-ai-agents-trade-on-your-account-with-limits-you-set)
- [動區: 幣安開放 AI 代理交易](https://www.blocktempo.com/binance-agent-os-opens-ai-agents-crypto-trading/)
- [Zombit: 幣安 Agent OS 正式上線](https://zombit.info/binance-agent-os-officially-launched-ai-crypto-trading/)
- [FinanceFeeds: Binance Launches x402 on BNB Chain](https://financefeeds.com/binance-launches-x402-for-programmable-payments-on-bnb-chain/)
- [Blockonomi: Binance x402 HTTP-Native Payments for AI Agents](https://blockonomi.com/binance-x402-launches-http-native-programmable-payments-for-ai-agents-on-bnb-chain/)
- [U.Today: Binance Unveils x402 on BNB Chain](https://u.today/binance-unveils-x402-on-bnb-chain-for-programmable-http-payments)
- [Blockchain.News: Binance x402](https://blockchain.news/news/binance-x402-http-native-payments-bnb-chain)
- [X: @BinanceHelpDesk Agent OS 推文](https://x.com/BinanceHelpDesk/status/2091448014598811992)
