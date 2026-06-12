# Ciclo "Trasversali" — chiusura buchi Step 02

Obiettivo: rendere il prodotto attuale solido e completo prima di passare allo Step 03 (sfide).

## 1. Fix hydration i18n (bug rilevato)

Sintomo: SSR renderizza in EN (default i18next) mentre il client carica `localStorage.lang=it` → mismatch su `LangSwitcher` e tutte le stringhe tradotte.

Fix:
- `src/lib/i18n.ts`: forzare `lng: "it"` come default deterministico, rimuovere `LanguageDetector` lato server.
- `LangSwitcher`: leggere `localStorage` solo dentro `useEffect` (post-mount), non durante il render iniziale.
- Cambio lingua persistito in `localStorage` + `i18n.changeLanguage()` solo client-side.

## 2. Pagina `/reset-password` (obbligatoria con auth email)

- Nuova route pubblica `src/routes/reset-password.tsx`.
- Flow:
  1. Su `/auth` aggiungere link "Password dimenticata?" → form invio email con `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" })`.
  2. `/reset-password` legge `type=recovery` dall'hash, mostra form nuova password, chiama `supabase.auth.updateUser({ password })`, poi redirect a `/dashboard`.
- Stile coerente: TerminalCard, label `> RECOVERY PROTOCOL`.
- Traduzioni IT + EN.

## 3. Profilo pubblico `/u/:username`

Route pubblica condivisibile (SSR on, fuori da `_authenticated`).
- Server function `getPublicProfile(username)` con `supabaseAdmin` (proiezione esplicita: `username`, `avatar_seed`, `created_at`). Niente email, niente role.
- UI: GlitchAvatar grande, username, "membro dal", placeholder per stats (W/L/pips/streak — verranno popolati in Step 04).
- `head()` con `<title>`, `description`, `og:title`, `og:description`, `og:image` derivati dall'avatar seed.
- 404 → `notFoundComponent` terminale ("USER_NOT_FOUND").

## 4. Bootstrap ruolo admin

Problema: oggi nessun utente è `admin`, quindi `/admin` è inaccessibile dopo essersi registrati.

Soluzione in due parti:
- **Migration**: aggiungere colonna/funzione non serve. Aggiungere invece una server function `claimAdminRole()` protetta da `requireSupabaseAuth` che:
  - controlla se esiste già almeno un admin nel sistema; se sì → 403;
  - se no → inserisce `(auth.uid(), 'admin')` in `user_roles` via `supabaseAdmin`.
  - Effetto: il primo utente che chiama l'endpoint diventa admin. Una sola volta, irreversibile da UI.
- **UI**: nella `/dashboard`, se l'utente non è admin e non esiste alcun admin, mostrare bottone "CLAIM ADMIN" (visibile solo finché disponibile). Check fatto via server function `adminClaimAvailable()`.
- Documentare nel `dashboard` un messaggio chiaro: "Sei il primo utente — rivendica il ruolo admin per accedere al pannello verifiche".

## 5. Link affiliate AvaTrade reale

- Sostituire il placeholder con `https://www.avatrade.it?p=MetaTrader5&tag=221547` in:
  - `src/routes/_authenticated/onboarding.avatrade.tsx`
  - eventuali CTA in landing/`/live-demo`
- Centralizzare in `src/lib/constants.ts` come `AVATRADE_AFFILIATE_URL` per averlo in un solo punto.

## 6. Aggiornamenti i18n

Nuove chiavi in `src/locales/{it,en}.json`:
- `auth.forgot`, `auth.resetTitle`, `auth.resetSent`, `auth.newPassword`, `auth.passwordUpdated`
- `profile.memberSince`, `profile.notFound`, `profile.stats.placeholder`
- `dashboard.claimAdmin.cta`, `dashboard.claimAdmin.success`, `dashboard.claimAdmin.taken`

## Dettagli tecnici

```text
File toccati / creati
├── src/lib/i18n.ts                                 (modificato: lng fisso IT)
├── src/components/htt/LangSwitcher.tsx             (modificato: localStorage in useEffect)
├── src/routes/auth.tsx                             (link "password dimenticata")
├── src/routes/reset-password.tsx                   (nuovo)
├── src/routes/u.$username.tsx                      (nuovo, public, SSR on, head() OG)
├── src/routes/_authenticated/dashboard.tsx         (CTA claim admin)
├── src/routes/_authenticated/onboarding.avatrade.tsx (link reale)
├── src/lib/constants.ts                            (nuovo: AVATRADE_AFFILIATE_URL)
├── src/lib/profile.functions.ts                    (nuovo: getPublicProfile)
├── src/lib/admin.functions.ts                      (nuovo: claimAdminRole, adminClaimAvailable)
└── src/locales/{it,en}.json                        (nuove chiavi)
```

Nessuna nuova tabella, nessuna migration necessaria — RLS e tabelle esistenti coprono tutti i nuovi flussi. `claimAdminRole` usa `supabaseAdmin` perché `user_roles` ha `INSERT denied` lato client (corretto, contro privilege escalation).

## Out of scope (prossimi cicli)
- Step 03 (hub sfide, creazione 1v1, matchmaking) — pronto subito dopo.
- Email branded di password reset (richiede setup email infra Lovable, da fare quando vuoi).
- Stats reali sul profilo pubblico (arrivano con Step 04 settlement).
