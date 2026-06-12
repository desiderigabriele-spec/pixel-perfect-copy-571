import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { getChallenge, joinChallenge, cancelChallenge } from "@/lib/challenges.functions";
import { getMyProfile } from "@/lib/avatrade.functions";
import { getSymbol, DURATIONS } from "@/lib/symbols";

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

  const { data, error } = useQuery({
    queryKey: ["challenge", id],
    queryFn: () => fetchOne({ data: { id } }),
    refetchInterval: 5000,
  });
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchMe() });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (error) {
    return <Shell><p className="font-mono text-xs text-[var(--alert)]">{(error as Error).message}</p></Shell>;
  }
  if (!data) {
    return <Shell><p className="font-mono text-xs text-[var(--text-dim)]">{t("common.loading")}</p></Shell>;
  }

  const c = data.challenge;
  const sym = getSymbol(c.symbol);
  const dur = DURATIONS.find((d) => d.value === c.duration_minutes);
  const myId = (me as any)?.profile?.id; // not present; fallback to creator/opponent check
  const isCreator = me && (me as any).profile && c.creator?.username === (me as any).profile.username;
  const isOpponent = me && (me as any).profile && c.opponent?.username === (me as any).profile.username;

  const endsAt = c.ends_at ? new Date(c.ends_at).getTime() : null;
  const msLeft = endsAt ? Math.max(0, endsAt - now) : null;
  const mm = msLeft != null ? String(Math.floor(msLeft / 60000)).padStart(2, "0") : "--";
  const ss = msLeft != null ? String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0") : "--";

  async function onJoin() {
    try {
      await callJoin({ data: { id } });
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
          <TerminalCard label="> TIME_LEFT" glow="green" className="p-5 text-center">
            <div className="font-display text-6xl tracking-[0.1em] text-[var(--terminal)] htt-text-glow-green">
              {mm}:{ss}
            </div>
          </TerminalCard>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <TraderCard label={t("live.leader")} color="green" profile={c.creator} pips={c.creator_pips} />
          {c.opponent ? (
            <TraderCard label={t("live.challenger")} color="amber" profile={c.opponent} pips={c.opponent_pips} />
          ) : (
            <WaitingSlot />
          )}
        </div>

        {c.status === "waiting" && !isCreator && !isOpponent && (
          <TerminalButton variant="primary" size="lg" className="w-full" onClick={onJoin}>
            {t("challenges.accept")}
          </TerminalButton>
        )}
        {c.status === "waiting" && isCreator && (
          <TerminalButton variant="ghost" size="lg" className="w-full" onClick={onCancel}>
            {t("challenges.cancel")}
          </TerminalButton>
        )}
        {c.status === "live" && (
          <TerminalCard label="> NOTE" className="p-4">
            <p className="font-mono text-xs text-[var(--text-dim)]">{t("challenges.liveNote")}</p>
          </TerminalCard>
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

function TraderCard({ label, color, profile, pips }: { label: string; color: "green" | "amber"; profile: any; pips: number | null }) {
  return (
    <TerminalCard label={`> ${label}`} glow={color} className="p-5 flex items-center gap-4">
      <GlitchAvatar name={profile.username} color={color} size={64} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">@{profile.username}</div>
        <div className={`font-display text-3xl tracking-wider ${color === "green" ? "text-[var(--terminal)]" : "text-[var(--amber)]"}`}>
          {pips != null ? `${pips > 0 ? "+" : ""}${pips} pips` : "—"}
        </div>
      </div>
    </TerminalCard>
  );
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