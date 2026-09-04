import { CONFIG } from "../config.mjs";

let cache = { at: 0, data: null };
const TTL_MS = Number(process.env.CATALOG_TTL_MS || 60_000);

export function resetCatalogCache() {
  cache = { at: 0, data: null };
}

export async function loadCatalog() {
  if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  const res = await fetch(CONFIG.upstreamCatalog, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`upstream catalog ${res.status}`);
  const raw = await res.json();
  cache = { at: Date.now(), data: raw };
  return raw;
}

export function toAgentStore(raw, baseUrl) {
  const products = (raw.products || [])
    .filter((p) => p.fulfillment === "digital")
    .map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle || "",
      description: (p.description || "").slice(0, 300),
      category: p.category_slug,
      price: { amountCents: p.price_cents, currency: "USD" },
      deliveryEta: p.delivery_note || "instant",
      x402: {
        buy: `${baseUrl}/agent/buy/${encodeURIComponent(p.id)}`,
        network: CONFIG.network,
        asset: CONFIG.asset,
      },
    }));
  return {
    agentStoreVersion: "0.1",
    store: { name: CONFIG.storeName, url: CONFIG.storeUrl },
    paymentProtocol: "x402/v2",
    products,
  };
}

export async function findProduct(id) {
  const raw = await loadCatalog();
  return (raw.products || []).find((p) => p.id === id && p.fulfillment === "digital") || null;
}
