import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { useCandles } from "@/hooks/useCandles";
import { useMarketPrice } from "./MarketProvider";
import { getSimAsset } from "@/lib/market/assets";

const TIMEFRAMES = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" },
  { label: "1h", value: "1h" },
  { label: "1G", value: "1day" },
] as const;

type Tf = (typeof TIMEFRAMES)[number]["value"];

function CandleChartInner({ code }: { code: string }) {
  const [tf, setTf] = useState<Tf>("5min");
  const { candles, loading, error } = useCandles(code, tf, 150);
  const live = useMarketPrice(code);
  const asset = getSimAsset(code);
  const decimals = asset?.decimals ?? 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastBarRef = useRef<CandlestickData | null>(null);

  // Create chart once on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 340,
      layout: {
        background: { type: ColorType.Solid, color: "#0D0D0D" },
        textColor: "rgba(0,255,65,0.6)",
        fontFamily: "monospace",
      },
      grid: {
        vertLines: { color: "rgba(0,255,65,0.06)" },
        horzLines: { color: "rgba(0,255,65,0.06)" },
      },
      timeScale: {
        borderColor: "rgba(0,255,65,0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: "rgba(0,255,65,0.2)" },
      crosshair: { mode: 0 },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#00FF41",
      downColor: "#FF0033",
      borderUpColor: "#00FF41",
      borderDownColor: "#FF0033",
      wickUpColor: "#00FF41",
      wickDownColor: "#FF0033",
      priceFormat: {
        type: "price",
        precision: decimals,
        minMove: Math.pow(10, -decimals),
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastBarRef.current = null;
    };
  }, []); // mount once — component remounts via key when code/decimals change

  // Load candles into chart
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !candles.length) return;
    const mapped: CandlestickData[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(mapped);
    lastBarRef.current = mapped[mapped.length - 1] ?? null;
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Update last candle with live price
  useEffect(() => {
    const series = seriesRef.current;
    const last = lastBarRef.current;
    if (!series || !last || live == null) return;
    const updated: CandlestickData = {
      time: last.time,
      open: last.open ?? live,
      high: Math.max(last.high ?? live, live),
      low: Math.min(last.low ?? live, live),
      close: live,
    };
    lastBarRef.current = updated;
    series.update(updated);
  }, [live]);

  return (
    <div className="border border-[#00FF41]/20 p-3 font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[#00FF41]/50 text-[10px] tracking-widest">
          // GRAFICO — {code}
          {live != null && (
            <span className="text-[#00FF41] ml-2">{live.toFixed(decimals)}</span>
          )}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTf(t.value)}
              className={`px-2 py-0.5 text-[10px] border transition-colors ${
                tf === t.value
                  ? "border-[#00FF41] text-[#00FF41]"
                  : "border-[#00FF41]/20 text-[#00FF41]/50 hover:border-[#00FF41]/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden">
        <div ref={containerRef} style={{ height: 340 }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/80 text-[#00FF41]/40 text-xs animate-pulse">
            caricamento grafico…
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/80 text-red-400/60 text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// key prop on this wrapper forces full remount when code changes,
// giving the chart a clean container with correct price precision
export function CandleChart({ code }: { code: string }) {
  return <CandleChartInner key={code} code={code} />;
}
