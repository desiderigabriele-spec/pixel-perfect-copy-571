import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/translate";
import { LangSwitcher } from "./LangSwitcher";
import { HttLogo } from "./HttLogo";
import { useAccessLevel } from "@/hooks/useAccessLevel";

const navLinkClass =
  "hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--terminal)] transition-colors";

// Header globale con wordmark + nav contestuale + lang switcher.
export function HttHeader() {
  const { t } = useTranslation();
  const { level, loading } = useAccessLevel();
  const isLoggedIn = !loading && level !== "public";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-3 font-display text-base sm:text-xl tracking-[0.2em] text-[var(--terminal)] htt-text-glow-green"
        >
          <HttLogo size={24} />
          <span className="hidden sm:inline">HACK_THE_TRADING</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link to="/live-demo" className={navLinkClass}>
            {t("nav.live")}
          </Link>
          <Link to="/challenges" className={navLinkClass}>
            {t("nav.challenges")}
          </Link>
          <Link to="/leaderboard" className={navLinkClass}>
            {t("nav.leaderboard")}
          </Link>
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className={navLinkClass}>
                {t("nav.dashboard")}
              </Link>
              <Link
                to="/settings"
                className="hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--amber)] transition-colors"
              >
                {t("nav.settings")}
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="font-mono text-xs uppercase tracking-widest border border-[var(--terminal)] px-3 py-1 text-[var(--terminal)] hover:bg-[var(--terminal)]/10 transition-colors"
            >
              {t("common.login")}
            </Link>
          )}
          <LangSwitcher />
        </nav>
      </div>
    </header>
  );
}
