import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Calcola statistiche aggregate dalle sfide settled di un utente.
function computeStats(rows: Array<{ status: string; winner_id: string | null; creator_id: string; opponent_id: string | null; creator_pips: number | null; opponent_pips: number | null; settled_at: string | null }>, userId: string) {
  let wins = 0, losses = 0, ties = 0;
  let pips = 0;
  const settled = rows
    .filter((r) => r.status === "settled" && r.settled_at)
    .sort((a, b) => new Date(a.settled_at!).getTime() - new Date(b.settled_at!).getTime());
  for (const r of settled) {
    const isCreator = r.creator_id === userId;
    const myPips = isCreator ? (r.creator_pips ?? 0) : (r.opponent_pips ?? 0);
    pips += Number(myPips);
    if (!r.winner_id) ties++;
    else if (r.winner_id === userId) wins++;
    else losses++;
  }
  // Streak: serie consecutiva di W o L più recente (positiva=W, negativa=L).
  let streak = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    const r = settled[i];
    if (!r.winner_id) break;
    const win = r.winner_id === userId;
    if (streak === 0) streak = win ? 1 : -1;
    else if ((win && streak > 0) || (!win && streak < 0)) streak += win ? 1 : -1;
    else break;
  }
  return { wins, losses, ties, pips: Number(pips.toFixed(1)), streak, played: settled.length };
}

// Profilo pubblico di un trader. Nessuna informazione sensibile.
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_seed, created_at")
      .ilike("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return { profile: null, stats: null };

    const { data: chRows } = await supabaseAdmin
      .from("challenges")
      .select("status, winner_id, creator_id, opponent_id, creator_pips, opponent_pips, settled_at")
      .or(`creator_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
      .eq("status", "settled");
    const stats = computeStats(chRows ?? [], profile.id);
    // Non esponiamo l'id all'esterno.
    const { id: _omit, ...publicProfile } = profile;
    return { profile: publicProfile, stats };
  });

// Top trader. Ordinamento: punti totali pips (sum), tie-break vittorie, poi created_at.
// Leaderboard con filtri multipli. Tutti opzionali.
// - scope: dimensione di filtro (globale / lingua / paese / stile / asset)
// - period: finestra temporale dei settled (week/month/all)
// - special: 'rising_star' (profili creati ≤30gg, ≥3 sfide)
const leaderboardInput = z.object({
  scope: z.enum(["global", "language", "country", "style", "asset"]).default("global"),
  filterValue: z.string().optional(),
  period: z.enum(["week", "month", "all"]).default("all"),
  special: z.enum(["rising_star"]).optional(),
  limit: z.number().int().min(1).max(50).default(20),
}).default({});

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => leaderboardInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Filtri sui profili
    let profQ = supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_seed, points_balance, country, language, style, primary_asset, created_at")
      .limit(1000);
    if (data.scope === "language" && data.filterValue) profQ = profQ.eq("language", data.filterValue);
    if (data.scope === "country" && data.filterValue) profQ = profQ.eq("country", data.filterValue);
    if (data.scope === "style" && data.filterValue) profQ = profQ.eq("style", data.filterValue as any);
    if (data.scope === "asset" && data.filterValue) profQ = profQ.eq("primary_asset", data.filterValue);
    if (data.special === "rising_star") {
      const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
      profQ = profQ.gte("created_at", cutoff);
    }
    const { data: profiles } = await profQ;

    // Filtri temporali sulle sfide settled
    let chQ = supabaseAdmin
      .from("challenges")
      .select("status, winner_id, creator_id, opponent_id, creator_pips, opponent_pips, settled_at")
      .eq("status", "settled");
    if (data.period === "week") {
      chQ = chQ.gte("settled_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
    } else if (data.period === "month") {
      chQ = chQ.gte("settled_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
    }
    const { data: chRows } = await chQ;

    const byUser = new Map<string, any[]>();
    for (const r of chRows ?? []) {
      for (const uid of [r.creator_id, r.opponent_id].filter(Boolean) as string[]) {
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid)!.push(r);
      }
    }

    const items = (profiles ?? [])
      .map((p: any) => {
        const s = computeStats(byUser.get(p.id) ?? [], p.id);
        return {
          username: p.username,
          avatar_seed: p.avatar_seed,
          country: p.country,
          language: p.language,
          style: p.style,
          primary_asset: p.primary_asset,
          ...s,
        };
      })
      .filter((r) => (data.special === "rising_star" ? r.played >= 3 : r.played > 0))
      .sort((a, b) => b.pips - a.pips || b.wins - a.wins)
      .slice(0, data.limit);
    return { items };
  });

// Sfida live più recente (se esiste). Usata da /live-demo per mostrare un match reale.
export const getCurrentLiveMatch = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("challenges")
      .select("id, symbol, duration_minutes, creator_id, opponent_id, creator_side, opponent_side, starts_at, ends_at, stake_type, stake_amount, visibility")
      .eq("status", "live")
      .eq("visibility", "public")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!c) return { match: null };
    const ids = [c.creator_id, c.opponent_id].filter(Boolean) as string[];
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, avatar_seed").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      match: {
        ...c,
        creator: byId.get(c.creator_id) ?? null,
        opponent: c.opponent_id ? byId.get(c.opponent_id) ?? null : null,
      },
    };
  });

// Recupera una specifica sfida live pubblica per id (route /live/$id).
export const getPublicLiveMatch = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin
      .from("challenges")
      .select("id, symbol, duration_minutes, creator_id, opponent_id, creator_side, opponent_side, starts_at, ends_at, status, visibility")
      .eq("id", data.id)
      .eq("visibility", "public")
      .maybeSingle();
    if (!c) return { match: null };
    const ids = [c.creator_id, c.opponent_id].filter(Boolean) as string[];
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, avatar_seed").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      match: {
        ...c,
        creator: byId.get(c.creator_id) ?? null,
        opponent: c.opponent_id ? byId.get(c.opponent_id) ?? null : null,
      },
    };
  });