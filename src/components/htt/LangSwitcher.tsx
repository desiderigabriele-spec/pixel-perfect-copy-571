import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Selettore lingua compatto IT/EN.
export function LangSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Hydrate la lingua salvata solo lato client per evitare mismatch SSR.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("htt_lang") : null;
    if (saved && saved !== i18n.language && (saved === "it" || saved === "en")) {
      i18n.changeLanguage(saved);
    }
    setMounted(true);
  }, [i18n]);

  // Durante SSR e prima dell'idratazione, usa sempre "it" (default i18n).
  const current = mounted
    ? (i18n.resolvedLanguage ?? "it").startsWith("en") ? "en" : "it"
    : "it";

  function switchTo(lng: "it" | "en") {
    if (typeof window !== "undefined") window.localStorage.setItem("htt_lang", lng);
    i18n.changeLanguage(lng);
  }

  return (
    <div className={cn("inline-flex border border-border font-mono text-[10px]", className)}>
      {(["it", "en"] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => switchTo(lng)}
          className={cn(
            "px-2 py-1 uppercase transition-colors",
            current === lng
              ? "bg-[var(--terminal)]/15 text-[var(--terminal)]"
              : "text-[var(--text-dim)] hover:text-foreground",
          )}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}