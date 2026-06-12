# Piano: Completamento MVP HTT

Costruzione dei 7 moduli MVP residui (ordine indicato nel superprompt finale), in un'unica sequenza end-to-end. Compliance "guarda la gara, non segnali" applicata ovunque. Dati mock realistici dietro un layer astratto (`src/lib/dataLayer.ts`).

---

## Step 08 — Modulo I: Market Rain + Logo

**Obiettivo:** sfondo brand animato + finestra-terminale come logo, riutilizzabili ovunque.

- `src/components/htt/MarketRain.tsx` — canvas a tutto schermo, opacità 7-10%, ~70% verde / 30% rosso, teste brillanti, movimento dall'alto verso il basso, `position: fixed` dietro i contenuti, pause su `prefers-reduced-motion`.
- `src/components/htt/HttLogo.tsx` — finestra terminale ASCII: header "HTT", mini-grafico a candele SVG inline, cursore `>` lampeggiante. Sostituisce le scritte HTT nei header.
- Integrato in `__root.tsx` come strato di sfondo permanente.

## Step 09 — Modulo B: Gating pubblico vs affiliato

**Obiettivo:** tre livelli di accesso (Pubblico / Registrato / Affiliato), CTA chiare.

- Schema: aggiungi `profiles.affiliation_status` (`none | pending | affiliated`) + `affiliated_at`.
- Public routes nuove (SSR, no auth gate): `/` (già), `/trader/$username` (vista in ritardo, operazioni chiuse), `/leaderboard` (già).
- Una sfida live ora ha **due viste**:
  - Pubblico/registrato non-affiliato → operazioni in ritardo 5 min, watermark "AFFILIATI PER VEDERE LIVE".
  - Affiliato → live realtime.
- Hook `useAccessLevel()` → `'public' | 'registered' | 'affiliated'`.
- Componente `<AffiliateGate level="affiliated">` con CTA + link al flusso di affiliazione AvaTrade già esistente (riusa `/onboarding`).
- Server fn `getLiveMatch({ delayedOnly })` con parametro per scegliere quale feed.

## Step 10 — Modulo A: Live Streaming layer (Twitch-style)

**Obiettivo:** schermata `/live/$id` con layout a 3 colonne (video / centro / chat).

- Route `src/routes/live.$id.tsx` (gating B applicato).
- Layout desktop: sinistra `TraderWebcam` (placeholder video 1:1 con `<video>` muto + overlay nome/badge/rank), centro `LiveBoard` (operazioni live, pips count-up, timer, etichetta "VERIFICATO AVATRADE"), destra `SpectatorChat`.
- Mobile: stack verticale (board → tabs Video/Chat).
- Nuova tabella `live_chat_messages` (`session_id` ref challenge, `user_id`, `body`, `created_at`) + RLS (read tutti autenticati, post solo affiliati).
- Realtime: postgres_changes su INSERT.
- Reazioni: tabella `live_reactions` (`session_id`, `user_id`, `emoji ∈ {🔥,💎,👏,⚡}`, `created_at`), throttling 1/2s lato client, animazione bolle che salgono.
- Moderazione AI: edge function `moderate-chat` (Lovable AI, gemini-flash) chiamata prima dell'INSERT — blocca contatti, link esterni, dati personali, promesse di profitto. Riusa eventuale infra esistente; altrimenti la implemento.
- Sfondo: MarketRain a 5% opacità.

## Step 11 — Modulo C: Classifiche multiple

**Obiettivo:** una pagina, tanti filtri.

- Schema `profiles`: `country` (ISO-2), `language` (`it`/`en`), `style` (`scalper|intraday|swing`), `primary_asset` (codice simbolo).
- Riscrittura `/leaderboard` con tab/filtri:
  - **Periodi:** weekly / monthly / all-time.
  - **Dimensioni:** Globale / Lingua / Paese / Asset / Stile / Timeframe.
  - **Speciali:** RISING STAR (top 10 dei profili creati ≤30gg con ≥3 sfide), MOST IMPROVED (delta rank settimanale).
- Server fn `getLeaderboard({ scope, period, filterValue, limit })` con caching in-memory 30s.
- Home: widget "RISING STAR" sotto la hero.
- Badge "early supporter": tabella `follower_relations` con `since`; il primo 10% dei follower di un trader top-10 ottiene il badge.

## Step 12 — Modulo D: Metriche di consistenza

