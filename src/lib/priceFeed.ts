// Mock realtime price feed: random walk deterministico per (simbolo, startsAt).
// Stessa funzione usata sia in client (preview live) sia in server (settlement).
import { getSymbol } from "@/lib/symbols";

// Hash 32-bit stabile da una stringa.
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PRNG mulberry32: deterministico, veloce, qualità sufficiente per il mock.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller per ottenere N(0,1) da due uniformi.
function gaussian(rand: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Calcola il prezzo per un simbolo a `tSec` secondi dall'inizio della sfida.
// Lo stesso (symbol, startsAtMs, tSec) produce sempre lo stesso prezzo.
export function priceAt(symbol: string, startsAtMs: number, tSec: number): number {
  const sym = getSymbol(symbol);
  if (!sym) return 0;
  const seed = xfnv1a(`${symbol}|${startsAtMs}`);
  const rand = mulberry32(seed);
  const stepsPerSec = 1; // un tick al secondo
  const steps = Math.max(0, Math.floor(tSec * stepsPerSec));
  let cumPips = 0;
  for (let i = 0; i < steps; i++) {
    cumPips += gaussian(rand) * sym.volatility;
  }
  return sym.reference + cumPips * sym.pipSize;
}

// Calcola i pips realizzati da una posizione direzionale.
export function pipsFor(
  symbol: string,
  startsAtMs: number,
  tSec: number,
  side: "long" | "short",
): number {
  const sym = getSymbol(symbol);
  if (!sym) return 0;
  const entry = priceAt(symbol, startsAtMs, 0);
  const cur = priceAt(symbol, startsAtMs, tSec);
  const raw = (cur - entry) / sym.pipSize;
  return side === "long" ? raw : -raw;
}

// Secondi trascorsi (cap a durata) per una sfida live.
export function elapsedSec(startsAtIso: string | null, endsAtIso: string | null, nowMs: number): number {
  if (!startsAtIso) return 0;
  const start = new Date(startsAtIso).getTime();
  const end = endsAtIso ? new Date(endsAtIso).getTime() : nowMs;
  return Math.max(0, Math.min(nowMs, end) - start) / 1000;
}