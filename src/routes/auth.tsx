import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/translate";
import { z } from "zod";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalInput } from "@/components/htt/TerminalInput";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accesso — HACK_THE_TRADING" },
      { name: "description", content: "Registrati o accedi alla community HTT." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(72),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Se già loggato, vai al dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const parsed = z.string().email().safeParse(email);
        if (!parsed.success) throw new Error(t("auth.errorEmail"));
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo(t("auth.resetSent"));
      } else if (mode === "signup") {
        const parsed = signupSchema.safeParse({ email, username, password });
        if (!parsed.success) {
          const flat = parsed.error.flatten().fieldErrors;
          if (flat.email) throw new Error(t("auth.errorEmail"));
          if (flat.username) throw new Error(t("auth.errorUsername"));
          if (flat.password) throw new Error(t("auth.errorPassword"));
          throw new Error("validation");
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { username: parsed.data.username },
          },
        });
        if (error) throw error;
        setInfo(t("auth.checkEmail"));
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          throw new Error(t("auth.errorEmail"));
        }
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t("auth.errorGeneric", { message }));
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(t("auth.errorGeneric", { message: error.message }));
    }
  }

  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-16">
        <TerminalCard label="> SECURE_TERMINAL" glow="green" className="p-6 sm:p-8">
          <h1 className="font-display text-3xl tracking-[0.1em] text-[var(--terminal)] htt-text-glow-green">
            {mode === "signup"
              ? t("auth.titleSignup")
              : mode === "forgot"
                ? t("auth.resetTitle")
                : t("auth.titleLogin")}
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <TerminalInput
              type="email"
              name="email"
              label={t("auth.emailLabel")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {mode === "signup" && (
              <TerminalInput
                type="text"
                name="username"
                label={t("auth.usernameLabel")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            )}
            {mode !== "forgot" && (
              <TerminalInput
                type="password"
                name="password"
                label={t("auth.passwordLabel")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            )}

            {error && <div className="font-mono text-xs text-[var(--alert)]">{error}</div>}
            {info && <div className="font-mono text-xs text-[var(--terminal)]">{info}</div>}

            <TerminalButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {mode === "signup"
                ? t("auth.submitSignup")
                : mode === "forgot"
                  ? t("auth.submitReset")
                  : t("auth.submitLogin")}
            </TerminalButton>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 font-mono text-[10px] text-[var(--text-dim)]">
                <div className="h-px flex-1 bg-border" />
                //
                <div className="h-px flex-1 bg-border" />
              </div>
              <TerminalButton variant="ghost" size="lg" onClick={googleSignIn} className="w-full">
                {t("auth.google")}
              </TerminalButton>
            </>
          )}

          {mode === "login" && (
            <button
              onClick={() => {
                setMode("forgot");
                setError(null);
                setInfo(null);
              }}
              className="mt-4 block w-full text-center font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] hover:text-[var(--amber)] transition-colors"
            >
              {t("auth.forgot")}
            </button>
          )}

          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="mt-6 block w-full text-center font-mono text-xs text-[var(--text-dim)] hover:text-[var(--terminal)] transition-colors"
          >
            {mode === "signup"
              ? t("auth.toggleToLogin")
              : mode === "forgot"
                ? t("auth.backToLogin")
                : t("auth.toggleToSignup")}
          </button>
        </TerminalCard>
      </main>
    </div>
  );
}
