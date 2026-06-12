import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HACK_THE_TRADING — Community trader verificata" },
      { name: "description", content: "Sfide 1v1 tra trader retail su conto demo AvaTrade. Performance verificate, classifica live, community italiana." },
      { property: "og:title", content: "HACK_THE_TRADING" },
      { property: "og:description", content: "Sfide tra trader. Performance verificate. Spettacolo puro." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen htt-grid-bg">
      <HttHeader />
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* HERO */}
        <section className="py-16 sm:py-24 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
            {t("landing.tag")}
          </div>
          <h1 className="mt-4 font-display text-5xl sm:text-7xl lg:text-8xl tracking-[0.08em] text-foreground htt-text-glow-green">
            HACK<span className="text-[var(--terminal)]">_</span>THE<span className="text-[var(--terminal)]">_</span>TRADING
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[var(--text-dim)]">
            {t("landing.subtitle")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/boot">
              <TerminalButton variant="primary" size="lg">{t("landing.ctaPrimary")}</TerminalButton>
            </Link>
            <Link to="/live-demo">
              <TerminalButton variant="ghost" size="lg">{t("landing.ctaSecondary")}</TerminalButton>
            </Link>
          </div>
        </section>

        {/* FEATURES */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pb-16">
          {[1, 2, 3].map((n) => (
            <TerminalCard key={n} label={`> MOD_0${n}`} className="p-5">
              <h3 className="font-display text-2xl tracking-wider text-[var(--terminal)]">
                {t(`landing.feature${n}Title`)}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-dim)]">
                {t(`landing.feature${n}Desc`)}
              </p>
            </TerminalCard>
          ))}
        </section>

        {/* COMPLIANCE */}
        <footer className="relative z-10 -mx-4 sm:-mx-6 mt-8 border-t border-border bg-background px-4 sm:px-6 py-6 font-mono text-[11px] text-[var(--text-dim)]">
          {t("landing.compliance")}
        </footer>
      </main>
    </div>
  );
}
