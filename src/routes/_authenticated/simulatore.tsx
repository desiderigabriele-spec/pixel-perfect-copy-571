import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SIM_ASSETS, getSimAsset, type SimAsset } from "@/lib/market/assets";
import { MarketProvider, useMarketPrice, useAllPrices } from "@/components/market/MarketProvider";
import { CandleChart } from "@/components/market/CandleChart";
import {
  usePaperAccount,
  useOpenTrades,
  useClosedTrades,
  useOpenTrade,
  useCloseTrade,
  usePendingOrders,
  useCreatePendingOrder,
  useCancelPendingOrder,
  usePendingOrderMonitor,
} from "@/hooks/usePaperTrading";
import {
  formatPnl,
  formatPips,
  unrealizedPnl,
  MIN_SIZE_USD,
  MAX_SIZE_USD,
  LEVERAGE_OPTIONS,
} from "@/lib/paper-trading";

export const Route = createFileRoute("/_authenticated/simulatore")({
  component: SimulatoreWrapper,
});

// ── Price tile ────────────────────────────────────────────────────────────────

function PriceTile({ asset, selected, onSelect }: { asset: SimAsset; selected: boolean; onSelect: () => void }) {
  const price = useMarketPrice(asset.code);
  return (
    <button
      onClick={onSelect}
      className={`text-left border p-3 font-mono transition-colors ${selected ? "border-[#00FF41] bg-[#00FF41]/5" : "border-[#00FF41]/20 hover:border-[#00FF41]/50"}`}
    >
      <div className="text-[9px] text-[#00FF41]/50 tracking-widest uppercase mb-1">{asset.category}</div>
      <div className="text-xs text-white/70 mb-2">{asset.label}</div>
      {price !== null ? (
        <div className="text-[#00FF41] text-base font-bold">{price.toFixed(asset.decimals)}</div>
      ) : (
        <div className="text-[#00FF41]/30 text-base animate-pulse">···</div>
      )}
    </button>
  );
}

// ── Trade form ────────────────────────────────────────────────────────────────

