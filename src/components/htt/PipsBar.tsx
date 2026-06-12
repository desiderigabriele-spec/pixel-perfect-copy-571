import { useTranslation } from "@/lib/translate";

interface Props {
  leaderName: string;
  leaderPips: number;
  challengerName: string;
  challengerPips: number;
}

// PipsBar: barra di confronto tra leader (verde) e sfidante (ambra).
export function PipsBar({ leaderName, leaderPips, challengerName, challengerPips }: Props) {
  const { t } = useTranslation();
  const total = Math.max(leaderPips + challengerPips, 1);
  const leaderPct = Math.round((leaderPips / total) * 100);
  const challengerPct = 100 - leaderPct;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between font-mono text-xs">
        <div className="text-[var(--terminal)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]">{t("live.leader")}</div>
          <div className="font-display text-lg leading-none">{leaderName}</div>
          <div className="text-xl htt-text-glow-green">{leaderPips.toFixed(1)} pips</div>
        </div>
        <div className="font-impact text-3xl text-foreground/40 px-2">{t("live.vs")}</div>
        <div className="text-right text-[var(--amber)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]">{t("live.challenger")}</div>
          <div className="font-display text-lg leading-none">{challengerName}</div>
          <div className="text-xl htt-text-glow-amber">{challengerPips.toFixed(1)} pips</div>
        </div>
      </div>
      <div className="relative flex h-3 w-full overflow-hidden border border-border">
        <div
          className="bg-[var(--terminal)] htt-glow-green transition-[width] duration-500"
          style={{ width: `${leaderPct}%` }}
        />
        <div
          className="bg-[var(--amber)] htt-glow-amber transition-[width] duration-500"
          style={{ width: `${challengerPct}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-[var(--text-dim)]">
        <span>{leaderPct}%</span>
        <span>{challengerPct}%</span>
      </div>
    </div>
  );
}