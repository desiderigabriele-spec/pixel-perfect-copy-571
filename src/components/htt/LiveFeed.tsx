import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchTick, type Tick } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

interface Props {
  maxRows?: number;
  compact?: boolean;
}

// LiveFeed: stream di esecuzioni demo mockato (sostituibile via layer dati).
export function LiveFeed({ maxRows = 8, compact = false }: Props) {
  const { t } = useTranslation();
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    setTicks(Array.from({ length: maxRows }, () => fetchTick()));
    const id = setInterval(() => {
      setTicks((prev) => [fetchTick(), ...prev].slice(0, maxRows));
    }, 1400);
    return () => clearInterval(id);
  }, [maxRows]);

  return (
    <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
        <span className="size-1.5 rounded-full bg-[var(--terminal)] animate-pulse" />
        {t("live.liveFeed")}
      </div>
      <ul className="space-y-0.5 font-mono text-[11px] sm:text-xs">
        {ticks.map((tk, i) => {
          const pos = tk.pips >= 0;
          return (
            <li
              key={tk.ts + "-" + i}
              className={cn(
                "flex items-center justify-between gap-3 border-b border-border/40 py-1",
                i === 0 && "animate-in fade-in slide-in-from-top-1 duration-300",
              )}
            >
              <span className="text-[var(--text-dim)] tabular-nums">
                {new Date(tk.ts).toLocaleTimeString("it-IT", { hour12: false })}
              </span>
              <span
                className={cn(
                  "w-12 text-center uppercase",
                  tk.side === "BUY" ? "text-[var(--terminal)]" : "text-[var(--amber)]",
                )}
              >
                {tk.side}
              </span>
              <span className="flex-1 text-foreground">{tk.asset}</span>
              <span
                className={cn(
                  "tabular-nums text-right w-16",
                  pos ? "text-[var(--terminal)]" : "text-[var(--alert)]",
                )}
              >
                {pos ? "+" : ""}
                {tk.pips.toFixed(1)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}