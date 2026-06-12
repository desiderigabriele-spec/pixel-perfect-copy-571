import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { getChallenge, joinChallenge, cancelChallenge, settleChallenge } from "@/lib/challenges.functions";
import { getMyProfile } from "@/lib/avatrade.functions";
import { getSymbol, DURATIONS } from "@/lib/symbols";
import { cn } from "@/lib/utils";
import { priceAt, pipsFor, elapsedSec } from "@/lib/priceFeed";

export const Route = createFileRoute("/_authenticated/challenges/$id")({
  head: ({ params }) => ({ meta: [{ title: `Sfida ${params.id.slice(0, 8)} — HTT` }] }),
  component: ChallengeDetail,
});

function ChallengeDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchOne = useServerFn(getChallenge);
  const fetchMe = useServerFn(getMyProfile);
  const callJoin = useServerFn(joinChallenge);
  const callCancel = useServerFn(cancelChallenge);
  const callSettle = useServerFn(settleChallenge);

  const { data, error } = useQuery({
    queryKey: ["challenge", id],
    queryFn: () => fetchOne({ data: { id } }),
    refetchInterval: (q) => (q.state.data?.challenge?.status === "live" ? 5000 : 10000),
  });
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchMe() });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [joinSide, setJoinSide] = useState<"long" | "short">("short");
  const [settling, setSettling] = useState(false);

  if (error) {
    return <Shell><p className="font-mono text-xs text-[var(--alert)]">{(error as Error).message}</p></Shell>;
  }
  if (!data) {
    return <Shell><p className="font-mono text-xs text-[var(--text-dim)]">{t("common.loading")}</p></Shell>;
  }

  const c = data.challenge;
  const sym = getSymbol(c.symbol);
  const dur = DURATIONS.find((d) => d.value === c.duration_minutes);
  const myId = (me as any)?.profile?.id as string | undefined;
  const isCreator = !!myId && c.creator_id === myId;
  const isOpponent = !!myId && c.opponent_id === myId;

  const endsAt = c.ends_at ? new Date(c.ends_at).getTime() : null;
  const msLeft = endsAt ? Math.max(0, endsAt - now) : null;
  const mm = msLeft != null ? String(Math.floor(msLeft / 60000)).padStart(2, "0") : "--";
  const ss = msLeft != null ? String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0") : "--";

  // Live pips (mock deterministico) — solo se la sfida è LIVE.
  const live = c.status === "live" && c.starts_at && c.ends_at;
  const startsAtMs = c.starts_at ? new Date(c.starts_at).getTime() : 0;
  const tSec = live ? elapsedSec(c.starts_at, c.ends_at, now) : 0;
  const livePrice = live ? priceAt(c.symbol, startsAtMs, tSec) : null;
  const liveCreatorPips = live ? pipsFor(c.symbol, startsAtMs, tSec, (c.creator_side ?? "long") as any) : null;
  const liveOpponentPips = live && c.opponent_side ? pipsFor(c.symbol, startsAtMs, tSec, c.opponent_side as any) : null;

  // Auto-settle quando il timer arriva a zero.
  useEffect(() => {
    if (c.status !== "live" || !endsAt || settling) return;
    if (now < endsAt) return;
    setSettling(true);
    callSettle({ data: { id } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["challenge", id] }))
      .catch(() => {})
      .finally(() => setSettling(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.status, endsAt, now]);

  async function onJoin() {
    try {
      await callJoin({ data: { id, side: joinSide } });
      await queryClient.invalidateQueries({ queryKey: ["challenge", id] });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }
  async function onCancel() {
    try {
      await callCancel({ data: { id } });
      navigate({ to: "/challenges" });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Link to="/challenges" className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--terminal)]">
            ← {t("challenges.title")}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">// CHALLENGE_{c.id.slice(0, 6)}</div>
            <StatusBadge status={c.status} />
          </div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl tracking-[0.06em] text-[var(--terminal)] htt-text-glow-green">
            {sym?.label ?? c.symbol}
          </h1>
          <p className="font-mono text-xs text-[var(--text-dim)] mt-1">
            {dur?.label} · {c.stake_type === "points" ? `${c.stake_amount} HTT` : t("challenges.honor")}
            {c.invite_code ? ` · CODE ${c.invite_code}` : ""}
          </p>
        </div>

        {c.status === "live" && msLeft != null && (
          <TerminalCard label="> LIVE_FEED" glow="green" className="p-5 text-center space-y-2">
            <div className="font-display text-6xl tracking-[0.1em] text-[var(--terminal)] htt-text-glow-green tabular-nums">
              {mm}:{ss}
            </div>
            {livePrice != null && sym && (
              <div className="font-mono text-sm text-[var(--text-dim)]">
                {sym.label} · <span className="text-foreground tabular-nums">{formatPrice(livePrice, sym.pipSize)}</span>
              </div>
            )}
          </TerminalCard>
        )}

        {c.status === "settled" && c.winner_id && (
          <TerminalCard label="> SETTLED" glow="green" className="p-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
              {t("challenges.winner")}
            </div>
            <div className="font-display text-3xl text-[var(--terminal)] htt-text-glow-green mt-1">
              @{c.winner_id === c.creator_id ? c.creator?.username : c.opponent?.username}
            </div>
          </TerminalCard>
        )}
        {c.status === "settled" && !c.winner_id && (
          <TerminalCard label="> SETTLED" className="p-5 text-center">
            <div className="font-display text-2xl text-[var(--amber)]">{t("challenges.tie")}</div>
          </TerminalCard>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <TraderCard
            label={t("live.leader")}
            color="green"
            profile={c.creator}
            side={c.creator_side}
            pips={c.status === "live" ? liveCreatorPips : c.creator_pips}
            isWinner={c.status === "settled" && c.winner_id === c.creator_id}
          />
          {c.opponent ? (
            <TraderCard
              label={t("live.challenger")}
              color="amber"
              profile={c.opponent}
              side={c.opponent_side}
              pips={c.status === "live" ? liveOpponentPips : c.opponent_pips}
              isWinner={c.status === "settled" && c.winner_id === c.opponent_id}
            />
          ) : (
            <WaitingSlot />
          )}
        </div>

        {c.status === "waiting" && !isCreator && !isOpponent && (
          <TerminalCard label="> YOUR_POSITION" className="p-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
              {t("challenges.side.opposingNote", { side: t(`challenges.side.${c.creator_side}`) })}
            </p>
            <div className="flex gap-2">
              {(["long", "short"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setJoinSide(s)}
                  className={cn(
                    "px-4 py-2 border font-mono text-sm transition-colors flex-1",
                    joinSide === s
                      ? s === "long"
                        ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                        : "border-[var(--alert)] bg-[var(--alert)]/10 text-[var(--alert)]"
                      : "border-border text-[var(--text-dim)] hover:text-foreground",
                  )}
                >
                  {t(`challenges.side.${s}`)}
                </button>
              ))}
            </div>
            <TerminalButton variant="primary" size="lg" className="w-full" onClick={onJoin}>
              {t("challenges.accept")}
            </TerminalButton>
          </TerminalCard>
        )}
        {c.status === "waiting" && isCreator && (
          <TerminalButton variant="ghost" size="lg" className="w-full" onClick={onCancel}>
            {t("challenges.cancel")}
          </TerminalButton>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    waiting: "border-[var(--amber)] text-[var(--amber)]",
    live: "border-[var(--terminal)] text-[var(--terminal)] htt-text-glow-green",
    settled: "border-border text-[var(--text-dim)]",
    cancelled: "border-[var(--alert)] text-[var(--alert)]",
  };
  return (
    <span className={`inline-block px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest ${map[status] ?? ""}`}>
      {t(`challenges.status.${status}`)}
    </span>
  );
}

function TraderCard({
  label, color, profile, pips, side, isWinner,
}: {
  label: string;
  color: "green" | "amber";
  profile: any;
  pips: number | null;
  side?: "long" | "short" | null;
  isWinner?: boolean;
}) {
  const sideColor = side === "long" ? "text-[var(--terminal)]" : "text-[var(--alert)]";
  return (
    <TerminalCard label={`> ${label}${isWinner ? " · WIN" : ""}`} glow={color} className="p-5 flex items-center gap-4">
      <GlitchAvatar name={profile.username} color={color} size={64} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">@{profile.username}</div>
          {side && (
            <span className={`font-mono text-[10px] uppercase tracking-widest ${sideColor}`}>
              {side === "long" ? "▲ LONG" : "▼ SHORT"}
            </span>
          )}
        </div>
        <div className={`font-display text-3xl tracking-wider tabular-nums ${pips != null && pips < 0 ? "text-[var(--alert)]" : color === "green" ? "text-[var(--terminal)]" : "text-[var(--amber)]"}`}>
          {pips != null ? `${pips > 0 ? "+" : ""}${pips.toFixed(1)} pips` : "—"}
        </div>
      </div>
    </TerminalCard>
  );
}

function formatPrice(price: number, pipSize: number): string {
  const decimals = Math.max(0, Math.round(-Math.log10(pipSize)));
  return price.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function WaitingSlot() {
  const { t } = useTranslation();
  return (
    <TerminalCard label="> CHALLENGER" className="p-5 border-dashed flex items-center justify-center min-h-[120px]">
      <div className="text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--text-dim)]">
          {t("challenges.waitingOpponent")}
        </div>
        <div className="font-display text-2xl text-[var(--text-dim)] mt-1">?</div>
      </div>
    </TerminalCard>
  );
}