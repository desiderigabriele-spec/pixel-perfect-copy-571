import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { getLeaderboard } from "@/lib/profile.functions";

export const Route = createFileRoute("/leaderboard")({
  loader: () => getLeaderboard(),
  head: () => ({
    meta: [
      { title: "Classifica — HACK_THE_TRADING" },
      { name: "description", content: "Top trader HTT per pips totali nelle sfide 1v1 verificate." },
      { property: "og:title", content: "Classifica — HACK_THE_TRADING" },
      { property: "og:description", content: "Top trader HTT per pips totali nelle sfide 1v1 verificate." },
    ],
    links: [{ rel: "canonical", href: "/leaderboard" }],
  }),
  errorComponent: ({ error }) => (
    <Shell><p className="font-mono text-xs text-[var(--alert)]">{(error as Error).message}</p></Shell>
  ),
  notFoundComponent: () => <Shell><p className="font-mono text-xs text-[var(--text-dim)]">404</p></Shell>,
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { t } = useTranslation();
  const { items } = Route.useLoaderData();
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">// LEADERBOARD</div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl tracking-[0.06em] text-[var(--terminal)] htt-text-glow-green">
            {t("leaderboard.title")}
          </h1>
          <p className="mt-2 font-mono text-xs text-[var(--text-dim)]">{t("leaderboard.subtitle")}</p>
        </div>

        {items.length === 0 ? (
          <TerminalCard label="> EMPTY" className="p-8 text-center">
            <p className="font-mono text-sm text-[var(--text-dim)]">{t("leaderboard.empty")}</p>
          </TerminalCard>
        ) : (
          <TerminalCard label="> TOP_TRADERS" glow="green" className="p-0">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
                  <th className="text-left p-3 w-12">#</th>
                  <th className="text-left p-3">{t("leaderboard.trader")}</th>
                  <th className="text-right p-3">{t("leaderboard.pips")}</th>
                  <th className="text-right p-3 hidden sm:table-cell">{t("leaderboard.wl")}</th>
                  <th className="text-right p-3 hidden sm:table-cell">{t("leaderboard.streak")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r: any, i: number) => (
                  <tr key={r.username} className="border-b border-border/40 hover:bg-[var(--terminal)]/5">
                    <td className="p-3 text-[var(--amber)] tabular-nums">{i + 1}</td>
                    <td className="p-3">
                      <Link to="/u/$username" params={{ username: r.username }} className="flex items-center gap-3 hover:text-[var(--terminal)]">
                        <GlitchAvatar name={r.username} color="green" size={32} />
                        <span className="truncate">@{r.username}</span>
                      </Link>
                    </td>
                    <td className={`p-3 text-right tabular-nums ${r.pips >= 0 ? "text-[var(--terminal)]" : "text-[var(--alert)]"}`}>
                      {r.pips > 0 ? "+" : ""}{r.pips}
                    </td>
                    <td className="p-3 text-right tabular-nums hidden sm:table-cell text-[var(--text-dim)]">
                      {r.wins}W · {r.losses}L
                    </td>
                    <td className={`p-3 text-right tabular-nums hidden sm:table-cell ${r.streak >= 0 ? "text-[var(--amber)]" : "text-[var(--alert)]"}`}>
                      {r.streak === 0 ? "—" : `${r.streak > 0 ? "+" : ""}${r.streak}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TerminalCard>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}