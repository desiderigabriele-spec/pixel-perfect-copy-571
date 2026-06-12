import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { supabase } from "@/integrations/supabase/client";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import {
  getTournament,
  joinTournament,
  leaveTournament,
  startTournament,
  advanceTournamentBracket,
} from "@/lib/tournaments.functions";
import { getMyProfile } from "@/lib/avatrade.functions";
import { getSymbol, DURATIONS } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tournaments/$id")({
  loader: async ({ params }) => {
    const r = await getTournament({ data: { id: params.id } });
    if (!r.tournament) throw notFound();
    return r;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.tournament?.title ?? "Torneo"} — HTT` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background htt-grid-bg flex items-center justify-center">
      <div className="text-center font-mono">
        <div className="text-[var(--text-dim)] text-sm">// Torneo non trovato</div>
        <Link to="/tournaments" className="mt-4 inline-block text-[var(--terminal)] text-xs">
          ← {`Torna ai tornei`}
        </Link>
      </div>
    </div>
  ),
  component: TournamentPage,
});

function TournamentPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const initial = Route.useLoaderData();
  const queryClient = useQueryClient();

  const fetchOne = useServerFn(getTournament);
  const fetchMe = useServerFn(getMyProfile);
  const callJoin = useServerFn(joinTournament);
  const callLeave = useServerFn(leaveTournament);
  const callStart = useServerFn(startTournament);
  const callAdvance = useServerFn(advanceTournamentBracket);

  const { data } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => fetchOne({ data: { id } }),
    initialData: initial,
    refetchInterval: 10_000,
  });
  const { data: me } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchMe(),
  });

  // Realtime: invalida quando tournament o match cambia
  useEffect(() => {
    const ch = supabase
      .channel(`tournament-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["tournament", id] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `tournament_id=eq.${id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["tournament", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, queryClient]);

  const [actionErr, setActionErr] = useState<string | null>(null);

  if (!data?.tournament) return null;

  const { tournament: t_, entries, matches } = data;
  const myId = (me as any)?.profile?.id as string | undefined;
  const isCreator = !!myId && t_.creator_id === myId;
  const isAdmin = !!(me as any)?.isAdmin;
  const isJoined = entries.some((e: any) => e.user_id === myId);
  const isFull = entries.length >= t_.max_players;
  const canJoin = !isJoined && !isFull && t_.status === "registration";
  const canStart = (isCreator || isAdmin) && t_.status === "registration" && entries.length >= 2;
  const canLeave = isJoined && t_.status === "registration";

  const sym = getSymbol(t_.symbol);
  const dur = DURATIONS.find((d) => d.value === t_.duration_minutes);

  // Raggruppa match per round
  const rounds = new Map<number, any[]>();
  for (const m of matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }
  const maxRound = rounds.size > 0 ? Math.max(...rounds.keys()) : 0;

  async function act(fn: () => Promise<any>) {
    setActionErr(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["tournament", id] });
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/tournaments"
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--terminal)]"
          >
            ← {t("tournaments.title")}
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
                // TOURNAMENT
              </div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em] mt-1">
                {t_.title}
              </h1>
              <div className="mt-1 font-mono text-xs text-[var(--text-dim)]">
                {sym?.label ?? t_.symbol} · {dur?.label} ·{" "}
                {t_.stake_type === "points" ? `${t_.stake_amount} HTT` : t("challenges.honor")}
                {" · "}
                <StatusBadge status={t_.status} />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canJoin && (
                <TerminalButton
                  variant="primary"
                  onClick={() => act(() => callJoin({ data: { id } }))}
                >
                  {t("tournaments.join")}
                </TerminalButton>
              )}
              {canLeave && (
                <TerminalButton
                  variant="ghost"
                  onClick={() => act(() => callLeave({ data: { id } }))}
                >
                  {t("tournaments.leave")}
                </TerminalButton>
              )}
              {canStart && (
                <TerminalButton
                  variant="amber"
                  onClick={() => act(() => callStart({ data: { id } }))}
                >
                  {t("tournaments.start")}
                </TerminalButton>
              )}
            </div>
          </div>
          {t_.prize_note && (
            <div className="mt-3 inline-block font-mono text-[11px] text-[var(--amber)] border border-[var(--amber)]/40 px-3 py-1">
              🏆 {t_.prize_note}
            </div>
          )}
          {actionErr && (
            <div className="mt-3 font-mono text-xs text-[var(--alert)] border border-[var(--alert)] px-3 py-2">
              {actionErr}
            </div>
          )}
        </div>

        {/* Iscritti */}
        <TerminalCard label={`> ISCRITTI (${entries.length}/${t_.max_players})`} className="p-5">
          {entries.length === 0 ? (
            <p className="font-mono text-xs text-[var(--text-dim)]">{t("tournaments.noEntries")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {entries.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2">
                  {e.seed && (
                    <span className="font-mono text-[10px] text-[var(--amber)] w-5 tabular-nums">
                      #{e.seed}
                    </span>
                  )}
                  <GlitchAvatar
                    name={e.profile?.username ?? "?"}
                    color={e.user_id === myId ? "green" : "amber"}
                    size={32}
                  />
                  <Link
                    to="/u/$username"
                    params={{ username: e.profile?.username ?? "" }}
                    className="font-mono text-xs truncate hover:text-[var(--terminal)]"
                  >
                    @{e.profile?.username ?? "—"}
                  </Link>
                  {e.final_rank === 1 && (
                    <span className="font-mono text-[10px] text-[var(--amber)]">🏆</span>
                  )}
                </div>
              ))}
              {/* Slot vuoti */}
              {Array.from({ length: t_.max_players - entries.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-2 opacity-30">
                  <div className="w-8 h-8 border border-dashed border-border" />
                  <span className="font-mono text-[11px] text-[var(--text-dim)]">—</span>
                </div>
              ))}
            </div>
          )}
        </TerminalCard>

        {/* Bracket */}
        {matches.length > 0 && (
          <TerminalCard label="> BRACKET" glow="green" className="p-5">
            <div className="overflow-x-auto">
              <div className="flex gap-6 min-w-max">
                {Array.from({ length: maxRound }, (_, ri) => ri + 1).map((round) => {
                  const roundMatches = rounds.get(round) ?? [];
                  const roundLabel =
                    round === maxRound && roundMatches.length === 1
                      ? "FINALE"
                      : round === maxRound - 1 && roundMatches.length <= 2
                        ? "SEMIFINALE"
                        : `ROUND ${round}`;
                  return (
                    <div key={round} className="flex flex-col gap-3 min-w-[180px]">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--terminal)] mb-1">
                        // {roundLabel}
                      </div>
                      {roundMatches.map((m: any) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          myId={myId}
                          tournamentId={id}
                          onAdvance={(matchId) =>
                            act(() =>
                              callAdvance({ data: { tournament_id: id, match_id: matchId } }),
                            )
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </TerminalCard>
        )}
      </main>
    </div>
  );
}

function MatchCard({
  match: m,
  myId,
  tournamentId: _tid,
  onAdvance,
}: {
  match: any;
  myId?: string;
  tournamentId: string;
  onAdvance: (matchId: string) => void;
}) {
  const isBye = m.status === "bye";
  const isDone = m.status === "completed" || isBye;

  return (
    <div
      className={cn(
        "border p-3 space-y-2 font-mono text-xs",
        isDone ? "border-border opacity-70" : "border-[var(--terminal)]/60",
        m.winner_id && "border-[var(--amber)]/60",
      )}
    >
      <PlayerRow
        profile={m.player1}
        isWinner={m.winner_id === m.player1_id}
        isMe={m.player1_id === myId}
        isBye={isBye}
      />
      {!isBye && (
        <>
          <div className="text-center text-[var(--text-dim)] text-[10px]">VS</div>
          <PlayerRow
            profile={m.player2}
            isWinner={m.winner_id === m.player2_id}
            isMe={m.player2_id === myId}
          />
        </>
      )}
      {m.challenge_id && !isDone && (
        <div className="flex items-center justify-between pt-1">
          <Link
            to="/challenges/$id"
            params={{ id: m.challenge_id }}
            className="text-[var(--terminal)] text-[10px] uppercase tracking-widest hover:underline"
          >
            → GUARDA
          </Link>
          <button
            onClick={() => onAdvance(m.id)}
            className="text-[var(--text-dim)] text-[10px] uppercase tracking-widest hover:text-[var(--amber)]"
          >
            CHECK
          </button>
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  profile,
  isWinner,
  isMe,
  isBye,
}: {
  profile: any;
  isWinner: boolean;
  isMe?: boolean;
  isBye?: boolean;
}) {
  if (!profile) {
    return (
      <div className="flex items-center gap-2 opacity-30">
        <div className="w-5 h-5 border border-dashed border-border" />
        <span className="text-[var(--text-dim)]">—</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isWinner && "text-[var(--amber)]",
        isMe && !isWinner && "text-[var(--terminal)]",
        !isWinner && !isMe && "text-[var(--text-dim)]",
      )}
    >
      <GlitchAvatar name={profile.username} color={isWinner ? "amber" : "green"} size={20} />
      <span className="truncate">
        {isBye ? `${profile.username} (BYE)` : `@${profile.username}`}
      </span>
      {isWinner && <span>🏆</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const color: Record<string, string> = {
    registration: "text-[var(--amber)]",
    in_progress: "text-[var(--terminal)] htt-text-glow-green",
    completed: "text-[var(--text-dim)]",
  };
  return (
    <span className={cn("uppercase tracking-widest", color[status] ?? "")}>
      {t(`tournaments.status.${status}`)}
    </span>
  );
}
