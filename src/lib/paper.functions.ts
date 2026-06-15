import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calcPnl, MIN_SIZE_USD, MAX_SIZE_USD } from "./paper-trading";

// ── Account ───────────────────────────────────────────────────────────────────

export const getMyPaperAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("paper_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { account: data };
  });

// ── Trade list ────────────────────────────────────────────────────────────────

export const getMyOpenTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("paper_trades")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { trades: data ?? [] };
  });

export const getMyClosedTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("paper_trades")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { trades: data ?? [] };
  });

// ── Open trade ────────────────────────────────────────────────────────────────

const openTradeSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(["buy", "sell"]),
  size_usd: z.number().min(MIN_SIZE_USD).max(MAX_SIZE_USD),
  entry_price: z.number().positive(),
  sl_price: z.number().positive().optional(),
  tp_price: z.number().positive().optional(),
});

export const openPaperTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => openTradeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: account } = await supabaseAdmin
      .from("paper_accounts")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (!account) throw new Error("Account non trovato. Ricarica la pagina.");
    if (Number(account.balance) < data.size_usd) throw new Error("Saldo insufficiente.");

    const { data: trade, error } = await supabaseAdmin
      .from("paper_trades")
      .insert({
        user_id: userId,
        symbol: data.symbol,
        direction: data.direction,
        quantity: data.size_usd,
        entry_price: data.entry_price,
        sl_price: data.sl_price ?? null,
        tp_price: data.tp_price ?? null,
        status: "open",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { trade };
  });

// ── Close trade ───────────────────────────────────────────────────────────────

const closeTradeSchema = z.object({
  trade_id: z.string().uuid(),
  exit_price: z.number().positive(),
});

export const closePaperTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => closeTradeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: trade } = await supabaseAdmin
      .from("paper_trades")
      .select("*")
      .eq("id", data.trade_id)
      .eq("user_id", userId)
      .eq("status", "open")
      .maybeSingle();

    if (!trade) throw new Error("Trade non trovato o già chiuso.");

    const { pnl, pips } = calcPnl(
      trade.symbol,
      trade.direction as "buy" | "sell",
      Number(trade.entry_price),
      data.exit_price,
      Number(trade.quantity),
    );

    await supabaseAdmin
      .from("paper_trades")
      .update({
        exit_price: data.exit_price,
        pnl,
        pips,
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", data.trade_id);

    const { data: acc } = await supabaseAdmin
      .from("paper_accounts")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const newBalance = Math.round((Number(acc!.balance) + pnl) * 100) / 100;

    await supabaseAdmin
      .from("paper_accounts")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { pnl, pips, newBalance };
  });
