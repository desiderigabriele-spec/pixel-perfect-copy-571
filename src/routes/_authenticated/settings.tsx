import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/lib/translate";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { TerminalInput } from "@/components/htt/TerminalInput";
import { GlitchAvatar } from "@/components/htt/GlitchAvatar";
import { getMyProfile, updateMyProfile } from "@/lib/avatrade.functions";
import { SYMBOL_CODES } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Impostazioni — HTT" }] }),
  component: SettingsPage,
});

const TRADING_STYLES = ["scalper", "intraday", "swing"] as const;
const LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
] as const;
const COUNTRIES = [
  { value: "IT", label: "🇮🇹 Italia" },
  { value: "US", label: "🇺🇸 USA" },
  { value: "GB", label: "🇬🇧 UK" },
  { value: "DE", label: "🇩🇪 Germania" },
  { value: "FR", label: "🇫🇷 Francia" },
  { value: "ES", label: "🇪🇸 Spagna" },
  { value: "CH", label: "🇨🇭 Svizzera" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "NL", label: "🇳🇱 Olanda" },
  { value: "BE", label: "🇧🇪 Belgio" },
];

function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const profile = (profileData as any)?.profile;

  const [username, setUsername] = useState("");
  const [style, setStyle] = useState<string>("");
  const [asset, setAsset] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [language, setLanguage] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popola il form quando il profilo arriva dal server.
  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? "");
    setStyle(profile.style ?? "");
    setAsset(profile.primary_asset ?? "");
    setCountry(profile.country ?? "");
    setLanguage(profile.language ?? "");
  }, [profile]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveProfile({
        data: {
          username: username.trim() || undefined,
          style: (style as "scalper" | "intraday" | "swing") || null,
          primary_asset: asset || null,
          country: country || null,
          language: (language as "it" | "en") || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message === "username_taken"
            ? t("settings.errorUsernameTaken")
            : err.message
          : String(err),
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <p className="font-mono text-xs text-[var(--text-dim)]">{t("common.loading")}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--terminal)]">
            // CONFIG
          </div>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl tracking-[0.06em]">
            {t("settings.title")}
          </h1>
        </div>

        <TerminalCard label="> IDENTITY" className="p-6 flex items-center gap-5">
          <GlitchAvatar name={username || "?"} color="green" size={72} />
          <div>
            <div className="font-display text-2xl tracking-wider">@{username || "—"}</div>
            <div className="font-mono text-xs text-[var(--text-dim)] mt-1">
              {t("settings.avatarNote")}
            </div>
          </div>
        </TerminalCard>

        <form onSubmit={onSave} className="space-y-5">
          <TerminalCard label="> ACCOUNT" className="p-5 space-y-4">
            <TerminalInput
              name="username"
              label={t("settings.usernameLabel")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
            />
          </TerminalCard>

          <TerminalCard label="> TRADING_PROFILE" className="p-5 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("settings.styleLabel")}
              </div>
              <div className="flex gap-2 flex-wrap">
                {TRADING_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(style === s ? "" : s)}
                    className={cn(
                      "px-3 py-1.5 border font-mono text-xs uppercase tracking-widest transition-colors",
                      style === s
                        ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                        : "border-border text-[var(--text-dim)] hover:text-foreground",
                    )}
                  >
                    {t(`settings.style.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("settings.assetLabel")}
              </div>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:border-[var(--terminal)] focus:outline-none"
              >
                <option value="">{t("settings.assetNone")}</option>
                {SYMBOL_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </TerminalCard>

          <TerminalCard label="> LOCALE" className="p-5 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("settings.languageLabel")}
              </div>
              <div className="flex gap-2 flex-wrap">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLanguage(language === l.value ? "" : l.value)}
                    className={cn(
                      "px-3 py-1.5 border font-mono text-xs tracking-widest transition-colors",
                      language === l.value
                        ? "border-[var(--terminal)] bg-[var(--terminal)]/10 text-[var(--terminal)]"
                        : "border-border text-[var(--text-dim)] hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-2">
                {t("settings.countryLabel")}
              </div>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:border-[var(--terminal)] focus:outline-none"
              >
                <option value="">{t("settings.countryNone")}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </TerminalCard>

          {error && (
            <div className="font-mono text-xs text-[var(--alert)] border border-[var(--alert)] px-3 py-2">
              {error}
            </div>
          )}
          {saved && (
            <div className="font-mono text-xs text-[var(--terminal)] border border-[var(--terminal)] px-3 py-2">
              {t("settings.saved")}
            </div>
          )}

          <TerminalButton
            variant="primary"
            size="lg"
            type="submit"
            disabled={saving}
            className="w-full"
          >
            {saving ? t("common.loading") : t("settings.save")}
          </TerminalButton>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background htt-grid-bg">
      <HttHeader />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
