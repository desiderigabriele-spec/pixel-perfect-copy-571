import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { TerminalInput } from "@/components/htt/TerminalInput";
import { createTournament } from "@/lib/tournaments.functions";
import { SYMBOLS, DURATIONS } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tournaments/new")({
  head: () => ({ meta: [{ title: "Nuovo torneo — HTT" }] }),
  component: NewTournament,
});

const MAX_PLAYERS_OPTIONS = [4, 8, 16] as const;

function NewTournament() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useServerFn(createTournament);

  const [title, setTitle] = useState("");
  const [symbol, setSymbol] = useState(SYMBOLS[0].code);
  const [duration, setDuration] = useState<15 | 60 | 240 | 1440>(60);
  const [maxPlayers, setMaxPlayers] = useState<4 | 8 | 16>(8);
  const [stakeType, setStakeType] = useState<"honor" | "points">("honor");
  const [stakeAmount, setStakeAmount] = useState(100);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [prizeNote, setPrizeNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { id } = await submit({
        data: {
          title: title.trim(),
          symbol,
          duration_minutes: duration,
          max_players: maxPlayers,
          stake_type: stakeType,
          stake_amount: stakeType === "points" ? stakeAmount : 0,
          visibility,
          prize_note: prizeNote.trim() || undefined,
        },
      });
      navigate({ to: "/tournaments/$id", params: { id } });
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
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
            // TOURNAMENT_SETUP
          </div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl tracking-[0.08em]">
            {t("tournaments.createTitle")}
          </h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <TerminalCard label="> IDENTITA'" className="p-5 space-y-4">
            <TerminalInput
              name="title"
              label={t("tournaments.titleLabel")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={60}
            />
            <TerminalInput
              name="prize_note"
              label={t("tournaments.prizeNoteLabel")}
              value={prizeNote}
              onChange={(e) => setPrizeNote(e.target.value)}
              maxLength={200}
            />
          </TerminalCard>

          <TerminalCard label="> FORMATO" className="p-5 space-y-5">
            {/* Max players */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("tournaments.maxPlayers")}
              </div>
              <div className="flex gap-2">
                {MAX_PLAYERS_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxPlayers(n)}
                    className={cn(
                      "flex-1 py-2 border font-mono text-sm transition-colors",
                      maxPlayers === n
                        ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                        : "border-border text-[var(--text-dim)] hover:text-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Symbol */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("challenges.new.symbolLabel")}
              </div>
              {(["fx", "metals", "crypto", "indices"] as const).map((cat) => (
                <div key={cat} className="mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1">
                    {t(`challenges.cat.${cat}`)}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {grouped[cat].map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => setSymbol(s.code)}
                        className={cn(
                          "px-3 py-1.5 border font-mono text-xs transition-colors",
                          symbol === s.code
                            ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                            : "border-border text-[var(--text-dim)] hover:text-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Duration */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("challenges.new.durationLabel")}
              </div>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value as 15 | 60 | 240 | 1440)}
                    className={cn(
                      "px-3 py-1.5 border font-mono text-xs transition-colors",
                      duration === d.value
                        ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                        : "border-border text-[var(--text-dim)] hover:text-foreground",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </TerminalCard>

          <TerminalCard label="> STAKE" className="p-5 space-y-4">
            <div className="flex gap-2">
              {(["honor", "points"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStakeType(s)}
                  className={cn(
                    "flex-1 py-2 border font-mono text-xs uppercase tracking-widest transition-colors",
                    stakeType === s
                      ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                      : "border-border text-[var(--text-dim)] hover:text-foreground",
                  )}
                >
                  {t(`challenges.stake.${s}`)}
                </button>
              ))}
            </div>
            {stakeType === "points" && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                  {t("challenges.stake.amount")}
                </div>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:border-[var(--terminal)] focus:outline-none"
                />
              </div>
            )}
          </TerminalCard>

          <TerminalCard label="> ACCESSO" className="p-5 space-y-3">
            <div className="flex gap-2">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex-1 py-2 border font-mono text-xs uppercase tracking-widest transition-colors",
                    visibility === v
                      ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                      : "border-border text-[var(--text-dim)] hover:text-foreground",
                  )}
                >
                  {t(`challenges.visibility.${v}`)}
                </button>
              ))}
            </div>
            <p className="font-mono text-[11px] text-[var(--text-dim)]">
              {t(`challenges.visibility.${visibility}Note`)}
            </p>
          </TerminalCard>

          {error && (
            <div className="font-mono text-xs text-[var(--alert)] border border-[var(--alert)] px-3 py-2">
              {error}
            </div>
          )}

          <TerminalButton
            variant="primary"
            size="lg"
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full"
          >
            {loading ? t("common.loading") : t("tournaments.createSubmit")}
          </TerminalButton>
        </form>
      </main>
    </div>
  );
}
