import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalInput } from "@/components/htt/TerminalInput";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { submitAvatradeAccount } from "@/lib/avatrade.functions";
import { AVATRADE_AFFILIATE_URL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/onboarding/avatrade")({
  head: () => ({ meta: [{ title: "AvaTrade — HTT" }] }),
  component: OnboardingAvatrade,
});

function OnboardingAvatrade() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useServerFn(submitAvatradeAccount);
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submit({ data: { avatrade_account_id: accountId.trim() } });
      navigate({ to: "/onboarding/verify" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">// STEP 03/03</div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em] mt-2">
            {t("onboarding.avatradeTitle")}
          </h1>
          <p className="text-[var(--text-dim)] mt-2 text-sm">{t("onboarding.avatradeIntro")}</p>
        </div>

        <div className="grid gap-3">
          {[1, 2, 3].map((n) => (
            <TerminalCard key={n} className="p-4 flex gap-4 items-start">
              <div className="font-display text-3xl text-[var(--terminal)] htt-text-glow-green leading-none w-8">
                0{n}
              </div>
              <div>
                <div className="font-display text-lg tracking-wider">
                  {t(`onboarding.step${n}Title`)}
                </div>
                <div className="text-sm text-[var(--text-dim)]">{t(`onboarding.step${n}Desc`)}</div>
              </div>
            </TerminalCard>
          ))}
        </div>

        <TerminalCard label="> ACTION_REQUIRED" glow="green" className="p-5 space-y-4">
          <a href={AVATRADE_AFFILIATE_URL} target="_blank" rel="noreferrer noopener">
            <TerminalButton variant="primary" size="lg" className="w-full" type="button">
              {t("onboarding.openAvatrade")} →
            </TerminalButton>
          </a>
          <form onSubmit={onSubmit} className="space-y-3">
            <TerminalInput
              name="avatrade_account_id"
              label={t("onboarding.accountIdLabel")}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              minLength={4}
              required
            />
            {error && <div className="font-mono text-xs text-[var(--alert)]">{error}</div>}
            <TerminalButton variant="amber" size="lg" type="submit" disabled={loading} className="w-full">
              {t("onboarding.submit")}
            </TerminalButton>
          </form>
        </TerminalCard>
      </main>
    </div>
  );
}