// Edge Function: market-prices
// Restituisce i prezzi attuali di mercato per i simboli HTT.
// Fonte: Yahoo Finance (server-side, nessun CORS, nessuna chiave API).
// Deploy: supabase functions deploy market-prices
// Cache lato server: 30 secondi (evita rate limit).
// Usato SOLO per il display live, non per il settlement (che rimane deterministico).

const CACHE_TTL_MS = 30_000;

// Mappa simbolo HTT → ticker Yahoo Finance
const YAHOO_MAP: Record<string, string> = {
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  AUDUSD: "AUDUSD=X",
  USDCAD: "USDCAD=X",
  XAUUSD: "GC=F",
  XAGUSD: "SI=F",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  US500: "^GSPC",
  NAS100: "^NDX",
  GER40: "^GDAXI",
};

// Prezzi di fallback (reference da symbols.ts)
const FALLBACK: Record<string, number> = {
  EURUSD: 1.085,
  GBPUSD: 1.27,
  USDJPY: 150.0,
  AUDUSD: 0.66,
  USDCAD: 1.35,
  XAUUSD: 2050.0,
  XAGUSD: 25.5,
  BTCUSD: 100000,
  ETHUSD: 3500,
  US500: 5800,
  NAS100: 20000,
  GER40: 18500,
};

interface CacheEntry {
  price: number;
  ts: number;
}

const cache = new Map<string, CacheEntry>();

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  const ticker = YAHOO_MAP[symbol];
  if (!ticker) return null;

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice as number | undefined;
    if (typeof price !== "number" || isNaN(price)) return null;
    cache.set(symbol, { price, ts: Date.now() });
    return price;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // CORS per chiamate dal frontend Lovable
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const symbols = (url.searchParams.get("symbols") ?? "EURUSD,XAUUSD,BTCUSD").split(",");

  const results: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      const price = await fetchYahooPrice(sym.trim().toUpperCase());
      results[sym] = price ?? FALLBACK[sym] ?? 0;
    }),
  );

  return new Response(JSON.stringify({ prices: results, ts: Date.now() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
