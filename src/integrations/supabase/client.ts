// Supabase client — browser + SSR (Netlify).
// Env vars da impostare su Netlify (Site settings → Environment variables):
//   VITE_SUPABASE_URL          — Build & Deploy scope (usato anche a runtime via SSR)
//   VITE_SUPABASE_PUBLISHABLE_KEY — Build & Deploy scope
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Transport WebSocket finto, usato solo lato server (SSR Nitro su Node 20).
// Il costruttore di RealtimeClient richiede un WebSocket; Node < 22 non lo ha
// nativo e lancerebbe un errore. Il realtime viene usato solo nel browser
// (dentro useEffect), quindi server-side non si connette mai: basta evitare
// il throw nel costruttore. Nel bundle browser questo non viene mai usato.
class NoopWebSocket {
  constructor() {
    throw new Error("Realtime WebSocket non disponibile lato server");
  }
}

function createSupabaseClient() {
  const isServer = typeof window === "undefined";
  // import.meta.env per il bundle client (Vite); process.env per l'SSR Nitro.
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in Netlify → Site settings → Environment variables.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: isServer ? undefined : localStorage,
      persistSession: !isServer,
      autoRefreshToken: !isServer,
    },
    // Server-side passa un transport finto per non far esplodere il costruttore
    // di RealtimeClient (Node 20 senza WebSocket nativo).
    ...(isServer ? { realtime: { transport: NoopWebSocket as never } } : {}),
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
