import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { supabase } from "@/integrations/supabase/client";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { listMessages, postMessage } from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

type Props = {
  challengeId: string;
  canPost: boolean; // true se l'utente è creator o opponent E la sfida è waiting/live
  myId?: string;
  creatorId: string;
  opponentId?: string | null;
};

export function ChallengeChat({ challengeId, canPost, myId, creatorId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchList = useServerFn(listMessages);
  const callPost = useServerFn(postMessage);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery({
    queryKey: ["chat", challengeId],
    queryFn: () => fetchList({ data: { challenge_id: challengeId } }),
  });

  // Realtime: nuovi INSERT invalidano la lista.
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${challengeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "challenge_messages", filter: `challenge_id=eq.${challengeId}` },
        () => qc.invalidateQueries({ queryKey: ["chat", challengeId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, qc]);

  // Auto-scroll al bottom quando arrivano nuovi messaggi.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.items.length]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await callPost({ data: { challenge_id: challengeId, body } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["chat", challengeId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <TerminalCard label="> CHAT" className="p-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 space-y-3 border-b border-border"
      >
        {items.length === 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] text-center pt-12">
            {t("chat.empty")}
          </p>
        ) : (
          items.map((m) => {
            const mine = myId === m.user_id;
            const isCreator = m.user_id === creatorId;
            const color: "green" | "amber" = isCreator ? "green" : "amber";
            const accent = isCreator ? "text-[var(--terminal)]" : "text-[var(--amber)]";
            return (
              <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                <GlitchAvatar name={m.author.username} color={color} size={28} />
                <div className={cn("flex-1 min-w-0", mine && "text-right")}>
                  <div className={cn("font-mono text-[10px] uppercase tracking-widest", accent)}>
                    @{m.author.username}
                  </div>
                  <div className="font-mono text-sm text-foreground break-words whitespace-pre-wrap">
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {canPost ? (
        <form onSubmit={onSend} className="flex gap-2 p-3 bg-background/50">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={t("chat.placeholder")}
            className="flex-1 bg-transparent border border-border px-3 py-2 font-mono text-sm text-foreground placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--terminal)]"
          />
          <TerminalButton variant="primary" size="sm" disabled={sending || !text.trim()}>
            {t("chat.send")}
          </TerminalButton>
        </form>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] text-center py-3">
          {t("chat.readOnly")}
        </p>
      )}
    </TerminalCard>
  );
}