import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { getMyVerification } from "@/lib/avatrade.functions";

export const Route = createFileRoute("/_authenticated/onboarding/verify")({
  head: () => ({ meta: [{ title: "Verifica — HTT" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const { t } = useTranslation();
  const fetchVerification = useServerFn(getMyVerification);
  const { data, isLoading } = useQuery({
    queryKey: ["my-verification"],
    queryFn: () => fetchVerification(),
    refetchInterval: 15_000,
  });

  const status = data?.verification?.status ?? "pending";
  const statusLabel = t(`onboarding.status${status.charAt(0).toUpperCase() + status.slice(1)}` as any);

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-xl px-4 sm:px-6 py-12 space-y-6">
        <TerminalCard label="> VERIFICATION_STATE" glow={status === "verified" ? "green" : "amber"} className="p-8 text-center">
          <div className="font-display text-3xl tracking-[0.1em]">
            {t("onboarding.verifyTitle")}
          </div>
          <p className="text-[var(--text-dim)] mt-3 text-sm">{t("onboarding.verifyDesc")}</p>
          {isLoading ? (
            <div className="mt-6 font-mono text-sm text-[var(--terminal)]">{t("common.loading")}</div>
          ) : (
            <div className="mt-6 font-mono text-sm">
              {t("onboarding.verifyStatus", { status: statusLabel })}
            </div>
          )}
          {data?.verification?.avatrade_account_id && (
            <div className="mt-2 font-mono text-xs text-[var(--text-dim)]">
              ID: {data.verification.avatrade_account_id}
            </div>
          )}
          <div className="mt-8">
            <Link to="/dashboard">
              <TerminalButton variant="ghost">DASHBOARD</TerminalButton>
            </Link>
          </div>
        </TerminalCard>
      </main>
    </div>
  );
}