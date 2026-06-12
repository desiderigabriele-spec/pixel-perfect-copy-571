import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { PipsBar } from "@/components/htt/PipsBar";
import { LiveFeed } from "@/components/htt/LiveFeed";
import { TraderWebcam } from "@/components/htt/TraderWebcam";
import { SpectatorChat } from "@/components/htt/SpectatorChat";
import { AffiliateGate } from "@/components/htt/AffiliateGate";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { getPublicLiveMatch } from "@/lib/profile.functions";
import { getSymbol } from "@/lib/symbols";
import { pipsFor, elapsedSec, priceAt } from "@/lib/priceFeed";

// Layout Twitch-style: video (sx) | board centro | chat (dx).
// Mobile: stack verticale con tabs Video/Chat.

export const Route = createFileRoute("/live/$id")({
  loader: async ({ params }) => {
    const r = await getPublicLiveMatch({ data: { id: params.id } });
    if (!r.match) throw notFound();
    return r;
  },
  head: ({ loaderData }) => {
    const m = loaderData?.match;
    const title = m
      ? `LIVE: @${m.creator?.username} vs @${m.opponent?.username} — HTT`
      : "Live — HTT";
    return {
      meta: [
        { title },
        { name: "description", content: "Sfida HTT live — guarda i trader gareggiare in tempo reale, dati verificati AvaTrade." },
        { property: "og:title", content: title },
      ],
    };
  },
  errorComponent: ({ error }) => <div className="p-8 font-mono text-[var(--alert)]">// {error.message}</div>,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-2xl p-10 text-center">
        <h1 className="font-display text-3xl text-foreground">Live non trovata</h1>
        <Link to="/live-demo" className="mt-4 inline-block font-mono text-xs text-[var(--terminal)]">← torna alle live</Link>
      </main>
    </div>
  ),
  component: LivePage,
});

function LivePage() {
  const { t } = useTranslation();
  const { match } = Route.useLoaderData();
  const { level } = useAccessLevel();
  const isAffiliated = level === "affiliated";
  const sym = getSymbol(match.symbol);
  const [now, setNow] = useState(Date.now());
  const [mobileTab, setMobileTab] = useState<"video" | "chat">("video");

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

  const board = (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--terminal)]">
            // LIVE NOW · {sym?.label ?? match.symbol}
          </div>
          <h1 className="font-display text-2xl sm:text-4xl tracking-[0.08em] htt-text-glow-green">
            @{match.creator?.username} vs @{match.opponent?.username}
          </h1>
          <div className="mt-1 font-mono text-xs text-[var(--text-dim)] tabular-nums">
            {livePrice.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} · VERIFICATO AVATRADE
          </div>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="text-[var(--text-dim)] uppercase tracking-widest">{t("live.timeLeft")}</div>
          <div className="text-foreground text-2xl tabular-nums">{hh}:{mm}:{ss}</div>
        </div>
      </div>

      <TerminalCard label="> CHALLENGE_STATE" glow="green" className="p-5">
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
      </TerminalCard>

      <TerminalCard label="> EXEC_FEED" className="p-4 mt-4">
        <LiveFeed maxRows={8} />
      </TerminalCard>
    </>
  );

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        {/* DESKTOP: 3 colonne — video | board | chat */}
        <div className="hidden lg:grid grid-cols-[280px_1fr_320px] gap-4 h-[calc(100vh-120px)]">
          <div className="space-y-4 overflow-y-auto">
            <TraderWebcam username={match.creator?.username ?? "?"} side={match.creator_side} />
            <TraderWebcam username={match.opponent?.username ?? "?"} side={match.opponent_side} />
          </div>
          <div className="overflow-y-auto pr-2">{board}</div>
          <div className="overflow-hidden">
            <SpectatorChat challengeId={match.id} />
          </div>
        </div>

        {/* MOBILE: board sopra, tabs video/chat sotto */}
        <div className="lg:hidden space-y-4">
          {board}
          <div className="flex gap-2">
            {(["video", "chat"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-widest border ${
                  mobileTab === tab
                    ? "border-[var(--terminal)] text-[var(--terminal)] bg-[var(--terminal)]/10"
                    : "border-border text-[var(--text-dim)]"
                }`}
              >
                {tab === "video" ? "VIDEO" : "CHAT"}
              </button>
            ))}
          </div>
          {mobileTab === "video" ? (
            <div className="grid grid-cols-2 gap-3">
              <TraderWebcam username={match.creator?.username ?? "?"} side={match.creator_side} />
              <TraderWebcam username={match.opponent?.username ?? "?"} side={match.opponent_side} />
            </div>
          ) : (
            <div className="h-[60vh]"><SpectatorChat challengeId={match.id} /></div>
          )}
        </div>
      </main>
    </div>
  );
}