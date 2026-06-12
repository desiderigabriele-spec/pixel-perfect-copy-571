import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SYMBOL_CODES } from "@/lib/symbols";
import { priceAt, pipsFor } from "@/lib/priceFeed";

const DURATIONS = [15, 60, 240, 1440] as const;

const createSchema = z.object({
  symbol: z.enum(SYMBOL_CODES),
  duration_minutes: z.union([z.literal(15), z.literal(60), z.literal(240), z.literal(1440)]),
  stake_type: z.enum(["points", "honor"]),
  stake_amount: z.number().int().min(0).max(100000),
  visibility: z.enum(["public", "private"]),
  side: z.enum(["long", "short"]),
});

function genInviteCode(): string {
  // 6 caratteri leggibili, no 0/O/1/I.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Solo gli utenti con AvaTrade verificato possono creare/joinare sfide.
async function assertVerified(adminClient: any, userId: string) {
  const { data } = await adminClient
    .from("avatrade_verifications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.status !== "verified") throw new Error("not_verified");
}

// Crea una nuova sfida in stato 'waiting'.
export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertVerified(supabaseAdmin, context.userId);

    const stake_amount = data.stake_type === "points" ? data.stake_amount : 0;

    if (data.stake_type === "points" && stake_amount > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("points_balance")
        .eq("id", context.userId)
        .single();
      if (!profile || (profile.points_balance ?? 0) < stake_amount) {
        throw new Error("insufficient_points");
      }
    }

    const invite_code = data.visibility === "private" ? genInviteCode() : null;

    const { data: row, error } = await supabaseAdmin
      .from("challenges")
      .insert({
        creator_id: context.userId,
        symbol: data.symbol,
        duration_minutes: data.duration_minutes,
        stake_type: data.stake_type,
        stake_amount,
        visibility: data.visibility,
        invite_code,
        status: "waiting",
        creator_side: data.side,
      })
      .select("id, invite_code")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, invite_code: row.invite_code as string | null };
  });

// Lista sfide pubbliche in attesa (lobby).
export const listOpenChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("challenges")
      .select("id, symbol, duration_minutes, stake_type, stake_amount, creator_id, created_at")
      .eq("visibility", "public")
      .eq("status", "waiting")
      .neq("creator_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((c) => c.creator_id);
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, avatar_seed").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      items: (data ?? []).map((c: any) => ({
        ...c,
        creator: byId.get(c.creator_id) ?? { username: "—", avatar_seed: c.creator_id },
      })),
    };
  });

