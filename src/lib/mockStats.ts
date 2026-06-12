// Generatore deterministico di metriche di consistenza per ogni trader.
// Stesso user_id → stesse metriche. Sostituibile con dati reali aggregati
// dalle sfide quando avremo abbastanza storico.

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TraderStats = {
  trades_count: number;
  win_rate: number;       // 0..1
  profit_factor: number;  // >0
  sharpe: number;         // ~0..3
  max_drawdown_pct: number; // 0..1
  avg_rr: number;         // ~0.5..3
  track_record_days: number;
  equity_curve: number[]; // 24 punti normalizzati intorno a 100
  consistency_score: number; // 0..100
};

// Score di consistenza: combinazione pesata.
function computeConsistency(s: Omit<TraderStats, "consistency_score">): number {
  const wr = s.win_rate;                       // 0..1
  const dd = 1 - Math.min(1, s.max_drawdown_pct / 0.4); // 0..1 (40% dd = 0)
  const sh = Math.min(1, s.sharpe / 3);        // 0..1
  const tr = Math.min(1, s.track_record_days / 365); // 0..1
  const raw = 0.4 * wr + 0.3 * dd + 0.2 * sh + 0.1 * tr;
  return Math.round(raw * 100);
}

export function getMockStats(userId: string): TraderStats {
  const rng = mulberry32(hashString(userId));
  const trades_count = Math.floor(40 + rng() * 280);
  const win_rate = 0.42 + rng() * 0.28;        // 42-70%
  const profit_factor = 0.9 + rng() * 1.8;     // 0.9-2.7
  const sharpe = 0.4 + rng() * 2.2;            // 0.4-2.6
  const max_drawdown_pct = 0.05 + rng() * 0.3; // 5-35%
  const avg_rr = 0.8 + rng() * 1.8;            // 0.8-2.6
  const track_record_days = Math.floor(30 + rng() * 600);

  // Equity curve: 24 punti, drift positivo proporzionale al PF.
  const drift = (profit_factor - 1) * 0.4;
  const vol = max_drawdown_pct * 0.5;
  const equity_curve: number[] = [];
  let v = 100;
  for (let i = 0; i < 24; i++) {
    v += drift + (rng() - 0.5) * vol * 8;
    equity_curve.push(Number(v.toFixed(2)));
  }

  const base = {
    trades_count,
    win_rate: Number(win_rate.toFixed(3)),
    profit_factor: Number(profit_factor.toFixed(2)),
    sharpe: Number(sharpe.toFixed(2)),
    max_drawdown_pct: Number(max_drawdown_pct.toFixed(3)),
    avg_rr: Number(avg_rr.toFixed(2)),
    track_record_days,
    equity_curve,
  };
  return { ...base, consistency_score: computeConsistency(base) };
}