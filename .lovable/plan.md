## Obiettivo

Sostituire l'attuale `MarketRain` (singoli numeri verdi/rossi) con un effetto "digital rain" finanziario fedele alla specifica fornita: ticker, percentuali, frecce, teste bianche brillanti, scia con fade, profondità parallasse, sfondo nero pieno.

## File toccato

Solo `src/components/htt/MarketRain.tsx` (riscrittura completa del canvas; la firma del componente e il punto di mount in `__root.tsx` restano invariati).

## Nuove specifiche di rendering

**Canvas / layout**
- `position: fixed`, `inset-0`, `w-screen h-screen`, `z-[-1]`, `pointer-events-none`.
- Resize listener su `window` con `devicePixelRatio` per nitidezza retina.
- Sfondo del body/root nero (`#000`); il canvas disegna sopra con fade trail.

**Effetto trail (fade verso l'alto)**
- Ogni frame: `ctx.fillStyle = "rgba(0,0,0,0.08)"` + `fillRect` su tutto il canvas → genera automaticamente la scia che svanisce in nero.

**Colonne**
- `FONT_SIZE` variabile per colonna (10–18px) → parallasse di profondità.
- Velocità di caduta randomica per colonna (0.4–1.6).
- Numero colonne calcolato sulla larghezza media (≈14px).

**Contenuto delle stringhe (per cella)**
Mix randomico con pesi:
- Ticker da pool: `["BTC","ETH","SOL","TSLA","AAPL","NVDA","SPY","EUR","USD","GOLD","OIL","DXY","NDX","XRP"]`
- Percentuali firmate: `+2.4%`, `-1.2%` (1 decimale, range −9.9/+9.9)
- Numeri puri (prezzi mock a 2–5 cifre)
- Frecce direzionali: `▲` (verde) / `▼` (rosso)
- Caratteri singoli 0–9 come "filler" tra ticker

**Colori**
- Verde neon `#00FF66` per token "positivi" (ticker accoppiato a ▲ / +%).
- Rosso acceso `#FF2A4D` per "negativi" (▼ / -%).
- Testa del flusso (carattere più in basso di ogni colonna): bianco brillante `#FFFFFF` con leggero glow via `shadowColor`/`shadowBlur` per il bagliore.
- La scia eredita il colore della colonna; il fade-out è gestito dal rettangolo nero semi-trasparente sopra descritto.

**Font**
- `font: "${size}px 'Fira Code', 'Courier New', monospace"`.

**Animazione**
- `requestAnimationFrame` con `cancelAnimationFrame` in cleanup.
- Throttle a ~30 fps (`if (now - last < 33) return`) per ridurre carico CPU sullo sfondo.
- Rispetto `prefers-reduced-motion: reduce` → render statico di un singolo frame e stop (nessun loop).

**Stato per colonna**
```
{ x, y, size, speed, polarity: 'pos'|'neg', tickPool: string[], stepCounter }
```
A ogni "drop" sceglie un nuovo token dal mix; quando esce dal fondo, si reinizializza in cima con polarità/size/speed nuovi.

## Props
Mantengo `opacity?: number` e `className?: string` per compatibilità con l'uso attuale in `__root.tsx`. Default `opacity = 1` (l'effetto è già scuro; il valore precedente 0.08 lo rendeva quasi invisibile — useremo `0.55` come default per restare leggibile ma non invadente; configurabile dal chiamante).

## Fuori scopo
- Nessuna modifica a `__root.tsx`, header, logo o altri componenti.
- Nessuna modifica al backend, i18n, route.
- Nessuna nuova dipendenza npm (font monospace già caricato dal browser come fallback).

## QA
- Verifica visiva via `browser--view_preview` su `/` dopo la modifica: confermare ticker leggibili, teste bianche, fade, mix verde/rosso, parallasse.
