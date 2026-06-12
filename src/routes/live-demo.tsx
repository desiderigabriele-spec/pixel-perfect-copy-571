import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { PipsBar } from "@/components/htt/PipsBar";
import { LiveFeed } from "@/components/htt/LiveFeed";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { fetchChallengeSnapshot } from "@/lib/data/mock";
import { getCurrentLiveMatch } from "@/lib/profile.functions";
import { getSymbol } from "@/lib/symbols";
import { pipsFor, elapsedSec, priceAt } from "@/lib/priceFeed";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { AffiliateGate } from "@/components/htt/AffiliateGate";
import { useAccessLevel } from "@/hooks/useAccessLevel";

export const Route = createFileRoute("/live-demo")({
  loader: () => getCurrentLiveMatch(),
  head: () => ({
    meta: [
      { title: "Sfida live — HACK_THE_TRADING" },
      { name: "description", content: "Guarda la sfida HTT live ora: trader vs trader, dati verificati AvaTrade, pips in tempo reale." },
      { property: "og:title", content: "HTT — Sfida live" },
      { property: "og:description", content: "Trader vs trader, dati verificati AvaTrade." },
    ],
  }),
  errorComponent: () => <DemoFallback />,
  notFoundComponent: () => <DemoFallback />,
  component: LiveDemo,
});

function LiveDemo() {
  const { match } = Route.useLoaderData();
  if (!match || !match.opponent) return <RealMatchOrFallback />;
  return <RealMatch match={match} />;
}

function RealMatchOrFallback() {
  return <DemoFallback />;
}

