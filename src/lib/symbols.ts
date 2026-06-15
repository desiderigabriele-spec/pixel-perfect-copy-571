// Strumenti disponibili per le sfide HTT.
export type Symbol = {
  code: string;
  label: string;
  category: "fx" | "metals" | "crypto" | "indices";
  // Prezzo di riferimento per il mock realtime.
  reference: number;
  // Dimensione di un pip nella valuta di quotazione.
  pipSize: number;
  // Volatilità relativa (deviazione standard in pip al secondo).
  volatility: number;
};

export const SYMBOLS: Symbol[] = [
  {
    code: "EURUSD",
    label: "EUR/USD",
    category: "fx",
    reference: 1.085,
    pipSize: 0.0001,
    volatility: 0.6,
  },
  {
    code: "GBPUSD",
    label: "GBP/USD",
    category: "fx",
    reference: 1.27,
    pipSize: 0.0001,
    volatility: 0.9,
  },
  {
    code: "USDJPY",
    label: "USD/JPY",
    category: "fx",
    reference: 150.0,
    pipSize: 0.01,
    volatility: 0.8,
  },
  {
    code: "AUDUSD",
    label: "AUD/USD",
    category: "fx",
    reference: 0.66,
    pipSize: 0.0001,
    volatility: 0.7,
  },
  {
    code: "USDCAD",
    label: "USD/CAD",
    category: "fx",
    reference: 1.35,
    pipSize: 0.0001,
    volatility: 0.7,
  },
  {
    code: "XAUUSD",
    label: "Oro (XAU/USD)",
    category: "metals",
    reference: 2050.0,
    pipSize: 0.1,
    volatility: 1.8,
  },
  {
    code: "XAGUSD",
    label: "Argento (XAG/USD)",
    category: "metals",
    reference: 25.5,
    pipSize: 0.01,
    volatility: 2.4,
  },
  {
    code: "BTCUSD",
    label: "Bitcoin",
    category: "crypto",
    reference: 100000,
    pipSize: 1,
    volatility: 4.5,
  },
  {
    code: "ETHUSD",
    label: "Ethereum",
    category: "crypto",
    reference: 3500,
    pipSize: 0.1,
    volatility: 5.0,
  },
  {
    code: "US500",
    label: "S&P 500",
    category: "indices",
    reference: 5800,
    pipSize: 0.1,
    volatility: 1.2,
  },
  {
    code: "NAS100",
    label: "Nasdaq 100",
    category: "indices",
    reference: 20000,
    pipSize: 0.1,
    volatility: 1.8,
  },
  {
    code: "GER40",
    label: "DAX 40",
    category: "indices",
    reference: 18500,
    pipSize: 0.1,
    volatility: 1.4,
  },
];

export const SYMBOL_CODES = SYMBOLS.map((s) => s.code) as [string, ...string[]];

export const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 ora" },
  { value: 240, label: "4 ore" },
  { value: 1440, label: "1 giorno" },
] as const;

export function getSymbol(code: string): Symbol | undefined {
  return SYMBOLS.find((s) => s.code === code);
}
