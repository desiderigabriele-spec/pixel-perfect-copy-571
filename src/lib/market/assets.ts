export type AssetCategory = "fx" | "crypto" | "stocks" | "metals" | "commodities" | "indices";

export type SimAsset = {
  code: string;
  tdSymbol: string;
  label: string;
  category: AssetCategory;
  pipSize: number;
  reference: number;
  decimals: number;
};

export const SIM_ASSETS: SimAsset[] = [
  // Forex
  { code: "EURUSD", tdSymbol: "EUR/USD", label: "EUR/USD", category: "fx", pipSize: 0.0001, reference: 1.085, decimals: 5 },
  { code: "GBPUSD", tdSymbol: "GBP/USD", label: "GBP/USD", category: "fx", pipSize: 0.0001, reference: 1.27, decimals: 5 },
  { code: "USDJPY", tdSymbol: "USD/JPY", label: "USD/JPY", category: "fx", pipSize: 0.01, reference: 150.0, decimals: 3 },
  { code: "USDCHF", tdSymbol: "USD/CHF", label: "USD/CHF", category: "fx", pipSize: 0.0001, reference: 0.905, decimals: 5 },
  { code: "AUDUSD", tdSymbol: "AUD/USD", label: "AUD/USD", category: "fx", pipSize: 0.0001, reference: 0.66, decimals: 5 },
  { code: "USDCAD", tdSymbol: "USD/CAD", label: "USD/CAD", category: "fx", pipSize: 0.0001, reference: 1.35, decimals: 5 },
  // Metals
  { code: "XAUUSD", tdSymbol: "XAU/USD", label: "Oro (XAU/USD)", category: "metals", pipSize: 0.1, reference: 2050.0, decimals: 2 },
  { code: "XAGUSD", tdSymbol: "XAG/USD", label: "Argento (XAG/USD)", category: "metals", pipSize: 0.01, reference: 25.5, decimals: 3 },
  // Crypto
  { code: "BTCUSD", tdSymbol: "BTC/USD", label: "Bitcoin", category: "crypto", pipSize: 1, reference: 100000, decimals: 2 },
  { code: "ETHUSD", tdSymbol: "ETH/USD", label: "Ethereum", category: "crypto", pipSize: 0.1, reference: 3500, decimals: 2 },
  { code: "SOLUSD", tdSymbol: "SOL/USD", label: "Solana", category: "crypto", pipSize: 0.01, reference: 150, decimals: 3 },
  { code: "BNBUSD", tdSymbol: "BNB/USD", label: "BNB", category: "crypto", pipSize: 0.01, reference: 400, decimals: 3 },
  // Stocks
  { code: "AAPL", tdSymbol: "AAPL", label: "Apple", category: "stocks", pipSize: 0.01, reference: 200, decimals: 2 },
  { code: "TSLA", tdSymbol: "TSLA", label: "Tesla", category: "stocks", pipSize: 0.01, reference: 250, decimals: 2 },
  { code: "NVDA", tdSymbol: "NVDA", label: "NVIDIA", category: "stocks", pipSize: 0.01, reference: 800, decimals: 2 },
  { code: "AMZN", tdSymbol: "AMZN", label: "Amazon", category: "stocks", pipSize: 0.01, reference: 190, decimals: 2 },
  { code: "META", tdSymbol: "META", label: "Meta", category: "stocks", pipSize: 0.01, reference: 550, decimals: 2 },
  // Commodities
  { code: "WTI", tdSymbol: "WTI/USD", label: "Petrolio (WTI)", category: "commodities", pipSize: 0.01, reference: 78, decimals: 2 },
  // Indices
  { code: "SPX", tdSymbol: "SPX", label: "S&P 500", category: "indices", pipSize: 0.1, reference: 5800, decimals: 2 },
  { code: "NDX", tdSymbol: "NDX", label: "Nasdaq 100", category: "indices", pipSize: 0.1, reference: 20000, decimals: 2 },
  { code: "GER40", tdSymbol: "DAX", label: "DAX 40", category: "indices", pipSize: 0.1, reference: 18500, decimals: 2 },
];

export function getSimAsset(code: string): SimAsset | undefined {
  return SIM_ASSETS.find((a) => a.code === code);
}

export const SIM_ASSET_CODES = SIM_ASSETS.map((a) => a.code);
