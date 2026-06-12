import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SYMBOL_CODES } from "@/lib/symbols";
import { priceAt } from "@/lib/priceFeed";

const createSchema = z.object({
  title: z.string().min(3).max(60),
  symbol: z.enum(SYMBOL_CODES),
  duration_minutes: z.union([z.literal(15), z.literal(60), z.literal(240), z.literal(1440)]),
  max_players: z.union([z.literal(4), z.literal(8), z.literal(16)]),
  stake_type: z.enum(["honor", "points"]),
  stake_amount: z.number().int().min(0).max(100000),
  visibility: z.enum(["public", "private"]),
  prize_note: z.string().max(200).optional(),
});

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function assertVerified(adminClient: any, userId: string) {
  const { data } = await adminClient
    .from("avatrade_verifications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.status !== "verified") throw new Error("not_verified");
}

// Crea un nuovo torneo in fase di registrazione.
export const createTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertVerified(supabaseAdmin, context.userId);

    const invite_code = data.visibility === "private" ? genCode() : null;

    const { data: row, error } = await supabaseAdmin
      .from("tournaments")
      .insert({
        title: data.title,
        creator_id: context.userId,
        symbol: data.symbol,
        duration_minutes: data.duration_minutes,
        max_players: data.max_players,
        stake_type: data.stake_type,
        stake_amount: data.stake_type === "points" ? data.stake_amount : 0,
        visibility: data.visibility,
        invite_code,
        prize_note: data.prize_note ?? null,
      })
      .select("id, invite_code")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, invite_code: row.invite_code as string | null };
  });

// Lista tornei aperti alla registrazione (pubblici).
export const listTournaments = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, symbol, duration_minutes, max_players, stake_type, stake_amount, status, visibility, created_at, creator_id")
      .eq("visibility", "public")
      .in("status", ["registration", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((t) => t.creator_id);
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p.username]));

    // Conta iscritti per ogni torneo
    const tIds = (data ?? []).map((t) => t.id);
    const { data: entries } = await supabaseAdmin
      .from("tournament_entries")
      .select("tournament_id")
      .in("tournament_id", tIds);
    const countById = new Map<string, number>();
    for (const e of entries ?? []) {
      countById.set(e.tournament_id, (countById.get(e.tournament_id) ?? 0) + 1);
    }

    return {
      items: (data ?? []).map((t: any) => ({
        ...t,
        creator_username: byId.get(t.creator_id) ?? "—",
        player_count: countById.get(t.id) ?? 0,
      })),
    };
  });

// Dettaglio torneo: bracket completo con match e profili partecipanti.
export const getTournament = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t, error } = await supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) return { tournament: null, entries: [], matches: [] };

    const [{ data: entries }, { data: matches }] = await Promise.all([
      supabaseAdmin
        .from("tournament_entries")
        .select("id, user_id, seed, eliminated_round, final_rank, created_at")
        .eq("tournament_id", t.id)
        .order("seed", { ascending: true, nullsFirst: false }),
      supabaseAdmin
        .from("tournament_matches")
        .select("id, challenge_id, round, slot, player1_id, player2_id, winner_id, status")
        .eq("tournament_id", t.id)
        .order("round")
        .order("slot"),
    ]);

    // Recupera usernames per tutti gli utenti coinvolti
    const allIds = new Set<string>();
    allIds.add(t.creator_id);
    for (const e of entries ?? []) allIds.add(e.user_id);
    for (const m of matches ?? []) {
      if (m.player1_id) allIds.add(m.player1_id);
      if (m.player2_id) allIds.add(m.player2_id);
    }
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, avatar_seed").in("id", Array.from(allIds));
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));

    return {
      tournament: { ...t, creator: byId.get(t.creator_id) ?? null },
      entries: (entries ?? []).map((e: any) => ({ ...e, profile: byId.get(e.user_id) ?? null })),
      matches: (matches ?? []).map((m: any) => ({
        ...m,
        player1: m.player1_id ? byId.get(m.player1_id) ?? null : null,
        player2: m.player2_id ? byId.get(m.player2_id) ?? null : null,
        winner: m.winner_id ? byId.get(m.winner_id) ?? null : null,
      })),
    };
  });

