import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Lista messaggi di una sfida (ordine cronologico crescente).
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs, error } = await supabase
      .from("challenge_messages")
      .select("id, user_id, body, created_at")
      .eq("challenge_id", data.challenge_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((msgs ?? []).map((m) => m.user_id)));
    let profMap = new Map<string, { username: string; avatar_seed: string | null }>();
    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, username, avatar_seed")
        .in("id", ids);
      profMap = new Map(
        (profs ?? []).map((p: any) => [p.id, { username: p.username, avatar_seed: p.avatar_seed }]),
      );
    }
    return {
      items: (msgs ?? []).map((m) => ({
        ...m,
        author: profMap.get(m.user_id) ?? { username: "anon", avatar_seed: null },
      })),
    };
  });

// Invia un messaggio. RLS impone: solo partecipanti, solo se waiting/live.
export const postMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challenge_id: z.string().uuid(),
        body: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("challenge_messages")
      .insert({ challenge_id: data.challenge_id, body: data.body, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
