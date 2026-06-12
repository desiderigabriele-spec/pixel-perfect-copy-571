// Edge Function: settle-expired
// Liquida tutte le sfide con status='live' e ends_at < now().
// Deploy: supabase functions deploy settle-expired
// Schedule (Supabase Dashboard → Edge Functions → settle-expired → Schedule):
//   Cron: * * * * *  (ogni minuto)
// Oppure chiama manualmente: POST https://<project>.supabase.co/functions/v1/settle-expired
// con header Authorization: Bearer <service_role_key>

import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req) => {
  // Protezione opzionale con segreto: imposta CRON_SECRET come env var nella funzione.
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.rpc("settle_expired_challenges");
  if (error) {
    console.error("settle_expired_challenges error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ settled: data ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
