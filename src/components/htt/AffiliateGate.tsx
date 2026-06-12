import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/translate";
import { useAccessLevel, type AccessLevel } from "@/hooks/useAccessLevel";
import { TerminalButton } from "@/components/htt/TerminalButton";

// Avvolge contenuto premium e mostra un overlay/CTA se l'utente non ha
// il livello di accesso richiesto. Default richiesto: 'affiliated'.
// `mode="blur"`: il contenuto resta visibile ma sfocato, con overlay sopra.
// `mode="replace"`: nasconde completamente il contenuto e mostra solo la CTA.

type Props = {
  required?: Exclude<AccessLevel, "public">;
  mode?: "blur" | "replace";
  children: React.ReactNode;
};

const RANK: Record<AccessLevel, number> = { public: 0, registered: 1, affiliated: 2 };

export function AffiliateGate({ required = "affiliated", mode = "blur", children }: Props) {
  const { level, loading } = useAccessLevel();
  const { t } = useTranslation();

  if (loading) return <>{children}</>;
  if (RANK[level] >= RANK[required]) return <>{children}</>;

  const targetRoute = level === "public" ? "/auth" : "/onboarding";
  const ctaLabel = level === "public" ? t("gate.signin") : t("gate.affiliate");

  if (mode === "replace") {
    return <GateCard targetRoute={targetRoute} ctaLabel={ctaLabel} />;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
        <GateCard targetRoute={targetRoute} ctaLabel={ctaLabel} />
      </div>
    </div>
  );
}

function GateCard({ targetRoute, ctaLabel }: { targetRoute: string; ctaLabel: string }) {
  const { t } = useTranslation();
  return (
    <div className="border border-[var(--terminal)]/40 bg-background/90 p-6 text-center max-w-sm">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--terminal)] mb-2">
        // AFFILIATE_REQUIRED
      </div>
      <h3 className="font-display text-xl tracking-[0.06em] text-foreground mb-2">
        {t("gate.title")}
      </h3>
      <p className="font-mono text-xs text-[var(--text-dim)] mb-4 leading-relaxed">
        {t("gate.description")}
      </p>
      <Link to={targetRoute as any}>
        <TerminalButton variant="primary" size="md">
          {ctaLabel} →
        </TerminalButton>
      </Link>
    </div>
  );
}
