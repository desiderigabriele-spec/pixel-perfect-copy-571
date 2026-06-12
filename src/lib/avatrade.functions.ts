import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Schema input ID conto AvaTrade
const accountSchema = z.object({
  avatrade_account_id: z
    .string()
    .min(4)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

// L'utente invia/aggiorna la propria richiesta di verifica AvaTrade.
export const submitAvatradeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("avatrade_verifications").upsert(
      {
        user_id: userId,
        avatrade_account_id: data.avatrade_account_id,
        status: "pending",
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Stato verifica del proprio account
export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("avatrade_verifications")
      .select("status, avatrade_account_id, submitted_at, reviewed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { verification: data };
  });

// Profilo + ruolo dell'utente loggato (per la dashboard).
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }, { data: verif }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_seed, points_balance")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("avatrade_verifications").select("status").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      profile,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      isAffiliated: verif?.status === "verified",
    };
  });

// === ADMIN ===

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export const listVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("avatrade_verifications")
      .select("id, user_id, avatrade_account_id, status, submitted_at")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    // join username via profiles
    const ids = (data ?? []).map((d) => d.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ids);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));
    return {
      requests: (data ?? []).map((d: any) => ({ ...d, username: byId.get(d.user_id) ?? "—" })),
    };
  });

const reviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
});

export const reviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("avatrade_verifications")
      .update({
        status: data.status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
