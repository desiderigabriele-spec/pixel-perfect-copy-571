// Edge Function: send-notification
// Riceve eventi DB (challenge status change, avatrade verification) e invia email via Resend.
// Deploy: supabase functions deploy send-notification
// Variabili d'ambiente richieste (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — chiave API di https://resend.com
//   HTT_FROM_EMAIL  — es. "HTT <noreply@hackthetrading.com>"
//   HTT_APP_URL     — es. "https://pixel-perfect-copy-571.lovable.app"

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("HTT_FROM_EMAIL") ?? "HACK_THE_TRADING <noreply@hackthetrading.com>";
const APP_URL = Deno.env.get("HTT_APP_URL") ?? "https://pixel-perfect-copy-571.lovable.app";

interface Payload {
  type: "challenge_live" | "challenge_settled" | "verification_reviewed";
  challenge_id?: string;
  verification_id?: string;
  user_ids: string[];
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("Resend error:", res.status, txt);
  }
}

function terminalHtml(title: string, lines: string[], cta?: { label: string; url: string }) {
  const ctaHtml = cta
    ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:#00FF41;color:#0D0D0D;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:.12em;padding:10px 24px;text-decoration:none;text-transform:uppercase">${cta.label}</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="background:#0D0D0D;color:#E0E0E0;font-family:monospace;padding:32px 24px;max-width:520px;margin:0 auto">
<h1 style="color:#00FF41;font-size:18px;letter-spacing:.15em;margin:0 0 16px">HACK_THE_TRADING</h1>
<h2 style="font-size:14px;letter-spacing:.1em;color:#fff;margin:0 0 20px">${title}</h2>
${lines.map((l) => `<p style="font-size:13px;color:#aaa;margin:4px 0">${l}</p>`).join("")}
${ctaHtml}
<p style="margin-top:40px;font-size:11px;color:#444">// HTT non esegue trade né gestisce denaro. Piattaforma di spettacolo competitivo.</p>
</body></html>`;
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  // Recupera email utenti dal loro auth.users (via admin API)
  async function getEmail(userId: string): Promise<string | null> {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  }

  if (payload.type === "challenge_live" && payload.challenge_id) {
    const { data: c } = await supabase
      .from("challenges")
      .select("id, symbol, duration_minutes, creator_id, opponent_id, creator_side, opponent_side")
      .eq("id", payload.challenge_id)
      .maybeSingle();
    if (!c) return new Response("not found", { status: 404 });

    for (const uid of [c.creator_id, c.opponent_id].filter(Boolean) as string[]) {
      const email = await getEmail(uid);
      if (!email) continue;
      const side = uid === c.creator_id ? c.creator_side : c.opponent_side;
      await sendEmail(
        email,
        `⚡ Sfida iniziata — ${c.symbol}`,
        terminalHtml(
          `LA TUA SFIDA È INIZIATA`,
          [
            `> Strumento: ${c.symbol}`,
            `> Durata: ${c.duration_minutes} min`,
            `> Tua posizione: ${side?.toUpperCase()}`,
            `> Il timer è in corso. Buona fortuna.`,
          ],
          { label: "GUARDA LA SFIDA", url: `${APP_URL}/challenges/${c.id}` },
        ),
      );
    }
  }

  if (payload.type === "challenge_settled" && payload.challenge_id) {
    const { data: c } = await supabase
      .from("challenges")
      .select(
        "id, symbol, winner_id, creator_id, opponent_id, creator_pips, opponent_pips, stake_type, stake_amount",
      )
      .eq("id", payload.challenge_id)
      .maybeSingle();
    if (!c) return new Response("not found", { status: 404 });

    for (const uid of [c.creator_id, c.opponent_id].filter(Boolean) as string[]) {
      const email = await getEmail(uid);
      if (!email) continue;
      const won = c.winner_id === uid;
      const myPips = uid === c.creator_id ? c.creator_pips : c.opponent_pips;
      const theirPips = uid === c.creator_id ? c.opponent_pips : c.creator_pips;
      const result = c.winner_id === null ? "PAREGGIO" : won ? "HAI VINTO" : "HAI PERSO";
      const prize = won && c.stake_type === "points" ? ` (+${c.stake_amount * 2} HTT points)` : "";
      await sendEmail(
        email,
        `🏁 Sfida conclusa — ${result} su ${c.symbol}`,
        terminalHtml(
          `SFIDA ${c.symbol} CONCLUSA`,
          [
            `> Risultato: ${result}${prize}`,
            `> I tuoi pips: ${myPips != null ? (myPips > 0 ? "+" : "") + myPips : "—"}`,
            `> Avversario: ${theirPips != null ? (theirPips > 0 ? "+" : "") + theirPips : "—"}`,
          ],
          { label: "VEDI DETTAGLI", url: `${APP_URL}/challenges/${c.id}` },
        ),
      );
    }
  }

  if (payload.type === "verification_reviewed" && payload.verification_id) {
    const { data: v } = await supabase
      .from("avatrade_verifications")
      .select("user_id, status")
      .eq("id", payload.verification_id)
      .maybeSingle();
    if (!v) return new Response("not found", { status: 404 });

    const email = await getEmail(v.user_id);
    if (email) {
      const approved = v.status === "verified";
      await sendEmail(
        email,
        approved ? "✅ Account AvaTrade verificato — HTT" : "❌ Verifica AvaTrade non approvata",
        terminalHtml(
          approved ? "SEI VERIFICATO" : "VERIFICA NON APPROVATA",
          approved
            ? [
                "> Il tuo conto AvaTrade è stato verificato.",
                "> Puoi ora creare e partecipare a sfide.",
                "> Benvenuto nell'arena.",
              ]
            : [
                "> La tua richiesta di verifica non è stata approvata.",
                "> Assicurati di aver aperto il conto tramite il link HTT.",
                "> Contatta il supporto se pensi ci sia un errore.",
              ],
          approved
            ? { label: "VAI ALLE SFIDE", url: `${APP_URL}/challenges` }
            : { label: "RIPROVA", url: `${APP_URL}/onboarding/avatrade` },
        ),
      );
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
