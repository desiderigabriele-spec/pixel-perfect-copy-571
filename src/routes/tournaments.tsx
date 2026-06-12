import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { listTournaments } from "@/lib/tournaments.functions";
import { getSymbol, DURATIONS } from "@/lib/symbols";
import { useAccessLevel } from "@/hooks/useAccessLevel";

export const Route = createFileRoute("/tournaments")({
  loader: () => listTournaments(),
  head: () => ({
    meta: [
      { title: "Tornei — HACK_THE_TRADING" },
      {
        name: "description",
        content: "Tornei single elimination HTT: 4/8/16 trader, bracket live.",
      },
    ],
  }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const { t } = useTranslation();
  const initial = Route.useLoaderData();
  const fetchList = useServerFn(listTournaments);
  const { level } = useAccessLevel();
  const isLoggedIn = level !== "public";

  const { data } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => fetchList(),
    initialData: initial,
    refetchInterval: 20_000,
  });
  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
              // TOURNAMENT_MODE
            </div>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl tracking-[0.06em] text-[var(--terminal)] htt-text-glow-green">
              {t("tournaments.title")}
            </h1>
            <p className="mt-2 font-mono text-xs text-[var(--text-dim)]">
              {t("tournaments.subtitle")}
            </p>
          </div>
          {isLoggedIn && (
            <Link to="/tournaments/new">
              <TerminalButton variant="primary" size="lg">
                + {t("tournaments.create")}
              </TerminalButton>
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <TerminalCard label="> EMPTY" className="p-8 text-center">
            <p className="font-mono text-sm text-[var(--text-dim)]">{t("tournaments.empty")}</p>
          </TerminalCard>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {items.map((t_: any) => (
              <TournamentCard key={t_.id} tournament={t_} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TournamentCard({ tournament: t }: { tournament: any }) {
  const { t: tr } = useTranslation();
  const sym = getSymbol(t.symbol);
  const dur = DURATIONS.find((d) => d.value === t.duration_minutes);
  const statusColor: Record<string, string> = {
    registration: "text-[var(--amber)] border-[var(--amber)]",
    in_progress: "text-[var(--terminal)] border-[var(--terminal)] htt-text-glow-green",
    completed: "text-[var(--text-dim)] border-border",
  };
  const isFull = t.player_count >= t.max_players;

  return (
    <Link to="/tournaments/$id" params={{ id: t.id }}>
      <TerminalCard className="p-5 hover:border-[var(--terminal)] transition-colors h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display text-xl tracking-wider truncate flex-1">{t.title}</h3>
          <span
            className={`shrink-0 inline-block px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest ${statusColor[t.status] ?? ""}`}
          >
            {tr(`tournaments.status.${t.status}`)}
          </span>
        </div>
        <div className="font-mono text-sm text-[var(--text-dim)] space-y-1">
          <div>
            {sym?.label ?? t.symbol} · {dur?.label}
          </div>
          <div className="flex items-center gap-3">
            <span className={`tabular-nums ${isFull ? "text-[var(--alert)]" : "text-foreground"}`}>
              {t.player_count}/{t.max_players} trader
            </span>
            <span>·</span>
            <span>
              {t.stake_type === "points" ? `${t.stake_amount} HTT` : tr("challenges.honor")}
            </span>
          </div>
          <div className="text-[var(--text-dim)] text-[11px]">@{t.creator_username}</div>
        </div>
        {t.prize_note && (
          <div className="mt-3 font-mono text-[11px] text-[var(--amber)] border border-[var(--amber)]/30 px-2 py-1">
            🏆 {t.prize_note}
          </div>
        )}
      </TerminalCard>
    </Link>
  );
}
