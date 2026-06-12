import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LangSwitcher } from "./LangSwitcher";

// Header globale con wordmark + nav minima + lang switcher.
export function HttHeader() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="font-display text-xl tracking-[0.2em] text-[var(--terminal)] htt-text-glow-green">
          HACK_THE_TRADING
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            to="/live-demo"
            className="hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--terminal)] transition-colors"
          >
            {t("nav.live")}
          </Link>
          <Link
            to="/challenges"
            className="hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--terminal)] transition-colors"
          >
            {t("nav.challenges")}
          </Link>
          <LangSwitcher />
        </nav>
      </div>
    </header>
  );
}