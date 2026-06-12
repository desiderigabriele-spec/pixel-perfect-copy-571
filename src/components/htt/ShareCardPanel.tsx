import { useState } from "react";
import { TerminalCard } from "./TerminalCard";
import { TerminalButton } from "./TerminalButton";
import { useTranslation } from "react-i18next";

// Pannello "GENERA CARD": due preview (stories e post) con bottoni
// per scaricare l'SVG e copiare il link. Compliance: testo fisso "seguimi".
type Props = { username: string; rank?: number };

const TYPES = ["challenge", "top10", "win", "rank", "milestone"] as const;

export function ShareCardPanel({ username, rank }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<(typeof TYPES)[number]>("challenge");
  const url = (format: "story" | "post") =>
    `/api/public/card/${username}?format=${format}&type=${type}${rank ? `&rank=${rank}` : ""}`;

  function copy(href: string) {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.origin + href).catch(() => {});
    }
  }

  return (
    <TerminalCard label="> SHARE_CARD · GENERATE" glow="amber" className="p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t0) => (
          <button
            key={t0}
            type="button"
            onClick={() => setType(t0)}
            className={`px-3 py-1 border font-mono text-[10px] uppercase tracking-widest ${
              type === t0
                ? "border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]/10"
                : "border-border text-[var(--text-dim)] hover:text-foreground"
            }`}
          >
            {t0}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {(["story", "post"] as const).map((fmt) => (
          <div key={fmt} className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
              {fmt === "story" ? "STORIES · 9:16" : "POST · 1:1"}
            </div>
            <div className="border border-border bg-[#0A0A0A] overflow-hidden">
              <img
                src={url(fmt)}
                alt={`${fmt} share card`}
                className={fmt === "story" ? "w-full aspect-[9/16] object-contain" : "w-full aspect-square object-contain"}
              />
            </div>
            <div className="flex gap-2">
              <a
                href={url(fmt)}
                download={`htt-${username}-${type}-${fmt}.svg`}
                className="flex-1"
              >
                <TerminalButton variant="primary" size="sm" className="w-full">
                  {t("share.download")}
                </TerminalButton>
              </a>
              <button
                type="button"
                onClick={() => copy(url(fmt))}
                className="px-3 py-1.5 border border-border text-[var(--text-dim)] font-mono text-[10px] uppercase tracking-widest hover:text-foreground"
              >
                {t("share.copyLink")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="font-mono text-[10px] text-[var(--text-dim)]">
        {t("share.note")}
      </p>
    </TerminalCard>
  );
}