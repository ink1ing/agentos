# 競品與差異化筆記

> 整理日期:2026-09-02。※ 各家細節提交前需再核實最新狀態。

## 賽道格局:agentic commerce 支付

| 玩家 | 定位 | 與我們的關係 |
|---|---|---|
| Stripe(agentic commerce / ACP) | Web2 商家側 agent 收單,法幣為主 | 敘事最接近,但不走穩定幣/鏈上;我們主打 crypto-native + 零開戶 |
| Google AP2 | agent 支付授權/意圖協議(mandate) | 是授權層不是結算層,可互補,demo 不用碰 |
| Coinbase x402 生態 | 協議發起者 + Base facilitator | 我們是「用協議的人」,在 BNB Chain 上用 Binance facilitator 更貼賽事 |
| Skyfire | agent 身分 + 支付網路 | 偏 agent-to-agent API 付費,不做電商商品層 |
| MoonPay | 法幣出入金 widget,「一行代碼」接入模式 | **模式參考對象**:我們是「x402 版 MoonPay widget」,但方向相反(商家收穩定幣) |

## 我們的差異化(押注點)

1. **商家側零改造**:一段 `<script>` / 一個 SDK call,把現有購物網站的商品目錄變成 agent 可讀 + x402 可付(競品都要求商家做深度整合)
2. **實體/半實體商品閉環**:x402 生態現在幾乎全是 API/數位內容付費;我們補「取貨連結 + 郵件憑證 + escrow」這段鏈下履約
3. **貼 Binance 生態**:BNB Chain + Binance x402 facilitator + Agent OS 限額模型,評審是 Binance
