import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { PipsBar } from "@/components/htt/PipsBar";
import { LiveFeed } from "@/components/htt/LiveFeed";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { fetchChallengeSnapshot } from "@/lib/data/mock";

export const Route = createFileRoute("/live-demo")({
  head: () => ({
    meta: [
      { title: "Sfida live — HACK_THE_TRADING" },
      { name: "description", content: "Guarda una sfida demo tra trader HTT con feed live di esecuzioni e barra pips in tempo reale." },
      { property: "og:title", content: "HTT — Sfida live" },
      { property: "og:description", content: "Trader vs trader, dati verificati AvaTrade." },
    ],
  }),
  component: LiveDemo,
});

function LiveDemo() {
  const { t } = useTranslation();
  const initial = fetchChallengeSnapshot();
  const [snap, setSnap] = useState(initial);

  // Mock: leggera variazione pips ogni 1.4s
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
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
              // {t("live.title")} — DEMO
            </div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em]">XAUUSD / 6H</h1>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="text-[var(--text-dim)] uppercase tracking-widest">{t("live.timeLeft")}</div>
            <div className="text-foreground text-2xl tabular-nums">02:47:13</div>
          </div>
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