// Sfide dell'utente loggato (create + a cui partecipa), tutti gli stati.
export const listMyChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("challenges")
      .select("id, symbol, duration_minutes, stake_type, stake_amount, status, visibility, invite_code, creator_id, opponent_id, starts_at, ends_at, winner_id, created_at")
      .or(`creator_id.eq.${context.userId},opponent_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

// Dettaglio di una singola sfida (con username partecipanti).
export const getChallenge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c, error } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("not_found");

    // Authorization: solo creator/opponent/admin per private; tutti autenticati per public.
    if (c.visibility === "private" && c.creator_id !== context.userId && c.opponent_id !== context.userId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: context.userId, _role: "admin",
      });
      if (!isAdmin) throw new Error("forbidden");
    }

    const ids = [c.creator_id, c.opponent_id].filter(Boolean) as string[];
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, avatar_seed").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      challenge: {
        ...c,
        creator: byId.get(c.creator_id) ?? null,
        opponent: c.opponent_id ? byId.get(c.opponent_id) ?? null : null,
      },
    };
  });

// Join: imposta opponent_id, scala stake (se 'points'), passa a 'live' con timer.
export const joinChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      invite_code: z.string().length(6).optional(),
      side: z.enum(["long", "short"]).optional(),
    })
      .refine((v) => v.id || v.invite_code, "id or invite_code required")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertVerified(supabaseAdmin, context.userId);

    const query = supabaseAdmin.from("challenges").select("*").eq("status", "waiting");
    const filtered = data.id
      ? query.eq("id", data.id)
      : query.eq("invite_code", data.invite_code as string);
    const { data: c, error } = await filtered.maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("challenge_not_found");
    if (c.creator_id === context.userId) throw new Error("cannot_join_own");
    if (c.opponent_id) throw new Error("already_full");

    // Verifica saldi se posta in punti.
    if (c.stake_type === "points" && c.stake_amount > 0) {
      const ids = [c.creator_id, context.userId];
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, points_balance").in("id", ids);
      const ok = (profs ?? []).every((p: any) => (p.points_balance ?? 0) >= c.stake_amount);
      if (!ok) throw new Error("insufficient_points");
      // Scala stake (creator + opponent). In step 04 si redistribuiranno al vincitore.
      await supabaseAdmin.rpc; // placeholder per linter
      for (const uid of ids) {
        const cur = (profs ?? []).find((p: any) => p.id === uid);
        await supabaseAdmin
          .from("profiles")
          .update({ points_balance: (cur?.points_balance ?? 0) - c.stake_amount })
          .eq("id", uid);
      }
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + c.duration_minutes * 60_000);
    const entry = priceAt(c.symbol, startsAt.getTime(), 0);
    // Se la side non è specificata (es. join by code rapido), prendi il lato opposto del creatore.
    const opponentSide = data.side ?? (c.creator_side === "long" ? "short" : "long");
    const { error: updErr } = await supabaseAdmin
      .from("challenges")
      .update({
        opponent_id: context.userId,
        status: "live",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        opponent_side: opponentSide,
        entry_price: entry,
      })
      .eq("id", c.id)
      .eq("status", "waiting"); // race-guard
    if (updErr) throw new Error(updErr.message);

    return { id: c.id };
  });

// Annulla una sfida ancora in attesa (solo creator).
export const cancelChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("challenges")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("creator_id", context.userId)
      .eq("status", "waiting");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Settlement: callable da qualunque utente autenticato; agisce solo se la sfida
// è 'live' e il timer è scaduto. Calcola pips deterministici, decreta winner,
// trasferisce stake. Idempotente grazie al guard sullo status.
export const settleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c, error } = await supabaseAdmin
      .from("challenges").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("not_found");
    if (c.status !== "live") return { ok: true, alreadySettled: true };
    if (!c.starts_at || !c.ends_at) throw new Error("invalid_state");
    const endsAtMs = new Date(c.ends_at).getTime();
    if (Date.now() < endsAtMs) throw new Error("not_yet");

    const startsAtMs = new Date(c.starts_at).getTime();
    const durationSec = (endsAtMs - startsAtMs) / 1000;
    const creatorPips = pipsFor(c.symbol, startsAtMs, durationSec, c.creator_side as "long" | "short");
    const opponentPips = pipsFor(c.symbol, startsAtMs, durationSec, (c.opponent_side ?? "short") as "long" | "short");
    const exit = priceAt(c.symbol, startsAtMs, durationSec);

    let winnerId: string | null = null;
    if (creatorPips > opponentPips) winnerId = c.creator_id;
    else if (opponentPips > creatorPips) winnerId = c.opponent_id ?? null;
    // tie → winner_id null

    // Trasferimento punti (se posta in punti): il vincitore prende l'intero piatto.
    if (c.stake_type === "points" && c.stake_amount > 0 && winnerId) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("points_balance").eq("id", winnerId).single();
      const pot = c.stake_amount * 2;
      await supabaseAdmin
        .from("profiles")
        .update({ points_balance: (prof?.points_balance ?? 0) + pot })
        .eq("id", winnerId);
    } else if (c.stake_type === "points" && c.stake_amount > 0 && !winnerId) {
      // pareggio → rimborso ad entrambi
      const ids = [c.creator_id, c.opponent_id].filter(Boolean) as string[];
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, points_balance").in("id", ids);
      for (const uid of ids) {
        const cur = (profs ?? []).find((p: any) => p.id === uid);
        await supabaseAdmin
          .from("profiles")
          .update({ points_balance: (cur?.points_balance ?? 0) + c.stake_amount })
          .eq("id", uid);
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("challenges")
      .update({
        status: "settled",
        winner_id: winnerId,
        creator_pips: Number(creatorPips.toFixed(1)),
        opponent_pips: Number(opponentPips.toFixed(1)),
        exit_price: exit,
        settled_at: new Date().toISOString(),
      })
      .eq("id", c.id)
      .eq("status", "live");
    if (updErr) throw new Error(updErr.message);

    return { ok: true, winnerId, creatorPips, opponentPips };
  });

export const DURATION_VALUES = DURATIONS;