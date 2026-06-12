
# HTT — Step 01 + 02

Costruzione iniziale della piattaforma HACK_THE_TRADING su TanStack Start + Lovable Cloud. Estetica terminale hacker premium, mobile-first, italiano + inglese.

---

## Cosa costruisco in questo ciclo

### Step 01 — Design system + demo sfida live
- Design system HTT (palette `#0D0D0D` / `#00FF41` / `#FFB800` / `#FF0033`, font Bebas Neue + Inter + JetBrains Mono, Anton riservato a momenti epici)
- Componenti terminale riutilizzabili (TerminalCard, TerminalButton, TerminalInput, GlitchAvatar, ScanlineOverlay, TypewriterText)
- Pagina demo sfida live `/live-demo` con leader verde / sfidante ambra, barra confronto pips, live feed esecuzioni (anche mobile, niente buchi), avatar con glow colorato

### Step 02 — Onboarding completo
- `/boot` — boot sequence typewriter con skip (stato in `sessionStorage`, non `localStorage`)
- `/auth` — registrazione/login email+password + Google OAuth (estetica terminale `> email_`)
- `/onboarding/avatrade` — schermata "ultimo step" con 3 punti chiari e CTA al link affiliato
- `/onboarding/verify` — attesa verifica conto AvaTrade (stato pending → verified)
- `/dashboard` — landing post-onboarding (placeholder che porta agli step futuri)
- `/admin` — pannello per verificare manualmente gli account AvaTrade (solo ruolo admin)

---

## Architettura

### Stack & convenzioni
- TanStack Start + React 19 + Tailwind v4 (già nel template)
- Lovable Cloud (Supabase) per auth, DB, RLS
- i18n con `i18next` + `react-i18next`, locales in `src/locales/{it,en}.json`, default IT con selettore lingua nell'header
- Tutti i testi UI passano da `t('chiave')` — zero stringhe hardcoded nei componenti
- Layer dati astratto in `src/lib/data/` (`fetchTick`, `fetchLeaderboard`, `fetchSignals`, `fetchWatchtime`) con implementazione mock realistica — un solo file da sostituire quando arriverà MT5
- Codice commentato in italiano

### Struttura route (TanStack file-based)
```
src/routes/
  __root.tsx              header + lang switcher + outlet
  index.tsx               landing pubblica (hero HTT + CTA registrati)
  live-demo.tsx           demo sfida live pubblica (vetrina)
  boot.tsx                boot sequence
  auth.tsx                login/registrazione
  _authenticated/
    route.tsx             (gestito dall'integrazione Supabase)
    onboarding.avatrade.tsx
    onboarding.verify.tsx
    dashboard.tsx
    _admin/
      route.tsx           gate ruolo admin
      admin.tsx           lista utenti da verificare
```

### Database (Lovable Cloud)
- `profiles` — `id (FK auth.users)`, `username unique`, `created_at`, `avatar_seed` — trigger auto-create on signup
- `app_role` enum: `admin`, `user`
- `user_roles` — `user_id`, `role` (mai sul profilo, security-definer `has_role()`)
- `avatrade_verifications` — `user_id`, `avatrade_account_id`, `status (pending|verified|rejected)`, `verified_at`, `verified_by`
- RLS: utenti leggono/scrivono solo i propri record; admin (via `has_role`) leggono/aggiornano tutto
- GRANT espliciti su ogni tabella (authenticated + service_role)

### Server functions (`src/lib/*.functions.ts`)
- `submitAvatradeAccount` — utente invia ID conto → crea record `pending`
- `listPendingVerifications` — admin only (verifica `has_role`)
- `approveVerification` / `rejectVerification` — admin only

### Auth
- Email/password + Google OAuth (via broker Lovable: `lovable.auth.signInWithOAuth('google', ...)`)
- `configure_social_auth` chiamato per Google
- `attachSupabaseAuth` registrato in `src/start.ts`
- Reset password con pagina `/reset-password` dedicata

---

## Dettagli tecnici principali

- **Font**: import Bebas Neue, Inter, JetBrains Mono, Anton da Google Fonts in `__root.tsx` head
- **Design tokens**: tutti i colori HTT mappati in `src/styles.css` come oklch + variabili semantiche (`--terminal-green`, `--amber`, `--alert-red`, ecc.) registrate in `@theme inline`. Zero classi `text-white`/`bg-black` nei componenti
- **Glitch avatar**: SVG/CSS con scanline + bordo che pulsa nel colore del trader
- **Live feed mock**: hook `useMockTickStream` che emette esecuzioni demo realistiche a intervalli
- **i18n bootstrap**: `src/lib/i18n.ts` inizializzato lato client; fallback IT
- **Boot sequence**: skip su tap/click, mai mostrato due volte nella stessa sessione (`sessionStorage.htt_booted`)
- **Mobile-first**: tutto progettato a 360px in su, breakpoint desktop solo per arricchire

---

## Cosa NON è in questo ciclo (chiariamo le aspettative)

Restano per i cicli successivi: flusso creazione sfida 1v1, hub sfide, classifica, segnali, profilo trader, live streaming stile Twitch, chat realtime moderata da AI, conto finanziato, payout, pagine Chi Siamo / Come Funziona. Le ho viste nelle spec e l'architettura (layer dati astratto, i18n, ruoli) è già predisposta per accoglierle senza refactor.

---

## Conferma prima di partire

Prima di buildare confermami:
1. **Username obbligatorio in registrazione** (oltre a email/password)? Le spec dicono "email + username" — confermo che metto entrambi.
2. **Google sign-in** lo aggiungo di default (raccomandato da Lovable Cloud) — se vuoi solo email/password dimmelo.
3. **Link affiliato AvaTrade**: per ora metto un placeholder `https://avatrade.com/?aff=HTT_PLACEHOLDER` — mi dai il vero quando ce l'hai.

Se è tutto ok, approva e procedo.
