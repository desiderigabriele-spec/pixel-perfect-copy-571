import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { getPublicProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    const { profile, stats } = await getPublicProfile({ data: { username: params.username } });
    if (!profile) throw notFound();
    return { profile, stats };
  },
  head: ({ params, loaderData }) => {
    const u = loaderData?.profile?.username ?? params.username;
    const title = `@${u} — HACK_THE_TRADING`;
    const desc = `Profilo trader verificato ${u} su HTT. Sfide 1v1, performance e classifica.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `/u/${u}` },
      ],
      links: [{ rel: "canonical", href: `/u/${u}` }],
    };
  },
  errorComponent: ({ error }) => (
    <ProfileError message={error instanceof Error ? error.message : String(error)} />
  ),
  notFoundComponent: () => <ProfileNotFound />,
  component: PublicProfile,
});

function PublicProfile() {
  const { t, i18n } = useTranslation();
  const { profile, stats } = Route.useLoaderData();
  const since = new Date(profile.created_at).toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
  });
  const cells: Array<{ k: string; v: string; tone: "green" | "amber" | "alert" | "dim" }> = [
    { k: "wins", v: String(stats?.wins ?? 0), tone: "green" },
    { k: "losses", v: String(stats?.losses ?? 0), tone: "alert" },
    { k: "pips", v: (stats?.pips ?? 0) > 0 ? `+${stats!.pips}` : String(stats?.pips ?? 0), tone: (stats?.pips ?? 0) >= 0 ? "green" : "alert" },
    { k: "streak", v: stats && stats.streak !== 0 ? `${stats.streak > 0 ? "+" : ""}${stats.streak}` : "—", tone: (stats?.streak ?? 0) >= 0 ? "amber" : "alert" },
  ];
  const toneClass = (t: "green" | "amber" | "alert" | "dim") =>
    t === "green" ? "text-[var(--terminal)] htt-text-glow-green" :
    t === "amber" ? "text-[var(--amber)]" :
    t === "alert" ? "text-[var(--alert)]" : "text-[var(--text-dim)]";
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
        <TerminalCard label="> TRADER_PROFILE" glow="green" className="p-6 sm:p-8 flex items-center gap-6">
          <GlitchAvatar name={profile.username} color="green" size={104} />
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
              // @{profile.username}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-[0.06em] text-[var(--terminal)] htt-text-glow-green truncate">
              {profile.username}
            </h1>
            <p className="mt-2 font-mono text-xs text-[var(--text-dim)]">
              {t("profile.memberSince", { date: since })}
            </p>
          </div>
        </TerminalCard>

        <TerminalCard label="> STATS" className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cells.map((c) => (
              <div key={c.k} className="border border-border p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  {t(`profile.stats.${c.k}`)}
                </div>
                <div className={`font-display text-3xl tabular-nums ${toneClass(c.tone)}`}>{c.v}</div>
              </div>
            ))}
          </div>
          {(!stats || stats.played === 0) && (
            <p className="mt-4 font-mono text-xs text-[var(--text-dim)]">{t("profile.stats.placeholder")}</p>
          )}
          {stats && stats.played > 0 && (
            <p className="mt-4 font-mono text-xs text-[var(--text-dim)]">
              {t("profile.stats.played", { n: stats.played })}
            </p>
          )}
        </TerminalCard>
      </main>
    </div>
  );
}

function ProfileNotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--alert)]">
          // USER_NOT_FOUND
        </div>
        <h1 className="font-display text-4xl tracking-[0.1em] mt-3">404</h1>
        <p className="mt-2 font-mono text-sm text-[var(--text-dim)]">{t("profile.notFound")}</p>
      </main>
    </div>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--alert)]">// SYSTEM_ERROR</div>
        <p className="mt-2 font-mono text-xs text-[var(--text-dim)]">{message}</p>
      </main>
    </div>
  );
}