**Obiettivo:** ranking non da rendimento bruto.

- Schema: tabella `trader_stats` (1 riga per trader, aggiornata via fn).
  - Campi: `trades_count`, `win_rate`, `profit_factor`, `sharpe`, `max_drawdown_pct`, `avg_rr`, `track_record_days`, `equity_curve_json` (array di {t, equity}), `consistency_score`.
- Mock: generatore deterministico in `src/lib/mockStats.ts` (seed = user_id).
- `consistency_score = 0.4*winRate + 0.3*(1-normalizedDrawdown) + 0.2*normalizedSharpe + 0.1*normalizedTrackRecord`.
- Server fn `getTraderStats(userId)` + refresh quotidiano via cron route `/api/public/refresh-stats` (verifica firma HMAC).
- Profilo trader `/u/$username` e `/trader/$username`: card metriche in JetBrains Mono con count-up, sparkline equity (SVG), badge "VERIFICATO".
- Ranking di `getLeaderboard` ora pesa `consistency_score` invece di `total_pips`.

## Step 13 — Modulo E: Sfida solitaria a obiettivo

**Obiettivo:** nuova modalità "raggiungi X pips/% in Y tempo".

- Schema `challenges`: nuovo `mode` enum (`1v1 | solo_goal`), colonne `goal_pips`, `goal_percent` (uno dei due), `goal_reached` bool.
- Form `/challenges/new` con toggle "Avversario | Obiettivo solitario". Per goal: input pips o % + durata.
- Dettaglio `/challenges/$id` adatta UI: barra di progresso verso obiettivo (verde se raggiunto), no opponent slot.
- Settlement: `goal_reached = pipsFinali ≥ goal_pips` (o equivalente %). Status `settled` con `winner_id = creator_id` se ok, null altrimenti.
- Spettatori vedono la barra in real time (channel realtime già attivo).

## Step 14 — Modulo H: Card condivisibili

**Obiettivo:** generazione automatica card 9:16 + 1:1 con QR referral.

- Route `src/routes/api/public/card/$type/$userId.ts` (SVG dinamico, no auth — è meant for embed):
  - `type ∈ {challenge, top10, win, rank, milestone}`.
  - Renderizza SVG con estetica HTT (sfondo dark, market rain statica, nome, stat chiave, posizione, badge, QR codice referral).
  - Cache 5 min via header.
- Lib `src/lib/qr.ts` per QR (pure-JS, niente native; uso `qrcode` o impl. minimale custom per evitare deps).
- Tabella `referral_codes` (`user_id` unique, `code`, `created_at`). Generata on-demand al primo "share".
- Profilo trader: bottone "GENERA CARD" → modale con preview, due tab (Stories 1080×1920, Post 1080×1080), bottoni "Scarica PNG" (canvas conversion) e "Condividi" (Web Share API se disponibile).
- Compliance: tagline fisse "sto partecipando" / "seguimi qui", mai "iscriviti e guadagni".

---

## Predisposizione Fase 2 (architettura, niente UI)

In coda allo Step 14, lascio gli innesti pronti **senza implementare**:
- `src/lib/payments.ts` con interfaccia `PaymentProvider` (stub Stripe).
- `src/lib/payout.ts` con stub `calculatePayout(traderId)` → ritorna mock 0, ma firma pronta.
- `src/lib/affiliateGraph.ts` per sub-IB tree (vuoto, ma exportato).

---

## Note tecniche trasversali

- **Layer dati astratto** centralizzato in `src/lib/dataLayer.ts`: `fetchTick`, `fetchLeaderboard`, `fetchSignals`, `fetchWatchtime`. Tutti i moduli passano da qui. Oggi → mock. Domani → swap singola funzione per MT5/aggregatore reale.
- **i18n IT/EN** aggiornato a ogni step.
- **Compliance footer/disclaimer** automatico su ogni vista trading.
- **Sicurezza:** tutte le nuove tabelle con GRANT espliciti + RLS scoped; nessuna anon scrittura.
- **Costi/perf:** Realtime solo dove serve (live + chat sfida + reazioni); leaderboard via polling 30s.

---

## Stima e checkpoint

7 step. Procedo end-to-end senza chiedere conferma intermedia (come richiesto). Mostro un riepilogo dopo ogni step e proseguo. Alla fine: panoramica completa + suggerimento di pubblicazione.

Schema migrations totali previste: ~6 (una per step, eccetto I/H se non serve).