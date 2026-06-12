import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { TerminalInput } from "@/components/htt/TerminalInput";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { listOpenChallenges, listMyChallenges, joinChallenge } from "@/lib/challenges.functions";
import { getSymbol, DURATIONS } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({ meta: [{ title: "Sfide — HTT" }] }),
  component: ChallengesLayout,
});

function ChallengesLayout() {
  const location = useLocation();
  const isIndex = location.pathname === "/challenges" || location.pathname === "/challenges/";
  return isIndex ? <ChallengesHub /> : <Outlet />;
}

function ChallengesHub() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr] = useState<string | null>(null);

  const fetchOpen = useServerFn(listOpenChallenges);
  const fetchMine = useServerFn(listMyChallenges);
  const callJoin = useServerFn(joinChallenge);

  const { data: open } = useQuery({ queryKey: ["challenges-open"], queryFn: () => fetchOpen() });
  const { data: mine } = useQuery({ queryKey: ["challenges-mine"], queryFn: () => fetchMine() });

  async function onJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    setJoinErr(null);
    try {
      const { id } = await callJoin({ data: { invite_code: joinCode.trim().toUpperCase() } });
      window.location.assign(`/challenges/${id}`);
    } catch (err) {
      setJoinErr(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
              // ARENA
            </div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-[0.06em] text-[var(--terminal)] htt-text-glow-green">
              {t("challenges.title")}
            </h1>
          </div>
          <Link to="/challenges/new">
            <TerminalButton variant="primary" size="lg">+ {t("challenges.create")}</TerminalButton>
          </Link>
        </div>

        <TerminalCard label="> JOIN_BY_CODE" className="p-4">
          <form onSubmit={onJoinByCode} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <TerminalInput
                name="code"
                label={t("challenges.inviteCodeLabel")}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                minLength={6}
                placeholder="ABC123"
              />
            </div>
            <TerminalButton variant="amber" type="submit">{t("challenges.join")}</TerminalButton>
          </form>
          {joinErr && <div className="mt-2 font-mono text-xs text-[var(--alert)]">{joinErr}</div>}
        </TerminalCard>

        <div className="flex gap-2 font-mono text-xs uppercase tracking-widest">
          {(["open", "mine"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "px-3 py-2 border transition-colors",
                tab === k
                  ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                  : "border-border text-[var(--text-dim)] hover:text-foreground",
              )}
            >
              {t(`challenges.tab.${k}`)}
            </button>
          ))}
        </div>

        {tab === "open" ? (
          <OpenList items={open?.items ?? []} onJoin={callJoin} />
        ) : (
          <MineList items={mine?.items ?? []} />
        )}
      </main>
    </div>
  );
}

function OpenList({ items, onJoin }: { items: any[]; onJoin: (a: any) => Promise<any> }) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <p className="font-mono text-xs text-[var(--text-dim)]">{t("challenges.empty")}</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((c) => {
        const sym = getSymbol(c.symbol);
        const dur = DURATIONS.find((d) => d.value === c.duration_minutes);
        return (
          <TerminalCard key={c.id} className="p-4 flex items-center gap-4">
            <GlitchAvatar name={c.creator.username} color="amber" size={48} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] truncate">
                @{c.creator.username}
              </div>
              <div className="font-display text-xl tracking-wider truncate">
                {sym?.label ?? c.symbol}
              </div>
              <div className="font-mono text-[11px] text-[var(--text-dim)] mt-1">
                {dur?.label} · {c.stake_type === "points"
                  ? `${c.stake_amount} HTT`
                  : t("challenges.honor")}
              </div>
            </div>
            <TerminalButton
              variant="primary"
              size="sm"
              onClick={async () => {
                try {
                  const { id } = await onJoin({ data: { id: c.id } });
                  window.location.assign(`/challenges/${id}`);
                } catch (err) {
                  alert(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              {t("challenges.accept")}
            </TerminalButton>
          </TerminalCard>
        );
      })}
    </div>
  );
}

function MineList({ items }: { items: any[] }) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <p className="font-mono text-xs text-[var(--text-dim)]">{t("challenges.emptyMine")}</p>;
  }
  const statusColor: Record<string, string> = {
    waiting: "text-[var(--amber)] border-[var(--amber)]",
    live: "text-[var(--terminal)] border-[var(--terminal)] htt-text-glow-green",
    settled: "text-[var(--text-dim)] border-border",
    cancelled: "text-[var(--alert)] border-[var(--alert)]",
  };
  return (
    <div className="space-y-3">
      {items.map((c) => {
        const sym = getSymbol(c.symbol);
        const dur = DURATIONS.find((d) => d.value === c.duration_minutes);
        return (
          <Link
            key={c.id}
            to="/challenges/$id"
            params={{ id: c.id }}
            className="block"
          >
            <TerminalCard className="p-4 flex items-center gap-4 hover:border-[var(--terminal)] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl tracking-wider truncate">
                  {sym?.label ?? c.symbol}
                </div>
                <div className="font-mono text-[11px] text-[var(--text-dim)] mt-1">
                  {dur?.label} · {c.stake_type === "points" ? `${c.stake_amount} HTT` : t("challenges.honor")}
                  {c.invite_code ? ` · CODE ${c.invite_code}` : ""}
                </div>
              </div>
              <span className={cn(
                "inline-block px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest",
                statusColor[c.status] ?? "",
              )}>
                {t(`challenges.status.${c.status}`)}
              </span>
            </TerminalCard>
          </Link>
        );
      })}
    </div>
  );
}