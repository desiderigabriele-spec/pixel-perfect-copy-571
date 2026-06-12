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
export const getLeaderboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_seed, points_balance")
      .limit(500);
    const { data: chRows } = await supabaseAdmin
      .from("challenges")
      .select("status, winner_id, creator_id, opponent_id, creator_pips, opponent_pips, settled_at")
      .eq("status", "settled");
    const byUser = new Map<string, typeof chRows>();
    for (const r of chRows ?? []) {
      for (const uid of [r.creator_id, r.opponent_id].filter(Boolean) as string[]) {
        if (!byUser.has(uid)) byUser.set(uid, [] as any);
        byUser.get(uid)!.push(r as any);
      }
    }
    const items = (profiles ?? [])
      .map((p: any) => {
        const s = computeStats(byUser.get(p.id) ?? [], p.id);
        return {
          username: p.username,
          avatar_seed: p.avatar_seed,
          points_balance: p.points_balance,
          ...s,
        };
      })
      .filter((r) => r.played > 0)
      .sort((a, b) => b.pips - a.pips || b.wins - a.wins)
      .slice(0, 20);
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