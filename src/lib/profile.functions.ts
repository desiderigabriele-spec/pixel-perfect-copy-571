import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Profilo pubblico di un trader. Nessuna informazione sensibile.
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("username, avatar_seed, created_at")
      .ilike("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile };
  });