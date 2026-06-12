// Layer dati astratto. Per ora restituisce mock realistici.
// Sostituire le implementazioni qui per collegare MT5/AvaTrade reale.

export interface Tick {
  ts: number;
  side: "BUY" | "SELL";
  asset: string;
  pips: number;
}

export interface TraderSnapshot {
  username: string;
  pips: number;
  rank: number;
  role: "leader" | "challenger";
}

const ASSETS = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD"];

// fetchTick: emette un'esecuzione demo realistica
export function fetchTick(): Tick {
  const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  const pips = Math.round((Math.random() * 30 - 8) * 10) / 10;
  return {
    ts: Date.now(),
    side: Math.random() > 0.5 ? "BUY" : "SELL",
    asset,
    pips,
  };
}

// fetchLeaderboard: mock per la sfida demo (due trader fissi)
export function fetchChallengeSnapshot(): { leader: TraderSnapshot; challenger: TraderSnapshot } {
  return {
    leader: { username: "n3o_pips", pips: 247.3, rank: 1, role: "leader" },
    challenger: { username: "v0id_trader", pips: 198.1, rank: 7, role: "challenger" },
  };
}