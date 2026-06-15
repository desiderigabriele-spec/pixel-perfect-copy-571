import { getSimAsset } from "./market/assets";

export const INITIAL_BALANCE = 10_000;
export const MIN_SIZE_USD = 10;
export const MAX_SIZE_USD = 2_000;

export type TradeDirection = "buy" | "sell";

export function calcPnl(
  symbol: string,
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number,
  sizeUsd: number,
): { pnl: number; pips: number } {
  const asset = getSimAsset(symbol);
  const pipSize = asset?.pipSize ?? 0.0001;

  const priceDiff = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pips = Math.round((priceDiff / pipSize) * 10) / 10;
  // P&L proporzionale alla variazione percentuale * size in USD
  const pnl = Math.round((priceDiff / entryPrice) * sizeUsd * 100) / 100;

  return { pnl, pips };
}

export function formatPnl(pnl: number | null): string {
  if (pnl === null) return "—";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}$${pnl.toFixed(2)}`;
}

export function formatPips(pips: number | null): string {
  if (pips === null) return "—";
  const sign = pips >= 0 ? "+" : "";
  return `${sign}${pips.toFixed(1)} pips`;
}

export function unrealizedPnl(
  symbol: string,
  direction: TradeDirection,
  entryPrice: number,
  currentPrice: number,
  sizeUsd: number,
): number {
  return calcPnl(symbol, direction, entryPrice, currentPrice, sizeUsd).pnl;
}