// Iscriviti a un torneo (richiede verifica AvaTrade).
export const joinTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        invite_code: z.string().length(6).optional(),
      })
      .refine((v) => v.id || v.invite_code, "id or invite_code required")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertVerified(supabaseAdmin, context.userId);

    const query = supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("status", "registration");
    const filtered = data.id
      ? query.eq("id", data.id)
      : query.eq("invite_code", data.invite_code as string);
    const { data: t } = await filtered.maybeSingle();
    if (!t) throw new Error("tournament_not_found");

    // Controlla se c'è ancora posto
    const { count } = await supabaseAdmin
      .from("tournament_entries")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", t.id);
    if ((count ?? 0) >= t.max_players) throw new Error("tournament_full");

    const { error } = await supabaseAdmin
      .from("tournament_entries")
      .insert({ tournament_id: t.id, user_id: context.userId });
    if (error) {
      if (error.code === "23505") throw new Error("already_joined");
      throw new Error(error.message);
    }
    return { id: t.id };
  });

// Abbandona torneo prima che inizi.
export const leaveTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Permesso solo se il torneo è ancora in registration
    const { data: t } = await supabaseAdmin
      .from("tournaments").select("status").eq("id", data.id).maybeSingle();
    if (t?.status !== "registration") throw new Error("cannot_leave_after_start");
    await supabaseAdmin
      .from("tournament_entries")
      .delete()
      .eq("tournament_id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

// Avvia il torneo: genera il bracket con seed casuali.
// Solo il creator (o admin) può chiamarlo.
export const startTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabaseAdmin
      .from("tournaments").select("*").eq("id", data.id).maybeSingle();
    if (!t) throw new Error("not_found");
    if (t.creator_id !== context.userId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("forbidden");
    }
    if (t.status !== "registration") throw new Error("already_started");

    const { data: entries } = await supabaseAdmin
      .from("tournament_entries")
      .select("user_id")
      .eq("tournament_id", t.id);
    const players = (entries ?? []).map((e: any) => e.user_id);
    if (players.length < 2) throw new Error("not_enough_players");

    // Shuffle Fisher-Yates
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // Aggiorna seed
    for (let i = 0; i < players.length; i++) {
      await supabaseAdmin
        .from("tournament_entries")
        .update({ seed: i + 1 })
        .eq("tournament_id", t.id)
        .eq("user_id", players[i]);
    }

    // Genera match round 1
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + t.duration_minutes * 60_000);
    const entry = priceAt(t.symbol, startsAt.getTime(), 0);

    const matchInserts = [];
    const challengeInserts = [];
    for (let i = 0; i < Math.floor(players.length / 2); i++) {
      const p1 = players[i * 2];
      const p2 = players[i * 2 + 1];

      // Crea challenge corrispondente
      const { data: ch } = await supabaseAdmin
        .from("challenges")
        .insert({
          creator_id: p1,
          opponent_id: p2,
          symbol: t.symbol,
          duration_minutes: t.duration_minutes,
          stake_type: t.stake_type,
          stake_amount: t.stake_amount,
          visibility: "public",
          status: "live",
          creator_side: "long",
          opponent_side: "short",
          mode: "1v1",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          entry_price: entry,
        })
        .select("id")
        .single();

      matchInserts.push({
        tournament_id: t.id,
        challenge_id: ch?.id ?? null,
        round: 1,
        slot: i,
        player1_id: p1,
        player2_id: p2,
        status: "live",
      });
      void challengeInserts;
    }

    // Se numero dispari, bye per l'ultimo
    if (players.length % 2 !== 0) {
      const lastPlayer = players[players.length - 1];
      matchInserts.push({
        tournament_id: t.id,
        challenge_id: null,
        round: 1,
        slot: Math.floor(players.length / 2),
        player1_id: lastPlayer,
        player2_id: null,
        winner_id: lastPlayer,
        status: "bye",
      });
    }

    await supabaseAdmin.from("tournament_matches").insert(matchInserts);
    await supabaseAdmin
      .from("tournaments")
      .update({ status: "in_progress" })
      .eq("id", t.id);

    return { ok: true };
  });

