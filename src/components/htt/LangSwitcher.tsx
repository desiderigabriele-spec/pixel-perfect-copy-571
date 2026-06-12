import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// Selettore lingua compatto IT/EN.
export function LangSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "it").startsWith("en") ? "en" : "it";
  return (
    <div className={cn("inline-flex border border-border font-mono text-[10px]", className)}>
      {(["it", "en"] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
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