function RealMatch({ match }: { match: any }) {
  const { t } = useTranslation();
  const { level } = useAccessLevel();
  const isAffiliated = level === "affiliated";
  const sym = getSymbol(match.symbol);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const startsAtMs = new Date(match.starts_at).getTime();
  const endsAtMs = new Date(match.ends_at).getTime();
  const tSec = elapsedSec(match.starts_at, match.ends_at, now);
  const leaderPips = pipsFor(match.symbol, startsAtMs, tSec, match.creator_side);
  const challengerPips = pipsFor(match.symbol, startsAtMs, tSec, match.opponent_side);
  const livePrice = priceAt(match.symbol, startsAtMs, tSec);
  const msLeft = Math.max(0, endsAtMs - now);
  const hh = String(Math.floor(msLeft / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((msLeft % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0");
  const decimals = sym ? Math.max(0, Math.round(-Math.log10(sym.pipSize))) : 2;

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
              // {t("live.title")} · LIVE NOW
            </div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em]">
              {sym?.label ?? match.symbol} / {match.duration_minutes >= 60 ? `${match.duration_minutes / 60}H` : `${match.duration_minutes}M`}
            </h1>
            <div className="mt-1 font-mono text-xs text-[var(--text-dim)] tabular-nums">
              {livePrice.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="text-[var(--text-dim)] uppercase tracking-widest">{t("live.timeLeft")}</div>
            <div className="text-foreground text-2xl tabular-nums">{hh}:{mm}:{ss}</div>
          </div>
        </div>

        <TerminalCard label="> CHALLENGE_STATE" className="p-5">
          {isAffiliated ? (
            <PipsBar
              leaderName={match.creator?.username ?? "—"}
              leaderPips={leaderPips}
              challengerName={match.opponent?.username ?? "—"}
              challengerPips={challengerPips}
            />
          ) : (
            <AffiliateGate>
              <PipsBar
                leaderName={match.creator?.username ?? "—"}
                leaderPips={leaderPips}
                challengerName={match.opponent?.username ?? "—"}
                challengerPips={challengerPips}
              />
            </AffiliateGate>
          )}
          {!isAffiliated && (
            <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
              {t("gate.delayedBadge")}
            </div>
          )}
        </TerminalCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TerminalCard label={`> ${t("live.leader")}`} glow="green" className="p-5 flex items-center gap-4">
            <GlitchAvatar name={match.creator?.username ?? "?"} color="green" size={64} />
            <div className="min-w-0 flex-1">
              <Link to="/u/$username" params={{ username: match.creator?.username ?? "" }} className="font-display text-2xl truncate hover:text-[var(--terminal)] block">
                {match.creator?.username ?? "—"}
              </Link>
              <div className="font-mono text-xs text-[var(--text-dim)]">
                {match.creator_side === "long" ? "▲ LONG" : "▼ SHORT"} · VERIFIED
              </div>
            </div>
          </TerminalCard>

          <TerminalCard label={`> ${t("live.challenger")}`} glow="amber" className="p-5 flex items-center gap-4">
            <GlitchAvatar name={match.opponent?.username ?? "?"} color="amber" size={64} />
            <div className="min-w-0 flex-1">
              <Link to="/u/$username" params={{ username: match.opponent?.username ?? "" }} className="font-display text-2xl truncate hover:text-[var(--amber)] block">
                {match.opponent?.username ?? "—"}
              </Link>
              <div className="font-mono text-xs text-[var(--text-dim)]">
                {match.opponent_side === "long" ? "▲ LONG" : "▼ SHORT"} · VERIFIED
              </div>
            </div>
          </TerminalCard>

          <TerminalCard label="> EXEC_FEED" className="p-4 lg:row-span-2">
            <LiveFeed maxRows={10} />
          </TerminalCard>
        </div>
      </main>
    </div>
  );
}

function DemoFallback() {
  const { t } = useTranslation();
  const initial = fetchChallengeSnapshot();
  const [snap, setSnap] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => {
      setSnap((prev) => ({
        leader: { ...prev.leader, pips: Math.max(0, prev.leader.pips + (Math.random() * 6 - 2.5)) },
        challenger: { ...prev.challenger, pips: Math.max(0, prev.challenger.pips + (Math.random() * 6 - 2.5)) },
      }));
    }, 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
              // {t("live.title")} — DEMO
            </div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em]">XAUUSD / 6H</h1>
            <p className="mt-1 font-mono text-[11px] text-[var(--amber)]">
              // Nessuna sfida live ora. Quella sotto è una simulazione.
            </p>
          </div>
          <Link to="/challenges">
            <TerminalButton variant="primary">ENTRA NELLA LOBBY</TerminalButton>
          </Link>
        </div>

        {/* CONFRONTO PIPS */}
        <TerminalCard label="> CHALLENGE_STATE" className="p-5">
          <PipsBar
            leaderName={snap.leader.username}
            leaderPips={snap.leader.pips}
            challengerName={snap.challenger.username}
            challengerPips={snap.challenger.pips}
          />
        </TerminalCard>

        {/* AVATARS + FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TerminalCard label={`> ${t("live.leader")}`} glow="green" className="p-5 flex items-center gap-4">
            <GlitchAvatar name={snap.leader.username} color="green" size={64} />
            <div className="min-w-0">
              <div className="font-display text-2xl truncate">{snap.leader.username}</div>
              <div className="font-mono text-xs text-[var(--text-dim)]">
                {t("live.rank")} #{snap.leader.rank} · VERIFIED
              </div>
            </div>
          </TerminalCard>

          <TerminalCard label={`> ${t("live.challenger")}`} glow="amber" className="p-5 flex items-center gap-4">
            <GlitchAvatar name={snap.challenger.username} color="amber" size={64} />
            <div className="min-w-0">
              <div className="font-display text-2xl truncate">{snap.challenger.username}</div>
              <div className="font-mono text-xs text-[var(--text-dim)]">
                {t("live.rank")} #{snap.challenger.rank} · VERIFIED
              </div>
            </div>
          </TerminalCard>

          <TerminalCard label="> EXEC_FEED" className="p-4 lg:row-span-2">
            <LiveFeed maxRows={10} />
          </TerminalCard>

          {/* Feed compatto duplicato per mobile non serve: il feed sopra è full width sotto su mobile */}
        </div>
      </main>
    </div>
  );
}