// Avanza il bracket dopo che un match è concluso.
// Chiamato quando la challenge di un match viene settled.
export const advanceTournamentBracket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tournament_id: z.string().uuid(), match_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: match } = await supabaseAdmin
      .from("tournament_matches")
      .select("*, challenge:challenges(winner_id, creator_id, opponent_id, status)")
      .eq("id", data.match_id)
      .maybeSingle();
    if (!match || !match.challenge) throw new Error("not_found");
    if (match.challenge.status !== "settled") throw new Error("challenge_not_settled");

    const winner_id = match.challenge.winner_id as string | null;
    if (!winner_id) return { ok: true, advanced: false }; // pareggio → non avanziamo

    // Aggiorna match corrente
    await supabaseAdmin
      .from("tournament_matches")
      .update({ winner_id, status: "completed" })
      .eq("id", match.id);

    const { data: t } = await supabaseAdmin
      .from("tournaments").select("*").eq("id", data.tournament_id).maybeSingle();
    if (!t) throw new Error("tournament_not_found");

    // Controlla se tutti i match del round corrente sono completed/bye
    const { data: roundMatches } = await supabaseAdmin
      .from("tournament_matches")
      .select("winner_id, status, slot")
      .eq("tournament_id", t.id)
      .eq("round", match.round);

    const allDone = (roundMatches ?? []).every(
      (m: any) => m.status === "completed" || m.status === "bye",
    );
    if (!allDone) return { ok: true, advanced: false };

    const winners = (roundMatches ?? [])
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((m: any) => m.winner_id)
      .filter(Boolean) as string[];

    // Un solo vincitore rimasto → torneo concluso
    if (winners.length === 1) {
      await supabaseAdmin
        .from("tournaments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", t.id);
      // Assegna rank finale
      await supabaseAdmin
        .from("tournament_entries")
        .update({ final_rank: 1 })
        .eq("tournament_id", t.id)
        .eq("user_id", winners[0]);
      return { ok: true, advanced: true, completed: true };
    }

    // Genera prossimo round
    const nextRound = match.round + 1;
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + t.duration_minutes * 60_000);
    const entry = priceAt(t.symbol, startsAt.getTime(), 0);

    const nextMatches = [];
    for (let i = 0; i < Math.floor(winners.length / 2); i++) {
      const p1 = winners[i * 2];
      const p2 = winners[i * 2 + 1];
      const { data: ch } = await supabaseAdmin
        .from("challenges")
        .insert({
          creator_id: p1,
          opponent_id: p2,
          symbol: t.symbol,
          duration_minutes: t.duration_minutes,
          stake_type: t.stake_type,
          stake_amount: t.stake_amount,
          visibility: "public",
          status: "live",
          creator_side: "long",
          opponent_side: "short",
          mode: "1v1",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          entry_price: entry,
        })
        .select("id")
        .single();
      nextMatches.push({
        tournament_id: t.id,
        challenge_id: ch?.id ?? null,
        round: nextRound,
        slot: i,
        player1_id: p1,
        player2_id: p2,
        status: "live",
      });
    }
    if (winners.length % 2 !== 0) {
      const lastWinner = winners[winners.length - 1];
      nextMatches.push({
        tournament_id: t.id,
        challenge_id: null,
        round: nextRound,
        slot: Math.floor(winners.length / 2),
        player1_id: lastWinner,
        player2_id: null,
        winner_id: lastWinner,
        status: "bye",
      });
    }

    await supabaseAdmin.from("tournament_matches").insert(nextMatches);
    return { ok: true, advanced: true, completed: false };
  });
