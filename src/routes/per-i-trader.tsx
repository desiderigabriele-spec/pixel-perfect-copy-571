import { createFileRoute, Link } from "@tanstack/react-router";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalButton } from "@/components/htt/TerminalButton";

export const Route = createFileRoute("/per-i-trader")({
  head: () => ({
    meta: [
      { title: "Per i Trader — HACK_THE_TRADING" },
      {
        name: "description",
        content:
          "Sei un trader? Scopri come trasformare il tuo tempo in reddito con HTT.",
      },
    ],
  }),
  component: PerITrader,
});

function PerITrader() {
  return (
    <div className="relative min-h-screen">
      <HttHeader />
      <main className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--terminal)] mb-4">
          // PER I TRADER
        </div>
        <h1 className="font-impact text-6xl sm:text-8xl leading-[0.9] text-foreground mb-6">
          PAGINA IN
          <br />
          COSTRUZIONE.
        </h1>
        <p className="text-[var(--text-dim)] text-base sm:text-lg max-w-md leading-relaxed mb-10">
          Stiamo preparando tutto per te. Nel frattempo torna alla homepage o vai alla
          classifica live.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/">
            <TerminalButton variant="primary" size="lg">
              &lt; TORNA ALLA HOME
            </TerminalButton>
          </Link>
          <Link to="/leaderboard">
            <TerminalButton variant="ghost" size="lg">
              VEDI LA CLASSIFICA
            </TerminalButton>
          </Link>
        </div>
      </main>
    </div>
  );
}
