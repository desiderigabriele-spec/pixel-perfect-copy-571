import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { supabase } from "@/integrations/supabase/client";
import {
  listLiveMessages,
  postLiveMessage,
  postLiveReaction,
  REACTION_EMOJIS,
} from "@/lib/liveStream.functions";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { TerminalCard } from "./TerminalCard";
import { Link } from "@tanstack/react-router";

type Props = { challengeId: string };

type Bubble = { id: number; emoji: string; left: number };

export function SpectatorChat({ challengeId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { level } = useAccessLevel();
  const canPost = level === "affiliated";
  const fetchList = useServerFn(listLiveMessages);
  const callPost = useServerFn(postLiveMessage);
  const callReact = useServerFn(postLiveReaction);
  const [text, setText] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery({
    queryKey: ["live-chat", challengeId],
    queryFn: () => fetchList({ data: { challenge_id: challengeId } }),
  });

  // Realtime: nuovi messaggi e reazioni
  useEffect(() => {
    const ch = supabase
      .channel(`live-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["live-chat", challengeId] }),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_reactions",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const emoji = (payload.new as any)?.emoji ?? "🔥";
          spawnBubble(emoji);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [data?.items.length]);

  function spawnBubble(emoji: string) {
    const b: Bubble = { id: Date.now() + Math.random(), emoji, left: 10 + Math.random() * 80 };
    setBubbles((prev) => [...prev, b]);
    setTimeout(() => setBubbles((prev) => prev.filter((x) => x.id !== b.id)), 2400);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    try {
      await callPost({ data: { challenge_id: challengeId, body } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["live-chat", challengeId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function react(emoji: (typeof REACTION_EMOJIS)[number]) {
    spawnBubble(emoji); // ottimistico
    try {
      await callReact({ data: { challenge_id: challengeId, emoji } });
    } catch {
      /* throttled etc, silenzioso */
    }
  }

  const items = data?.items ?? [];

  return (
    <TerminalCard
      label="> SPECTATOR_CHAT"
      className="p-0 overflow-hidden relative h-full flex flex-col"
    >
      {/* Bolle emoji */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {bubbles.map((b) => (
          <span
            key={b.id}
            className="absolute bottom-20 text-2xl animate-[float_2.4s_ease-out_forwards]"
            style={{ left: `${b.left}%` }}
          >
            {b.emoji}
          </span>
        ))}
      </div>
      <style>{`@keyframes float { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-160px); opacity: 0; } }`}</style>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] text-center pt-16">
            // be the first to cheer
          </p>
        ) : (
          items.map((m) => (
            <div key={m.id} className="font-mono text-xs leading-snug">
              <span className="text-[var(--terminal)]">@{m.author.username}</span>
              <span className="text-[var(--text-dim)]"> › </span>
              <span className="text-foreground break-words">{m.body}</span>
            </div>
          ))
        )}
      </div>

      {/* Reactions bar */}
      <div className="flex gap-1 px-3 py-2 border-t border-border">
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            disabled={!canPost}
            onClick={() => react(e)}
            className="text-lg hover:scale-125 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {e}
          </button>
        ))}
      </div>

      {canPost ? (
        <form onSubmit={send} className="flex gap-2 p-2 border-t border-border bg-background/50">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            placeholder={t("chat.placeholder")}
            className="flex-1 bg-transparent border border-border px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--terminal)]"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-3 py-1.5 border border-[var(--terminal)] text-[var(--terminal)] font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--terminal)]/10 disabled:opacity-40"
          >
            {t("chat.send")}
          </button>
        </form>
      ) : (
        <div className="border-t border-border p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
            {t("gate.title")}
          </p>
          <Link
            to={level === "public" ? "/auth" : "/onboarding"}
            className="inline-block font-mono text-[10px] uppercase tracking-widest text-[var(--terminal)] border border-[var(--terminal)]/50 px-3 py-1 hover:bg-[var(--terminal)]/10"
          >
            {level === "public" ? t("gate.signin") : t("gate.affiliate")} →
          </Link>
        </div>
      )}
    </TerminalCard>
  );
}
