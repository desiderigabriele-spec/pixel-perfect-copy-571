import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { createChallenge } from "@/lib/challenges.functions";
import { SYMBOLS, DURATIONS } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/challenges/new")({
  head: () => ({ meta: [{ title: "Nuova sfida — HTT" }] }),
  component: NewChallenge,
});

function NewChallenge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useServerFn(createChallenge);

  const [symbol, setSymbol] = useState(SYMBOLS[0].code);
  const [duration, setDuration] = useState<15 | 60 | 240 | 1440>(60);
  const [stakeType, setStakeType] = useState<"honor" | "points">("honor");
  const [stakeAmount, setStakeAmount] = useState(100);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { id } = await submit({
        data: {
          symbol,
          duration_minutes: duration,
          stake_type: stakeType,
          stake_amount: stakeType === "points" ? stakeAmount : 0,
          visibility,
        },
      });
      navigate({ to: "/challenges/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const grouped = {
    fx: SYMBOLS.filter((s) => s.category === "fx"),
    metals: SYMBOLS.filter((s) => s.category === "metals"),
    crypto: SYMBOLS.filter((s) => s.category === "crypto"),
    indices: SYMBOLS.filter((s) => s.category === "indices"),
  };

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
            // NEW_CHALLENGE
          </div>
          <h1 className="font-display text-4xl tracking-[0.06em] mt-2">{t("challenges.new.title")}</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <TerminalCard label="> SYMBOL" className="p-5 space-y-4">
            {(Object.entries(grouped) as [keyof typeof grouped, typeof SYMBOLS][]).map(([cat, list]) => (
              <div key={cat}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                  {t(`challenges.cat.${cat}`)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setSymbol(s.code)}
                      className={cn(
                        "px-3 py-1.5 border font-mono text-xs transition-colors",
                        symbol === s.code
                          ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)] htt-text-glow-green"
                          : "border-border text-[var(--text-dim)] hover:text-foreground",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </TerminalCard>

          <TerminalCard label="> DURATION" className="p-5">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value as 15 | 60 | 240 | 1440)}
                  className={cn(
                    "px-4 py-2 border font-mono text-sm transition-colors",
                    duration === d.value
                      ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                      : "border-border text-[var(--text-dim)] hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </TerminalCard>

          <TerminalCard label="> STAKE" className="p-5 space-y-3">
            <div className="flex gap-2">
              {(["honor", "points"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStakeType(s)}
                  className={cn(
                    "px-4 py-2 border font-mono text-sm transition-colors flex-1",
                    stakeType === s
                      ? "border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber)]"
                      : "border-border text-[var(--text-dim)] hover:text-foreground",
                  )}
                >
                  {t(`challenges.stake.${s}`)}
                </button>
              ))}
            </div>
            {stakeType === "points" && (
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  {t("challenges.stake.amount")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                  className="mt-1 w-full bg-bg-secondary border border-border px-3 py-2 font-mono text-sm text-[var(--amber)] focus:outline-none focus:border-[var(--amber)]"
                />
                <div className="font-mono text-[10px] text-[var(--text-dim)] mt-1">
                  {t("challenges.stake.note")}
                </div>
              </div>
            )}
          </TerminalCard>

          <TerminalCard label="> VISIBILITY" className="p-5">
            <div className="flex gap-2">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "px-4 py-2 border font-mono text-sm transition-colors flex-1",
                    visibility === v
                      ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                      : "border-border text-[var(--text-dim)] hover:text-foreground",
                  )}
                >
                  {t(`challenges.visibility.${v}`)}
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] text-[var(--text-dim)]">
              {visibility === "public" ? t("challenges.visibility.publicNote") : t("challenges.visibility.privateNote")}
            </p>
          </TerminalCard>

          {error && <div className="font-mono text-xs text-[var(--alert)]">{error}</div>}

          <TerminalButton type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
            {t("challenges.new.submit")}
          </TerminalButton>
        </form>
      </main>
    </div>
  );
}