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
  leverage: z.number().min(1).max(100).default(1),
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

    const newBalance = Math.round((Number(account.balance) - data.size_usd) * 100) / 100;
    await supabaseAdmin
      .from("paper_accounts")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const { data: trade, error } = await supabaseAdmin
      .from("paper_trades")
      .insert({
        user_id: userId,
        symbol: data.symbol,
        direction: data.direction,
        quantity: data.size_usd,
        leverage: data.leverage,
        entry_price: data.entry_price,
        sl_price: data.sl_price ?? null,
        tp_price: data.tp_price ?? null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      await supabaseAdmin
        .from("paper_accounts")
        .update({ balance: Number(account.balance), updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      throw new Error(error.message);
    }

    return { trade, newBalance };
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

    const leverage = Number(trade.leverage ?? 1);
    const { pnl, pips } = calcPnl(
      trade.symbol,
      trade.direction as "buy" | "sell",
      Number(trade.entry_price),
      data.exit_price,
      Number(trade.quantity),
      leverage,
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

    // Return margin + P&L
    const newBalance =
      Math.round((Number(acc!.balance) + Number(trade.quantity) + pnl) * 100) / 100;

    await supabaseAdmin
      .from("paper_accounts")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { pnl, pips, newBalance };
  });

// ── Pending orders ────────────────────────────────────────────────────────────

export const getMyPendingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("paper_pending_orders")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

const createPendingSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(["buy", "sell"]),
  size_usd: z.number().min(MIN_SIZE_USD).max(MAX_SIZE_USD),
  leverage: z.number().min(1).max(100).default(1),
  entry_price: z.number().positive(),
  sl_price: z.number().positive().optional(),
  tp_price: z.number().positive().optional(),
  price_above: z.boolean(),
});

export const createPendingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createPendingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: account } = await supabaseAdmin
      .from("paper_accounts")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (!account) throw new Error("Account non trovato.");
    if (Number(account.balance) < data.size_usd)
      throw new Error("Saldo insufficiente per il margine.");

    const { data: order, error } = await supabaseAdmin
      .from("paper_pending_orders")
      .insert({
        user_id: userId,
        symbol: data.symbol,
        direction: data.direction,
        size_usd: data.size_usd,
        leverage: data.leverage,
        entry_price: data.entry_price,
        sl_price: data.sl_price ?? null,
        tp_price: data.tp_price ?? null,
        price_above: data.price_above,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { order };
  });

export const cancelPendingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { error } = await supabaseAdmin
      .from("paper_pending_orders")
      .update({ status: "cancelled" })
      .eq("id", data.order_id)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fillPendingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ order_id: z.string().uuid(), fill_price: z.number().positive() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: order } = await supabaseAdmin
      .from("paper_pending_orders")
      .select("*")
      .eq("id", data.order_id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (!order) throw new Error("Ordine non trovato o già eseguito.");

    const { data: account } = await supabaseAdmin
      .from("paper_accounts")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!account || Number(account.balance) < Number(order.size_usd))
      throw new Error("Saldo insufficiente.");

    const newBalance =
      Math.round((Number(account.balance) - Number(order.size_usd)) * 100) / 100;

    await supabaseAdmin
      .from("paper_accounts")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    await supabaseAdmin.from("paper_trades").insert({
      user_id: userId,
      symbol: order.symbol,
      direction: order.direction,
      quantity: Number(order.size_usd),
      leverage: Number(order.leverage),
      entry_price: data.fill_price,
      sl_price: order.sl_price ?? null,
      tp_price: order.tp_price ?? null,
      status: "open",
    });

    await supabaseAdmin
      .from("paper_pending_orders")
      .update({ status: "filled" })
      .eq("id", data.order_id);

    return { ok: true, newBalance };
  });
