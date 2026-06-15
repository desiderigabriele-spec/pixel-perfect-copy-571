import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Tre livelli di accesso alla piattaforma:
// - public: nessuna sessione
// - registered: sessione attiva ma senza verifica AvaTrade
// - affiliated: verifica AvaTrade approvata (= conto aperto via link HTT)
export type AccessLevel = "public" | "registered" | "affiliated";

export function useAccessLevel(): { level: AccessLevel; loading: boolean } {
  const [level, setLevel] = useState<AccessLevel>("public");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function compute() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) {
          setLevel("public");
          setLoading(false);
        }
        return;
      }
      const { data: verif } = await supabase
        .from("avatrade_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      setLevel(verif?.status === "verified" ? "affiliated" : "registered");
      setLoading(false);
    }
    compute();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        compute();
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { level, loading };
}
