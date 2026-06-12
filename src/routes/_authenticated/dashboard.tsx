import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { getMyProfile, getMyVerification } from "@/lib/avatrade.functions";
import { adminClaimAvailable, claimAdminRole } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HTT" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchVerification = useServerFn(getMyVerification);
  const fetchAdminAvailable = useServerFn(adminClaimAvailable);
  const callClaimAdmin = useServerFn(claimAdminRole);

  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: vData } = useQuery({
    queryKey: ["my-verification"],
    queryFn: () => fetchVerification(),
  });
  const { data: adminAvail } = useQuery({
    queryKey: ["admin-claim-available"],
    queryFn: () => fetchAdminAvailable(),
    enabled: !!profileData && !profileData.isAdmin,
  });

  const username = profileData?.profile?.username ?? "...";
  const status = vData?.verification?.status;
  const isVerified = status === "verified";
  const isPending = status === "pending";

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function onClaimAdmin() {
    try {
      await callClaimAdmin();
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-claim-available"] });
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <TerminalCard label="> USER_SESSION" className="p-6 flex items-center gap-5">
          <GlitchAvatar name={username} color={isVerified ? "green" : "amber"} size={72} />
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
              {t("dashboard.welcome", { username: "" })}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-[0.08em] truncate">
              {username}
            </h1>
            <div className="mt-2">
              {isVerified ? (
                <span className="inline-block border border-[var(--terminal)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--terminal)] htt-text-glow-green">
                  ✓ {t("dashboard.verifiedBadge")}
                </span>
              ) : (
                <span className="inline-block border border-[var(--amber)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                  ⏳ {t("dashboard.pendingBadge")}
                </span>
              )}
            </div>
          </div>
          <TerminalButton variant="ghost" size="sm" onClick={logout}>
            {t("common.logout")}
          </TerminalButton>
        </TerminalCard>

        {!isVerified && (
          <TerminalCard label="> NEXT_STEP" glow="amber" className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-display text-xl text-[var(--amber)]">
                {isPending ? t("onboarding.verifyTitle") : t("onboarding.avatradeTitle")}
              </div>
              <div className="font-mono text-xs text-[var(--text-dim)] mt-1">
                {isPending ? t("onboarding.verifyDesc") : t("onboarding.avatradeIntro")}
              </div>
            </div>
            <Link to={isPending ? "/onboarding/verify" : "/onboarding/avatrade"}>
              <TerminalButton variant="amber">{t("common.next")}</TerminalButton>
            </Link>
          </TerminalCard>
        )}

        <TerminalCard label="> MODULES" className="p-5">
          <p className="font-mono text-xs text-[var(--text-dim)]">{t("dashboard.comingSoon")}</p>
          {profileData?.isAdmin ? (
            <Link to="/admin" className="mt-4 inline-block">
              <TerminalButton variant="ghost" size="sm">{t("nav.admin")}</TerminalButton>
            </Link>
          ) : adminAvail?.available ? (
            <div className="mt-4 border border-[var(--amber)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--amber)]">
                // ADMIN_BOOTSTRAP
              </div>
              <p className="font-mono text-xs text-[var(--text-dim)] mt-1">
                {t("dashboard.claimAdmin.desc")}
              </p>
              <TerminalButton variant="amber" size="sm" className="mt-3" onClick={onClaimAdmin}>
                {t("dashboard.claimAdmin.cta")}
              </TerminalButton>
            </div>
          ) : null}
        </TerminalCard>
      </main>
    </div>
  );
}