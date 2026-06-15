import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalInput } from "@/components/htt/TerminalInput";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Reset Password — HTT" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Supabase deposita la sessione di recovery via hash; aspettiamo che parta.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError(t("auth.errorPassword"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo(t("auth.passwordUpdated"));
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-16">
        <TerminalCard label="> RECOVERY_PROTOCOL" glow="green" className="p-6 sm:p-8">
          <h1 className="font-display text-3xl tracking-[0.1em] text-[var(--terminal)] htt-text-glow-green">
            {t("auth.resetTitle")}
          </h1>
          <p className="mt-3 font-mono text-xs text-[var(--text-dim)]">
            {ready ? t("auth.resetReady") : t("auth.resetWaiting")}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <TerminalInput
              type="password"
              name="password"
              label={t("auth.newPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={!ready}
            />
            {error && <div className="font-mono text-xs text-[var(--alert)]">{error}</div>}
            {info && <div className="font-mono text-xs text-[var(--terminal)]">{info}</div>}
            <TerminalButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !ready}
              className="w-full"
            >
              {t("auth.updatePassword")}
            </TerminalButton>
          </form>
        </TerminalCard>
      </main>
    </div>
  );
}
