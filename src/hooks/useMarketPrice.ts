import { useEffect, useState } from "react";
import { getSymbol } from "@/lib/symbols";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/market-prices`;
const REFRESH_MS = 30_000;

interface PriceState {
  price: number | null;
  isReal: boolean;
  loading: boolean;
}

const memCache = new Map<string, { price: number; ts: number }>();

// Restituisce il prezzo di mercato reale per un simbolo.
// Se la Edge Function non è deployata o fallisce, ritorna il reference mock.
// isReal = true se il prezzo viene da Yahoo Finance, false se è il fallback mock.
export function useMarketPrice(symbol: string): PriceState {
  const ref = getSymbol(symbol)?.reference ?? null;
  const [state, setState] = useState<PriceState>({
    price: ref,
    isReal: false,
    loading: true,
  });

  useEffect(() => {
    if (!symbol) return;

    async function fetchPrice() {
      const cached = memCache.get(symbol);
      if (cached && Date.now() - cached.ts < REFRESH_MS) {
        setState({ price: cached.price, isReal: true, loading: false });
        return;
      }

      try {
        const res = await fetch(`${FN_URL}?symbols=${symbol}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        const price = json?.prices?.[symbol] as number | undefined;
        if (typeof price === "number" && price > 0) {
          memCache.set(symbol, { price, ts: Date.now() });
          setState({ price, isReal: true, loading: false });
          return;
        }
      } catch {
        // Fallback silenzioso al prezzo reference
      }
      setState({ price: ref, isReal: false, loading: false });
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, REFRESH_MS);
    return () => clearInterval(interval);
  }, [symbol, ref]);

  return state;
}
