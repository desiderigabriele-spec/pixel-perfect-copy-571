import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Filtro di moderazione lato server: blocca URL, email, telefoni,
// promesse di profitto, parole-chiave di copy-trading/segnali.
const BANNED_PATTERNS: RegExp[] = [
  /\bhttps?:\/\/\S+/i,
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  /(?:\+?\d[\s.-]?){8,}\d/,
  /\b(?:telegram|whatsapp|insta(?:gram)?|tg|wa|dm)\s*[:@]?\s*\w/i,
  /\b(?:guadagn|profitt|ricco|10x|moltiplica|copia|segnali)\b/i,
];

function moderate(body: string): { ok: true } | { ok: false; reason: string } {
  for (const p of BANNED_PATTERNS) {
    if (p.test(body)) return { ok: false, reason: "blocked_by_policy" };
  }
  return { ok: true };
}

// Lista ultimi 100 messaggi spettatori per una live.
export const listLiveMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs, error } = await supabase
      .from("live_chat_messages")
      .select("id, user_id, body, created_at")
      .eq("challenge_id", data.challenge_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const ordered = (msgs ?? []).reverse();
    const ids = Array.from(new Set(ordered.map((m) => m.user_id)));
    let byId = new Map<string, { username: string }>();
    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, username").in("id", ids);
      byId = new Map((profs ?? []).map((p: any) => [p.id, { username: p.username }]));
    }
    return {
      items: ordered.map((m) => ({ ...m, author: byId.get(m.user_id) ?? { username: "anon" } })),
    };
  });

// Invia messaggio spettatore (RLS impone affiliato + sfida live pubblica).
export const postLiveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      challenge_id: z.string().uuid(),
      body: z.string().trim().min(1).max(300),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const mod = moderate(data.body);
    if (!mod.ok) throw new Error("moderation_blocked");
    const { error } = await context.supabase
      .from("live_chat_messages")
      .insert({ challenge_id: data.challenge_id, body: data.body, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const REACTION_EMOJIS = ["🔥", "💎", "👏", "⚡", "💪"] as const;

// Reazione emoji: throttling base lato server (max 1 ogni 1.5s per utente/sfida).
export const postLiveReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      challenge_id: z.string().uuid(),
      emoji: z.enum(REACTION_EMOJIS),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Throttle: scarta se ne ho una < 1.5s fa
    const { data: last } = await context.supabase
      .from("live_reactions")
      .select("created_at")
      .eq("challenge_id", data.challenge_id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 1500) {
      return { ok: false, throttled: true };
    }
    const { error } = await context.supabase
      .from("live_reactions")
      .insert({ challenge_id: data.challenge_id, emoji: data.emoji, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export { REACTION_EMOJIS };