import { useEffect, useState } from "react";
import { getSimAsset } from "@/lib/market/assets";
import { fetchCandles, type Candle } from "@/lib/market/twelvedata";

export type { Candle };

export function useCandles(
  code: string,
  interval: "1min" | "5min" | "15min" | "1h" | "4h" | "1day" = "1min",
  outputsize = 100,
): { candles: Candle[]; loading: boolean; error: string | null } {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const asset = getSimAsset(code);
    if (!asset) {
      setLoading(false);
      setError("Asset non trovato");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCandles(asset.tdSymbol, interval, outputsize).then((data) => {
      if (cancelled) return;
      if (data.length === 0) setError("Nessun dato disponibile");
      setCandles(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [code, interval, outputsize]);

  return { candles, loading, error };
}
