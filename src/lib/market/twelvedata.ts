const REST_BASE = "https://api.twelvedata.com";
const WS_ENDPOINT = "wss://ws.twelvedata.com/v1/quotes/price";

function getApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_TWELVEDATA_KEY ?? "";
  }
  return "";
}

// ── REST ─────────────────────────────────────────────────────────────────────

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type RawCandle = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export async function fetchPrice(tdSymbol: string): Promise<number | null> {
  const key = getApiKey();
  if (!key) return null;
  try {
    const res = await fetch(
      `${REST_BASE}/price?symbol=${encodeURIComponent(tdSymbol)}&apikey=${key}`,
    );
    const data = await res.json();
    const p = parseFloat(data.price);
    return isNaN(p) ? null : p;
  } catch {
    return null;
  }
}

export async function fetchPrices(tdSymbols: string[]): Promise<Record<string, number>> {
  const key = getApiKey();
  if (!key || !tdSymbols.length) return {};
  try {
    const res = await fetch(
      `${REST_BASE}/price?symbol=${tdSymbols.map(encodeURIComponent).join(",")}&apikey=${key}`,
    );
    const data = await res.json();
    if (tdSymbols.length === 1) {
      const p = parseFloat(data.price);
      return isNaN(p) ? {} : { [tdSymbols[0]]: p };
    }
    const result: Record<string, number> = {};
    for (const sym of tdSymbols) {
      const p = parseFloat(data[sym]?.price);
      if (!isNaN(p)) result[sym] = p;
    }
    return result;
  } catch {
    return {};
  }
}

export async function fetchCandles(
  tdSymbol: string,
  interval: "1min" | "5min" | "15min" | "1h" | "4h" | "1day" = "1min",
  outputsize = 100,
): Promise<Candle[]> {
  const key = getApiKey();
  if (!key) return [];
  try {
    const res = await fetch(
      `${REST_BASE}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${key}`,
    );
    const data = await res.json();
    if (!Array.isArray(data.values)) return [];
    return (data.values as RawCandle[])
      .map((v) => ({
        time: Math.floor(new Date(v.datetime).getTime() / 1000),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume) || 0,
      }))
      .reverse();
  } catch {
    return [];
  }
}

// ── WebSocket singleton ───────────────────────────────────────────────────────

type PriceCallback = (symbol: string, price: number) => void;

class TwelveDataWS {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<PriceCallback>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private connected = false;

  subscribe(tdSymbol: string, cb: PriceCallback): () => void {
    if (!this.listeners.has(tdSymbol)) this.listeners.set(tdSymbol, new Set());
    this.listeners.get(tdSymbol)!.add(cb);
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    } else if (this.connected) {
      this.sendSubscribe([tdSymbol]);
    }
    return () => {
      this.listeners.get(tdSymbol)?.delete(cb);
      if (this.listeners.get(tdSymbol)?.size === 0) this.listeners.delete(tdSymbol);
    };
  }

  private connect() {
    const key = getApiKey();
    if (!key || typeof WebSocket === "undefined") return;
    try {
      this.ws = new WebSocket(`${WS_ENDPOINT}?apikey=${key}`);
    } catch {
      return;
    }
    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectDelay = 2000;
      const symbols = [...this.listeners.keys()];
      if (symbols.length) this.sendSubscribe(symbols);
    };
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.event === "price" && msg.symbol && msg.price != null) {
          const p = parseFloat(msg.price);
          if (!isNaN(p)) {
            this.listeners.get(msg.symbol)?.forEach((cb) => cb(msg.symbol, p));
          }
        }
      } catch {}
    };
    this.ws.onclose = () => {
      this.connected = false;
      if (this.listeners.size > 0) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
          this.connect();
        }, this.reconnectDelay);
      }
    };
    this.ws.onerror = () => this.ws?.close();
  }

  private sendSubscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ action: "subscribe", params: { symbols: symbols.join(",") } }),
      );
    }
  }
}

export const tdWS = new TwelveDataWS();
