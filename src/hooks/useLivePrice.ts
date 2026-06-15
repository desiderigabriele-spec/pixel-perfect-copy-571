import { useEffect, useRef, useState } from "react";
import { getSimAsset } from "@/lib/market/assets";
import { fetchPrice, tdWS } from "@/lib/market/twelvedata";

const POLL_INTERVAL_MS = 10_000;

export function useLivePrice(code: string): { price: number | null; loading: boolean } {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const wsReceivedRef = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const asset = getSimAsset(code);
    if (!asset) {
      setLoading(false);
      return;
    }
    const { tdSymbol } = asset;
    wsReceivedRef.current = false;

    const unsubWS = tdWS.subscribe(tdSymbol, (_, p) => {
      wsReceivedRef.current = true;
      setPrice(p);
      setLoading(false);
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    });

    // Immediate REST fetch as baseline
    fetchPrice(tdSymbol).then((p) => {
      if (p !== null) {
        setPrice(p);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    // Polling fallback — stops when WS takes over
    pollTimer.current = setInterval(() => {
      if (!wsReceivedRef.current) {
        fetchPrice(tdSymbol).then((p) => {
          if (p !== null) setPrice(p);
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      unsubWS();
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [code]);

  return { price, loading };
}