function TradeForm({ asset }: { asset: SimAsset }) {
  const price = useMarketPrice(asset.code);
  const { data: accountData } = usePaperAccount();
  const openTrade = useOpenTrade();
  const createPending = useCreatePendingOrder();

  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState(100);
  const [leverage, setLeverage] = useState(1);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const balance = Number(accountData?.account?.balance ?? 0);
  const notional = size * leverage;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!price) return;
    setMsg(null);

    try {
      if (orderType === "market") {
        await openTrade.mutateAsync({
          data: {
            symbol: asset.code,
            direction,
            size_usd: size,
            leverage,
            entry_price: price,
            sl_price: sl ? parseFloat(sl) : undefined,
            tp_price: tp ? parseFloat(tp) : undefined,
          },
        });
        setMsg({ type: "ok", text: `Trade aperto a ${price.toFixed(asset.decimals)}` });
      } else {
        const target = parseFloat(limitPrice);
        if (!target || isNaN(target)) {
          setMsg({ type: "err", text: "Inserisci un prezzo limite valido." });
          return;
        }
        await createPending.mutateAsync({
          data: {
            symbol: asset.code,
            direction,
            size_usd: size,
            leverage,
            entry_price: target,
            sl_price: sl ? parseFloat(sl) : undefined,
            tp_price: tp ? parseFloat(tp) : undefined,
            price_above: price > target,
          },
        });
        setMsg({ type: "ok", text: `Ordine limite impostato a ${target.toFixed(asset.decimals)}` });
        setLimitPrice("");
      }
      setSl(""); setTp("");
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Errore" });
    }
  }

  const isPending = openTrade.isPending || createPending.isPending;

  return (
    <form onSubmit={submit} className="border border-[#00FF41]/20 p-4 font-mono space-y-3">
      <div className="text-[#00FF41]/50 text-[10px] tracking-widest">// APRI TRADE — {asset.code}</div>

      <div className="text-xl font-bold text-[#00FF41]">
        {price ? price.toFixed(asset.decimals) : "···"}
      </div>

      {/* BUY / SELL */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setDirection("buy")}
          className={`flex-1 py-2 text-xs font-bold tracking-wider border transition-colors ${direction === "buy" ? "bg-[#00FF41] text-black border-[#00FF41]" : "border-[#00FF41]/30 text-[#00FF41]/60 hover:border-[#00FF41]/60"}`}>
          ▲ BUY
        </button>
        <button type="button" onClick={() => setDirection("sell")}
          className={`flex-1 py-2 text-xs font-bold tracking-wider border transition-colors ${direction === "sell" ? "bg-[#FF0033] text-white border-[#FF0033]" : "border-[#FF0033]/30 text-[#FF0033]/60 hover:border-[#FF0033]/60"}`}>
          ▼ SELL
        </button>
      </div>

      {/* Margine */}
      <div>
        <label className="text-[10px] text-[#00FF41]/50 tracking-widest">
          MARGINE (USD) — saldo: ${balance.toFixed(2)}
        </label>
        <input type="range" min={MIN_SIZE_USD} max={Math.min(MAX_SIZE_USD, balance)} step={10}
          value={size} onChange={(e) => setSize(Number(e.target.value))}
          className="w-full accent-[#00FF41] mt-1" />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[#00FF41]">${size} margine</span>
          <span className="text-[#00FF41]/50">nozionale: ${notional.toLocaleString()}</span>
        </div>
      </div>

      {/* Leva */}
      <div>
        <label className="text-[10px] text-[#00FF41]/50 tracking-widest">LEVA FINANZIARIA</label>
        <div className="flex gap-1 mt-1">
          {LEVERAGE_OPTIONS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLeverage(lv)}
              className={`flex-1 py-1 text-[10px] font-bold border transition-colors ${
                leverage === lv
                  ? "border-[#00FF41] text-[#00FF41] bg-[#00FF41]/10"
                  : "border-[#00FF41]/20 text-[#00FF41]/40 hover:border-[#00FF41]/50"
              }`}
            >
              {lv}x
            </button>
          ))}
        </div>
      </div>

      {/* Tipo ordine */}
      <div>
        <label className="text-[10px] text-[#00FF41]/50 tracking-widest">TIPO ORDINE</label>
        <div className="flex gap-2 mt-1">
          {(["market", "limit"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest border transition-colors ${
                orderType === t
                  ? "border-[#00FF41] text-[#00FF41] bg-[#00FF41]/10"
                  : "border-[#00FF41]/20 text-[#00FF41]/40 hover:border-[#00FF41]/50"
              }`}
            >
              {t === "market" ? "MERCATO" : "LIMITE"}
            </button>
          ))}
        </div>
      </div>

      {/* Prezzo limite */}
      {orderType === "limit" && (
        <div>
          <label className="text-[10px] text-[#00FF41]/50 tracking-widest">PREZZO LIMITE</label>
          <input
            type="number"
            step="any"
            placeholder={price ? price.toFixed(asset.decimals) : "0.00000"}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-transparent border border-[#00FF41]/40 text-[#00FF41] text-sm p-2 mt-1 font-mono focus:outline-none focus:border-[#00FF41]"
          />
          {price && limitPrice && (
            <div className="text-[10px] text-[#00FF41]/50 mt-1">
              {parseFloat(limitPrice) > price
                ? "⬆ sopra il mercato"
                : "⬇ sotto il mercato"
              } — ordine in attesa
            </div>
          )}
        </div>
      )}

      {/* SL / TP */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[#00FF41]/50 tracking-widest">STOP LOSS</label>
          <input type="number" step="any" placeholder="facoltativo"
            value={sl} onChange={(e) => setSl(e.target.value)}
            className="w-full bg-transparent border border-[#00FF41]/20 text-white text-xs p-2 mt-1 font-mono focus:outline-none focus:border-[#00FF41]/60" />
        </div>
        <div>
          <label className="text-[10px] text-[#00FF41]/50 tracking-widest">TAKE PROFIT</label>
          <input type="number" step="any" placeholder="facoltativo"
            value={tp} onChange={(e) => setTp(e.target.value)}
            className="w-full bg-transparent border border-[#00FF41]/20 text-white text-xs p-2 mt-1 font-mono focus:outline-none focus:border-[#00FF41]/60" />
        </div>
      </div>

      {msg && (
        <div className={`text-xs py-1 ${msg.type === "ok" ? "text-[#00FF41]" : "text-red-400"}`}>
          {msg.type === "ok" ? "✓" : "✗"} {msg.text}
        </div>
      )}

      <button type="submit" disabled={!price || isPending}
        className="w-full py-2 text-xs font-bold tracking-widest border border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black transition-colors disabled:opacity-40">
        {isPending
          ? "..."
          : orderType === "market"
            ? `APRI ${direction.toUpperCase()} — $${size} × ${leverage}x`
            : `IMPOSTA LIMITE ${direction.toUpperCase()} — $${size} × ${leverage}x`}
      </button>
    </form>
  );
}

// ── Open position row ─────────────────────────────────────────────────────────

function OpenPositionRow({ trade }: { trade: any }) {
  const price = useMarketPrice(trade.symbol);
  const closeTrade = useCloseTrade();
  const asset = getSimAsset(trade.symbol);
  const lev = Number(trade.leverage ?? 1);

  const upnl = price
    ? unrealizedPnl(trade.symbol, trade.direction, Number(trade.entry_price), price, Number(trade.quantity), lev)
    : null;
  const isPositive = upnl !== null && upnl >= 0;

  return (
    <div className="border border-[#00FF41]/15 p-3 font-mono text-xs flex items-center gap-2 flex-wrap">
      <div className={`w-10 text-center font-bold text-[10px] py-0.5 shrink-0 ${trade.direction === "buy" ? "text-[#00FF41] border border-[#00FF41]/40" : "text-[#FF0033] border border-[#FF0033]/40"}`}>
        {trade.direction === "buy" ? "BUY" : "SELL"}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-white">{trade.symbol}</span>
        <span className="text-[#555] ml-1">${Number(trade.quantity).toFixed(0)}</span>
        {lev > 1 && <span className="text-[#00FF41]/50 ml-1">{lev}x</span>}
      </div>
      <div className="text-[#555] text-[10px]">@ {Number(trade.entry_price).toFixed(asset?.decimals ?? 5)}</div>
      <div className="w-20 text-right">
        {upnl !== null ? (
          <span className={isPositive ? "text-[#00FF41]" : "text-[#FF0033]"}>{formatPnl(upnl)}</span>
        ) : <span className="text-[#555]">···</span>}
      </div>
      <button
        onClick={() => price && closeTrade.mutate({ data: { trade_id: trade.id, exit_price: price } })}
        disabled={closeTrade.isPending || !price}
        className="border border-[#FF0033]/40 text-[#FF0033]/70 hover:text-[#FF0033] hover:border-[#FF0033] px-2 py-0.5 text-[10px] transition-colors disabled:opacity-40 shrink-0">
        CLOSE
      </button>
    </div>
  );
}

// ── Pending order row ─────────────────────────────────────────────────────────

function PendingOrderRow({ order }: { order: any }) {
  const cancel = useCancelPendingOrder();
  const asset = getSimAsset(order.symbol);
  const lev = Number(order.leverage ?? 1);

  return (
    <div className="border border-yellow-500/20 p-2 font-mono text-xs flex items-center gap-2 flex-wrap">
      <div className={`w-10 text-center font-bold text-[10px] py-0.5 shrink-0 ${order.direction === "buy" ? "text-[#00FF41]/60 border border-[#00FF41]/30" : "text-[#FF0033]/60 border border-[#FF0033]/30"}`}>
        {order.direction.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 text-[#aaa]">
        {order.symbol}
        <span className="text-[#555] ml-1">${Number(order.size_usd).toFixed(0)}</span>
        {lev > 1 && <span className="text-yellow-500/50 ml-1">{lev}x</span>}
      </div>
      <div className="text-yellow-500/70 text-[10px]">
        limite: {Number(order.entry_price).toFixed(asset?.decimals ?? 5)}
      </div>
      <button
        onClick={() => cancel.mutate({ data: { order_id: order.id } })}
        disabled={cancel.isPending}
        className="border border-[#555]/40 text-[#555] hover:text-white hover:border-white px-2 py-0.5 text-[10px] transition-colors disabled:opacity-40 shrink-0">
        ANNULLA
      </button>
    </div>
  );
}

// ── Order monitor (lives inside MarketProvider) ───────────────────────────────

function OrderMonitor({ orders }: { orders: any[] }) {
  const prices = useAllPrices();
  usePendingOrderMonitor(prices, orders);
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PANEL_ASSETS = SIM_ASSETS.filter((a) =>
  ["EURUSD", "GBPUSD", "BTCUSD", "ETHUSD", "XAUUSD", "AAPL", "TSLA", "NVDA", "SPX", "NDX"].includes(a.code)
);

function Simulatore() {
  const [selectedCode, setSelectedCode] = useState("EURUSD");
  const { data: accountData } = usePaperAccount();
  const { data: openData } = useOpenTrades();
  const { data: closedData } = useClosedTrades();
  const { data: pendingData } = usePendingOrders();

  const selectedAsset = getSimAsset(selectedCode)!;
  const balance = Number(accountData?.account?.balance ?? 0);
  const pnl = balance - 10000;
  const openTrades = openData?.trades ?? [];
  const closedTrades = closedData?.trades ?? [];
  const pendingOrders = pendingData?.orders ?? [];

  const gridCodes = useMemo(() => PANEL_ASSETS.map((a) => a.code), []);
  const focusCodes = useMemo(
    () => [...new Set([
      selectedCode,
      ...openTrades.map((t) => t.symbol),
      ...pendingOrders.map((o) => o.symbol),
    ])],
    [selectedCode, openTrades, pendingOrders],
  );

  return (
    <MarketProvider gridCodes={gridCodes} focusCodes={focusCodes}>
      <OrderMonitor orders={pendingOrders} />
      <div className="min-h-screen bg-[#0D0D0D] text-white font-mono">
        <div className="max-w-6xl mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[#00FF41]/50 text-[10px] tracking-widest">// TRADING SIMULATO</div>
              <h1 className="text-xl font-bold tracking-[0.15em] text-[#00FF41]">PAPER TRADING</h1>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#00FF41]/50 tracking-widest">SALDO DISPONIBILE</div>
              <div className="text-2xl font-bold text-white">${balance.toFixed(2)}</div>
              <div className={`text-xs ${pnl >= 0 ? "text-[#00FF41]" : "text-[#FF0033]"}`}>
                {formatPnl(pnl)} ({((pnl / 10000) * 100).toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Asset grid */}
          <div>
            <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-2">// SELEZIONA STRUMENTO</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PANEL_ASSETS.map((a) => (
                <PriceTile key={a.code} asset={a} selected={a.code === selectedCode} onSelect={() => setSelectedCode(a.code)} />
              ))}
            </div>
          </div>

          {/* Grafico */}
          <CandleChart code={selectedCode} />

          {/* Trade form + open positions */}
          <div className="grid md:grid-cols-2 gap-4">
            <TradeForm asset={selectedAsset} />

            <div className="space-y-3">
              {/* Posizioni aperte */}
              <div>
                <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-1">
                  // POSIZIONI APERTE ({openTrades.length})
                </div>
                {openTrades.length === 0 ? (
                  <div className="border border-[#00FF41]/10 p-4 text-[#555] text-xs text-center">
                    Nessuna posizione aperta
                  </div>
                ) : (
                  <div className="space-y-1">
                    {openTrades.map((t) => <OpenPositionRow key={t.id} trade={t} />)}
                  </div>
                )}
              </div>

              {/* Ordini in attesa */}
              {pendingOrders.length > 0 && (
                <div>
                  <div className="text-yellow-500/50 text-[10px] tracking-widest mb-1">
                    // ORDINI LIMITE ({pendingOrders.length})
                  </div>
                  <div className="space-y-1">
                    {pendingOrders.map((o) => <PendingOrderRow key={o.id} order={o} />)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trade history */}
          {closedTrades.length > 0 && (
            <div>
              <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-2">
                // STORICO ({closedTrades.length})
              </div>
              <div className="space-y-1">
                {closedTrades.slice(0, 10).map((t) => {
                  const asset = getSimAsset(t.symbol);
                  const lev = Number(t.leverage ?? 1);
                  const pos = t.pnl !== null && t.pnl >= 0;
                  return (
                    <div key={t.id} className="border border-[#00FF41]/10 p-2 text-xs flex items-center gap-3 flex-wrap">
                      <div className={`w-10 text-center text-[10px] font-bold shrink-0 ${t.direction === "buy" ? "text-[#00FF41]/70" : "text-[#FF0033]/70"}`}>
                        {t.direction.toUpperCase()}
                      </div>
                      <div className="text-[#aaa] min-w-0">
                        {t.symbol}
                        {lev > 1 && <span className="text-[#555] ml-1">{lev}x</span>}
                      </div>
                      <div className="flex-1 text-[#555] text-[10px]">
                        {Number(t.entry_price).toFixed(asset?.decimals ?? 5)} → {Number(t.exit_price).toFixed(asset?.decimals ?? 5)}
                      </div>
                      <div className={`w-20 text-right font-bold ${pos ? "text-[#00FF41]" : "text-[#FF0033]"}`}>
                        {formatPnl(t.pnl)}
                      </div>
                      <div className={`w-20 text-right text-[10px] ${pos ? "text-[#00FF41]/60" : "text-[#FF0033]/60"}`}>
                        {formatPips(t.pips)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketProvider>
  );
}

function SimulatoreWrapper() {
  return <Simulatore />;
}
