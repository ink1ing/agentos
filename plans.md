# AgentPay — Binance Agent OS Mini Hackathon 作戰計畫

> 建立:2026-09-02 · 規則確認:2026-09-03
> 狀態:**Phase 3** — 公開閘道 https://pay.shangdian.me 已上線(mock facilitator);待錄影與 X 提交
> 截止:**2026-09-08 23:59 UTC**(約 5 天)
> 官方:[agent-os](https://www.binance.com/en/agent-os) · 規則細節見 `docs/hackathon-rules.md`

---

## 1. 一句話定位

**「x402 版的 MoonPay」**:開發者框架,讓任何購物網站貼一段代碼就能被 AI agent 讀懂並用穩定幣下單。用戶在對話裡說「我要買 X」→ agent 選品 → Binance x402(B402)秒付 USDT → 取貨連結 + 收據進郵箱。

**電梯簡報:**
> Stripe 讓網站一行代碼收信用卡;MoonPay 讓網站一行代碼做法幣入金;我們讓網站一行代碼把商品賣給 AI agent。商家零改造,買家零開戶,結算走 BNB Chain 上的 Binance OnchainPay B402。現有店 store.shangdian.me 已作為第一個真實商家。

---

## 2. 賽道選擇:**主投 A,B 當加分項不硬衝**

官方只有兩條賽道,沒有「支付賽道」:

| | A 用 Agent OS 建代理 | B 連 MCP 並交易 |
|---|---|---|
| 獎金 | 20K USDC | 40K USDC |
| 我們適配度 | **高** — 購物 agent + x402 Pay 是 Agent OS 明確列出的能力 | 低 — B 的評審中心是「接 MCP **成交加密交易**」,不是買虛擬商品 |

**決定:投賽道 A。** 理由:
1. 產品本質是「用 Agent OS 的 Pay(x402)+ MCP 建一個購物代理」,正好是 A 的題面。
2. B 的 40K 看起來香,但「進行交易」大概率指交易所下單/成交;硬把電商付款講成交易,評審會覺得跑題,兩邊都拿不到。
3. 提交格式官方只對 A 寫死了「影片/demo + GitHub」,我們的交付物對得上。
4. 時間只剩 5 天,分兵打 B 會把 demo 做爛。

**B 的最小加分(不做承諾):** 在 MCP server 裡順便暴露一個只讀的 Binance MCP 工具(行情),demo 旁白提一句「同一套 agent 也能讀盤」,但評審頁面明確標賽道 A。

合規:作者所在司法轄區需自行核對 [禁止清單](https://www.binance.com/en/about-legal/list-of-prohibited-countries);香港/新加坡/美國/英國/EEA 官方寫明不適用。

---

## 3. 5 天倒計時(砍掉一切非 demo 路徑)

Escrow 合約、KYC、真 SMTP、假商店 **全部砍掉**。評審看 30 秒影片,不看合約審計。

### Day 0(已完成,9/2–9/3)
- [x] 調研 x402 / Agent OS / 競品
- [x] 確認官方規則與兩條賽道
- [x] 對接 store.shangdian.me 真實目錄(8 個數位商品)
- [x] mock facilitator 全鏈路:402 → X-PAYMENT → 訂單 → 取貨頁 → HTML 收據
- [x] nonce 防重放、單筆 $10 上限
- [x] 商家 snippet `agentpay.js`
- [x] B402 協議對齊:`/papi/v2/b402/{supported,verify,settle}` + Tesla RSA 簽名(`docs/research-b402.md`)

### Day 1(9/3–9/4)— MCP,這是賽道 A 的命門
- [x] 寫一個 MCP server(`mcp/server.mjs`):tools = `list_products` / `buy_product` / `get_order`
- [x] MCP JSON-RPC 已驗證可買到 apple one;Claude Desktop 配置檔 `mcp/claude-desktop.json`(需本機把 JSON 合進設定)
- [ ] 錄一段「對話購物」螢幕(即使付款仍是 mock) — 腳本見 pitch/video-script.md;公開頁 https://pay.shangdian.me 與 /shop 已可當 B-roll

### Day 2(9/4–9/5)— 真付款或可信 mock
優先序:
1. 若拿得到 B402 商家憑證(`B402_*` 四個 env)→ `FACILITATOR=binance`,testnet/小額真結算
2. 拿不到 → **誠實標 mock**,但 wire 形狀保持 B402 V2(已做到);影片旁白講「接入官方 B402,待商家 onboarding」
3. 不要為了真鏈去申請來不急的 onboarding 而卡死 demo

並行:
- [ ] 買家側:能講清楚「正式版走 Trust Wallet AgentKit / `@bnb-chain/b402` client + eip3009」
- [ ] demo 商品鎖定 **apple one $8.88** 與 **notion team $10**(卡在 $10 上限內)。更貴的只展示目錄不開放 buy

### Day 3(9/5–9/6)— 影片與 GitHub
- [ ] 30–45 秒 demo 影片腳本(見 §4),錄兩條:一條成功、一條備用
- [x] GitHub 公開 repo https://github.com/ink1ing/agentos ,README 英文
- [x] 公開落地頁可走 quote → 402 → mock settle → pickup;截圖可直接從 pay.shangdian.me 抓

### Day 4(9/6–9/7)— 提交包
- [ ] 關注 @Binance 並轉發官方帖
- [ ] 引用轉發:影片 + GitHub 連結 + 一句定位
- [ ] 填 [調查問卷](https://app.binance.com/uni-qr/user-survey/2913aa200aac462c89a737779393f3d4)
- [ ] 再看一遍禁止司法轄區條款

### Day 5(9/8)— 緩衝
- [ ] 截止前 6 小時不再改代碼,只修 README / 重傳影片
- [ ] 23:59 UTC 前確認推文仍在、連結可點

---

## 4. Demo 腳本(目標 35 秒,賽道 A)

1. 【4s】打開 store.shangdian.me:「這是一個現有的虛擬商品店,USDT 還在掃 QR。」切到一行 `<script src="agentpay.js">` → 頁角出現 agent-ready 徽章
2. 【8s】Claude:「幫我買 apple one,預算 10 刀」→ MCP `list_products` 回商品卡 $8.88
3. 【12s】確認 → MCP `buy_product` → 畫面閃 HTTP 402(USDT / bsc / B402)→ 簽名 → 200 + tx hash
4. 【8s】打開取貨連結 + 收據 HTML:訂單號、tx、時間線。「商家一行代碼,買家沒註冊,結算走 Binance x402。」
5. 【3s】片尾 GitHub URL + 「Track A · AgentPay」

備用:若 MCP 當天連不上,用已跑通的 `node agent/buy.mjs "apple"` CLI agent,旁白改成「同一協議,CLI agent 與 Claude 共用」。

---

## 5. 產品模組(砍後)

| 模組 | 狀態 | 5 天內做什麼 |
|---|---|---|
| A 商家 SDK / snippet | 原型有 | 不再擴功能;影片裡貼一次 |
| B x402 + B402 facilitator | mock 通、binance 協議已寫 | 有憑證就切真;沒有就 mock + 講 B402 |
| C escrow 合約 | **砍** | deck 一句「roadmap:托管再釋放」即可 |
| D 收據 / 取貨 | outbox HTML | 不上真郵件 |
| E MCP server | **已通 + 確認閘門** | quote_product → confirmToken → buy_product |
| Tests / repo | **已通** | `npm test` · LICENSE · SECURITY · 英文 README · pitch/ |

Agent OS 限額提醒:x402 支付預設 **$20/日**。demo 只打 $8.88 / $10,錄影前不要燒額度。

---

## 6. 風險(更新)

| 風險 | 應對 |
|---|---|
| 投錯賽道 | 已鎖定 A;提交文案寫 Track A,不要提「我們也算交易」 |
| B402 商家 onboarding 5 天拿不到 | 預設路徑。協議對齊 + mock,影片誠實 |
| MCP 文件/鑑權卡住 | 先做本地 stdio MCP;Binance MCP 只讀行情當彩蛋 |
| $20/日限額 | 商品白名單;錄影用新錢包 |
| 提交渠道是 X,連結失效 | 影片同時傳 YouTube unlisted + GitHub release |
| 司法轄區不合規 | 提交前核對禁止清單;不確定就不交 |

---

## 7. 資料夾

```
shangdian-maintenance/x402/
├── plans.md
├── README.md
├── docs/
│   ├── hackathon-rules.md          ← 官方規則
│   ├── research-x402-protocol.md
│   ├── research-binance-agent-os.md
│   ├── research-b402.md            ← 官方 SDK / Tesla 簽名 / 三端點
│   └── competitors.md
├── gateway/                        ← 支付網關(對接真實目錄)
├── agent/buy.mjs                   ← CLI demo agent
├── snippet/agentpay.js
├── mcp/
├── public/                         ← landing + /shop
└── pitch/
```
