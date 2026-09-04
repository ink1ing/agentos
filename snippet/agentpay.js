/**
 * AgentPay 商家一行接入 snippet(模組 A 原型)
 * <script src="agentpay.js" data-gateway="https://pay.example.com"></script>
 * 作用:
 *  1. 掃描頁面 JSON-LD Product / data-agentpay 標記,生成 agent 可讀目錄
 *  2. 在 <head> 注入 <link rel="agent-store">,讓 agent 爬蟲可發現
 *  3. 頁角渲染 agent-ready 徽章
 */
(function () {
  var gateway = (document.currentScript && document.currentScript.dataset.gateway) || "";
  var products = [];
  // JSON-LD 優先
  document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
    try {
      var d = JSON.parse(s.textContent);
      (Array.isArray(d) ? d : [d]).forEach(function (item) {
        if (item["@type"] === "Product" && item.offers) {
          products.push({ name: item.name, price: item.offers.price, currency: item.offers.priceCurrency || "USD" });
        }
      });
    } catch (e) {}
  });
  // fallback:data-agentpay-* 標記
  document.querySelectorAll("[data-agentpay-name]").forEach(function (el) {
    products.push({ name: el.dataset.agentpayName, price: el.dataset.agentpayPrice, currency: el.dataset.agentpayCurrency || "USD" });
  });
  var link = document.createElement("link");
  link.rel = "agent-store";
  link.href = gateway ? gateway + "/.well-known/agent-store.json" : "/.well-known/agent-store.json";
  document.head.appendChild(link);
  window.__agentStore = { paymentProtocol: "x402/v2", gateway: gateway, products: products };
  var badge = document.createElement("div");
  badge.textContent = "🤖 agent-ready · x402";
  badge.style.cssText = "position:fixed;bottom:12px;right:12px;background:#111;color:#7fffb0;font:12px system-ui;padding:6px 10px;border-radius:16px;z-index:99999;opacity:.9";
  badge.title = products.length + " products discoverable by AI agents";
  document.body.appendChild(badge);
})();
