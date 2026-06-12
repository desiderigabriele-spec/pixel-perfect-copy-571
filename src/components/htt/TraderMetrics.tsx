import { getMockStats } from "@/lib/mockStats";
import { TerminalCard } from "./TerminalCard";
import { useTranslation } from "react-i18next";

// Card metriche di consistenza + sparkline equity. Mock deterministico per ora.
// Seed pubblico (es. username) — non esponiamo lo user_id.
type Props = { seed: string };

export function TraderMetrics({ seed }: Props) {
  const s = getMockStats(seed);
  const { t } = useTranslation();

  const cells: Array<{ k: string; v: string; tone?: string }> = [
    { k: t("metrics.consistency"), v: `${s.consistency_score}/100`, tone: scoreColor(s.consistency_score) },
    { k: t("metrics.winRate"), v: `${(s.win_rate * 100).toFixed(1)}%` },
    { k: t("metrics.profitFactor"), v: s.profit_factor.toFixed(2) },
    { k: t("metrics.sharpe"), v: s.sharpe.toFixed(2) },
    { k: t("metrics.maxDrawdown"), v: `${(s.max_drawdown_pct * 100).toFixed(1)}%`, tone: "text-[var(--alert)]" },
    { k: t("metrics.avgRR"), v: s.avg_rr.toFixed(2) },
    { k: t("metrics.trades"), v: String(s.trades_count) },
    { k: t("metrics.trackRecord"), v: `${s.track_record_days}g` },
  ];

  return (
    <TerminalCard label="> TRADER_METRICS · VERIFIED" glow="green" className="p-5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cells.map((c) => (
          <div key={c.k}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">{c.k}</div>
            <div className={`font-display text-xl tabular-nums ${c.tone ?? "text-foreground"}`}>{c.v}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
          {t("metrics.equity")}
        </div>
        <EquitySparkline data={s.equity_curve} />
      </div>
    </TerminalCard>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-[var(--terminal)] htt-text-glow-green";
  if (score >= 45) return "text-[var(--amber)]";
  return "text-[var(--alert)]";
}

function EquitySparkline({ data }: { data: number[] }) {
  const W = 600, H = 80, PAD = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = data[data.length - 1];
  const positive = last >= data[0];
  const color = positive ? "var(--terminal)" : "var(--alert)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
      <polyline
        points={`${PAD},${H - PAD} ${points} ${W - PAD},${H - PAD}`}
        fill={color}
        opacity="0.1"
      />
    </svg>
  );
}