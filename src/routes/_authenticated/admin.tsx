import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { listVerifications, reviewVerification, getMyProfile } from "@/lib/avatrade.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — HTT" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchProfile = useServerFn(getMyProfile);
  const fetchList = useServerFn(listVerifications);
  const review = useServerFn(reviewVerification);

  // Gate ruolo: se non admin -> dashboard
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });
  useEffect(() => {
    if (!profileLoading && profile && !profile.isAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: () => fetchList(),
    enabled: profile?.isAdmin === true,
  });

  const mutate = useMutation({
    mutationFn: (vars: { id: string; status: "verified" | "rejected" }) => review({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-verifications"] }),
  });

  if (!profile?.isAdmin) return null;

  const pending = (data?.requests ?? []).filter((r: any) => r.status === "pending");

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em] text-[var(--terminal)] htt-text-glow-green">
          {t("admin.title")}
        </h1>

        {isLoading ? (
          <div className="font-mono text-sm text-[var(--terminal)]">{t("common.loading")}</div>
        ) : pending.length === 0 ? (
          <TerminalCard className="p-6">
            <p className="font-mono text-sm text-[var(--text-dim)]">{t("admin.noRequests")}</p>
          </TerminalCard>
        ) : (
          <div className="space-y-3">
            {pending.map((r: any) => (
              <TerminalCard key={r.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="font-mono text-sm space-y-1">
                  <div className="font-display text-lg text-foreground">{r.username}</div>
                  <div className="text-[var(--text-dim)] text-xs">
                    {t("admin.accountId")}: <span className="text-foreground">{r.avatrade_account_id}</span>
                  </div>
                  <div className="text-[var(--text-dim)] text-xs">
                    {t("admin.submittedAt")} {new Date(r.submitted_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <TerminalButton
                    variant="primary"
                    size="sm"
                    onClick={() => mutate.mutate({ id: r.id, status: "verified" })}
                    disabled={mutate.isPending}
                  >
                    {t("admin.approve")}
                  </TerminalButton>
                  <TerminalButton
                    variant="danger"
                    size="sm"
                    onClick={() => mutate.mutate({ id: r.id, status: "rejected" })}
                    disabled={mutate.isPending}
                  >
                    {t("admin.reject")}
                  </TerminalButton>
                </div>
              </TerminalCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}