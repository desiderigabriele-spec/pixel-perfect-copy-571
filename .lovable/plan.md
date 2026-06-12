# Fix: traduzioni mostrate come chiavi (`landing.tag`, `landing.subtitle`, …)

## Causa

Nell'HTML SSR del sito pubblicato compaiono letteralmente le chiavi i18n (`landing.tag`, `landing.feature1Title`, `landing.compliance`, `nav.live`, ecc.). Questo succede quando `react-i18next` rende un componente con `useTranslation()` prima che `i18next` abbia completato `init()`. Nel runtime serverless (Cloudflare Worker) l'`init()` di default è asincrono (`initImmediate: true`) e ritorna prima che le risorse siano "ready" — quindi `t("landing.tag")` restituisce la chiave.

Le risorse `it.json` / `en.json` contengono già tutte le chiavi corrette: non è un problema di traduzioni mancanti, è un problema di tempistica di init in SSR.

## Modifica

Un solo file: `src/lib/i18n.ts`.

Aggiungere due opzioni all'`init`:

- `initImmediate: false` → forza init sincrono (le risorse sono già in memoria, nessun fetch).
- `react: { useSuspense: false }` → evita che `useTranslation` resti in stato non-ready durante SSR e ritorni la chiave.

Nessuna altra modifica: il resto del file (default `it`, hard reset alla lingua di default) resta com'è.

## Verifica

1. Ricaricare la preview e controllare che la home mostri "// COMMUNITY TRADER VERIFICATA", "Sfide tra trader…", "INIZIA L'ACCESSO", "SFIDE 1v1", ecc. al posto delle chiavi.
2. `curl` dell'HTML pubblicato (dopo republish) deve contenere le stringhe italiane, non `landing.tag`.
3. Switch IT/EN ancora funzionante.

## Dopo il fix

L'utente dovrà ripubblicare per propagare il fix sul dominio pubblico (`pixel-perfect-copy-571.lovable.app`).
