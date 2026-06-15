import { createFileRoute } from "@tanstack/react-router";
import { SIM_ASSETS, type SimAsset } from "@/lib/market/assets";
import { useLivePrice } from "@/hooks/useLivePrice";

export const Route = createFileRoute("/_authenticated/simulatore")({
  component: Simulatore,
});

const DEMO_CODES = ["EURUSD", "BTCUSD", "XAUUSD", "AAPL", "SPX", "USDJPY"];

function PriceTile({ asset }: { asset: SimAsset }) {
  const { price, loading } = useLivePrice(asset.code);
  return (
    <div className="border border-[#00FF41]/20 bg-black/40 p-4 font-mono hover:border-[#00FF41]/50 transition-colors">
      <div className="text-[10px] text-[#00FF41]/50 mb-1 tracking-widest uppercase">
        {asset.category}
      </div>
      <div className="text-xs text-white/70 mb-3">{asset.label}</div>
      {loading ? (
        <div className="text-[#00FF41]/30 text-xl tracking-wider animate-pulse">···</div>
      ) : price !== null ? (
        <div className="text-[#00FF41] text-xl font-bold tracking-wider">
          {price.toFixed(asset.decimals)}
        </div>
      ) : (
        <div className="text-red-400/70 text-xs">offline</div>
      )}
    </div>
  );
}

function Simulatore() {
  const apiKey = import.meta.env.VITE_TWELVEDATA_KEY;
  const demoAssets = DEMO_CODES.map((c) => SIM_ASSETS.find((a) => a.code === c)).filter(Boolean) as SimAsset[];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-6 font-mono">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-2">
            // STEP 1 COMPLETATO — MARKET DATA LAYER
          </div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-[#00FF41]">
            TRADING_SIMULATOR
          </h1>
          <p className="text-[#666] text-xs mt-1">Prezzi live · Twelve Data API</p>
        </div>

        {!apiKey && (
          <div className="border border-yellow-500/30 bg-yellow-500/5 p-4 mb-6 text-yellow-400/80 text-xs leading-relaxed">
            <span className="text-yellow-400 font-bold">ATTENZIONE:</span> VITE_TWELVEDATA_KEY non impostata.
            <br />
            Prezzi non disponibili. Aggiungi la chiave in{" "}
            <code className="text-yellow-300">.env.local</code> e su Netlify → Environment variables.
          </div>
        )}

        <div className="mb-8">
          <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-3">// PREZZI LIVE</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {demoAssets.map((asset) => (
              <PriceTile key={asset.code} asset={asset} />
            ))}
          </div>
        </div>

        <div className="border border-[#00FF41]/10 p-4">
          <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-4">
            // ASSET DISPONIBILI ({SIM_ASSETS.length} STRUMENTI)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-6">
            {(["fx", "metals", "crypto", "stocks", "commodities", "indices"] as const).map((cat) => {
              const assets = SIM_ASSETS.filter((a) => a.category === cat);
              if (!assets.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <div className="text-[#00FF41]/40 text-[10px] tracking-widest mb-1 uppercase">
                    {cat}
                  </div>
                  {assets.map((a) => (
                    <div key={a.code} className="flex items-center gap-3 py-0.5">
                      <span className="text-[#00FF41]/70 text-xs w-16">{a.code}</span>
                      <span className="text-[#444] text-xs">{a.tdSymbol}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border border-[#00FF41]/10 p-4">
          <div className="text-[#00FF41]/50 text-[10px] tracking-widest mb-2">// NEXT STEPS</div>
          <div className="text-[#555] text-xs space-y-1">
            <div>[ ] Step 2 — Tabelle Supabase: paper_accounts, paper_trades, paper_leaderboard</div>
            <div>[ ] Step 3 — Logica apri/chiudi trade con SL/TP</div>
            <div>[ ] Step 4 — Grafici candlestick (lightweight-charts)</div>
            <div>[ ] Step 5 — Classifica simulatore</div>
            <div>[ ] Step 6 — Schermata live challenge</div>
            <div>[ ] Step 7 — UI/UX completa</div>
          </div>
        </div>
      </div>
    </div>
  );
}
