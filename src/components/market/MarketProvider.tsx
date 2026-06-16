import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSimAsset } from "@/lib/market/assets";
import { fetchPrices, tdWS } from "@/lib/market/twelvedata";

// Feed prezzi condiviso — pensato per il piano gratuito di Twelve Data (8 req/min).
// - Gli asset "focus" (selezionato + posizioni aperte) si aggiornano spesso.
// - La griglia si aggiorna lentamente, in un'unica richiesta batch.
// Così non si superano i limiti e i prezzi non si congelano.

const FAST_MS = 15_000; // focus: ~4 richieste/min per simbolo
const SLOW_MS = 180_000; // griglia: batch ogni 3 minuti

type MarketCtxValue = { prices: Record<string, number> };

const MarketCtx = createContext<MarketCtxValue>({ prices: {} });

export function useMarketPrice(code: string): number | null {
  const { prices } = useContext(MarketCtx);
  return prices[code] ?? null;
}

export function useAllPrices(): Record<string, number> {
  return useContext(MarketCtx).prices;
}

export function MarketProvider({
  gridCodes,
  focusCodes,
  children,
}: {
  gridCodes: string[];
  focusCodes: string[];
  children: ReactNode;
}) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  const gridKey = gridCodes.join(",");
  const focusKey = [...new Set(focusCodes)].join(",");

  // ── Griglia: batch lento ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const codes = gridKey ? gridKey.split(",") : [];
    const assets = codes
      .map((c) => ({ code: c, td: getSimAsset(c)?.tdSymbol }))
      .filter((a): a is { code: string; td: string } => Boolean(a.td));
    if (!assets.length) return;

    async function run() {
      const res = await fetchPrices(assets.map((a) => a.td));
      if (cancelled) return;
      const updates: Record<string, number> = {};
      for (const a of assets) {
        const p = res[a.td];
        if (p != null) updates[a.code] = p;
      }
      if (Object.keys(updates).length) setPrices((prev) => ({ ...prev, ...updates }));
    }

    run();
    const id = setInterval(run, SLOW_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [gridKey]);

  // ── Focus: poll veloce + WebSocket ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const codes = focusKey ? focusKey.split(",") : [];
    const assets = codes
      .map((c) => ({ code: c, td: getSimAsset(c)?.tdSymbol }))
      .filter((a): a is { code: string; td: string } => Boolean(a.td));
    if (!assets.length) return;

    const unsubs = assets.map((a) =>
      tdWS.subscribe(a.td, (_, p) => {
        if (!cancelled) setPrices((prev) => ({ ...prev, [a.code]: p }));
      }),
    );

    async function run() {
      const res = await fetchPrices(assets.map((a) => a.td));
      if (cancelled) return;
      const updates: Record<string, number> = {};
      for (const a of assets) {
        const p = res[a.td];
        if (p != null) updates[a.code] = p;
      }
      if (Object.keys(updates).length) setPrices((prev) => ({ ...prev, ...updates }));
    }

    run();
    const id = setInterval(run, FAST_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      unsubs.forEach((u) => u());
    };
  }, [focusKey]);

  return <MarketCtx.Provider value={{ prices }}>{children}</MarketCtx.Provider>;
}
