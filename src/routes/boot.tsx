import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/translate";
import { TypewriterText } from "@/components/htt/TypewriterText";

export const Route = createFileRoute("/boot")({
  head: () => ({
    meta: [
      { title: "Boot — HACK_THE_TRADING" },
      { name: "description", content: "Avvio sistema HTT" },
    ],
  }),
  component: BootPage,
});

function BootPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const lines = [
    t("boot.line1"),
    t("boot.line2"),
    t("boot.line3"),
    t("boot.line4"),
    t("boot.line5"),
  ];

  // Skip + auto-redirect: se già visto in questa sessione, vai diretto.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("htt_booted") === "1") {
      navigate({ to: "/auth", replace: true });
    }
  }, [navigate]);

  function skip() {
    if (typeof window !== "undefined") sessionStorage.setItem("htt_booted", "1");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background htt-scanlines cursor-pointer p-6"
    >
      <div className="w-full max-w-xl space-y-2 font-mono text-sm sm:text-base text-[var(--terminal)] htt-text-glow-green">
        {lines.slice(0, step + 1).map((ln, i) => (
          <div key={i}>
            {i === step ? (
              <TypewriterText
                text={ln}
                speed={18}
                onDone={() => {
                  if (step < lines.length - 1) {
                    setTimeout(() => setStep((s) => s + 1), 180);
                  } else {
                    setTimeout(skip, 700);
                  }
                }}
              />
            ) : (
              ln
            )}
          </div>
        ))}
      </div>
      {step >= lines.length - 1 && (
        <div className="mt-12 font-display text-4xl sm:text-6xl tracking-[0.1em] text-foreground htt-text-glow-green animate-in fade-in duration-700">
          HACK<span className="text-[var(--terminal)]">_</span>THE
          <span className="text-[var(--terminal)]">_</span>TRADING
        </div>
      )}
      <div className="absolute bottom-6 font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
        [ {t("boot.skipHint")} ]
      </div>
    </div>
  );
}
