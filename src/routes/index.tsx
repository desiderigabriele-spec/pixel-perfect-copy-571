import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HttHeader } from "@/components/htt/HttHeader";
import { TerminalCard } from "@/components/htt/TerminalCard";
import { TerminalButton } from "@/components/htt/TerminalButton";
import { HttLogo } from "@/components/htt/HttLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HACK_THE_TRADING — Community trader verificata" },
      {
        name: "description",
        content:
          "Sfide tra trader retail. Performance verificate dal broker. Spettacolo puro.",
      },
      { property: "og:title", content: "HACK_THE_TRADING" },
      {
        property: "og:description",
        content: "Sfide tra trader. Performance verificate. Spettacolo puro.",
      },
    ],
  }),
  component: HomePage,
});

// ─── Fade-in on scroll ────────────────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return {
    ref,
    cls: `transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`,
  };
}

// ─── CLI typewriter triggered by viewport ────────────────────────────────────
const CLI_LINES = [
  { text: "> ANALISI MERCATO...", color: "dim" },
  { text: "> screenshot_verificati: FALSE", color: "red" },
  { text: "> track_record_reale: NULL", color: "red" },
  { text: "> trader_verificati: 0/∞", color: "red" },
  { text: "> [SISTEMA COMPROMESSO]", color: "red" },
  { text: "> INIZIALIZZAZIONE HTT...", color: "dim" },
  { text: "> [██████████] 100%", color: "green" },
  { text: "> SISTEMA ATTIVO.", color: "green" },
] as const;

type LineColor = "dim" | "red" | "green";
const lineColorClass: Record<LineColor, string> = {
  dim: "text-[var(--text-dim)]",
  red: "text-[var(--alert)]",
  green: "text-[var(--terminal)]",
};

function CliTerminal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [completedLines, setCompletedLines] = useState<number[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [partial, setPartial] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || lineIdx >= CLI_LINES.length) {
      if (started && lineIdx >= CLI_LINES.length) setDone(true);
      return;
    }
    const target = CLI_LINES[lineIdx].text;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setPartial(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(id);
        setCompletedLines((prev) => [...prev, lineIdx]);
        setPartial("");
        setLineIdx((n) => n + 1);
      }
    }, 26);
    return () => clearInterval(id);
  }, [started, lineIdx]);

  return (
    <div
      ref={wrapRef}
      className="border border-[var(--terminal)]/40 bg-[#050505] p-5 font-mono text-sm leading-6 shadow-[0_0_32px_-8px_var(--terminal)]"
    >
      {/* title bar */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--alert)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--terminal)]" />
        <span className="ml-2 text-[10px] tracking-widest text-[var(--text-dim)]">
          HTT_SYSTEM_CHECK.exe
        </span>
      </div>
      {completedLines.map((idx) => (
        <div key={idx} className={lineColorClass[CLI_LINES[idx].color]}>
          {CLI_LINES[idx].text}
        </div>
      ))}
      {!done && (
        <div className="text-[var(--terminal)]">
          {partial}
          <span className="inline-block w-2 animate-pulse bg-[var(--terminal)] align-middle">
            &nbsp;
          </span>
        </div>
      )}
      {done && (
        <span className="inline-block w-2 animate-pulse bg-[var(--terminal)] align-middle">
          &nbsp;
        </span>
      )}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function Label({ text, amber = false }: { text: string; amber?: boolean }) {
  return (
    <div
      className={`font-mono text-xs uppercase tracking-[0.22em] ${amber ? "text-[var(--amber)]" : "text-[var(--terminal)]"}`}
    >
      {text}
    </div>
  );
}

// ─── Homepage ────────────────────────────────────────────────────────────────
function HomePage() {
  const s1 = useFadeIn(0.05);
  const s2 = useFadeIn();
  const s3 = useFadeIn();
  const s4 = useFadeIn();
  const s4b = useFadeIn();
  const s5 = useFadeIn();
  const s6 = useFadeIn();
  const s7 = useFadeIn(0.05);

  return (
    <div className="relative min-h-screen">
      <HttHeader />

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 1 — HERO
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s1.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 flex flex-col items-center justify-center px-4 py-24 sm:py-36 text-center ${s1.cls}`}
      >
        <Label text="> SISTEMA DI VERIFICA ATTIVO" />

        <h1 className="mt-6 font-impact text-6xl sm:text-8xl lg:text-[9.5rem] leading-[0.88] tracking-tight text-foreground">
          NON HAI MAI
          <br />
          VISTO UN
          <br />
          <span className="text-[var(--terminal)] htt-text-glow-green">TRADER VERO.</span>
        </h1>

        <p className="mx-auto mt-8 max-w-md text-base sm:text-lg text-[var(--text-dim)] leading-relaxed">
          Hai visto screenshot.
          <br />
          Lamborghini a noleggio.
          <br />
          Profitti che nessuno può verificare.
          <br />
          <span className="text-foreground">Il teatro sta per chiudere.</span>
        </p>

        <div className="mt-10 h-px w-full max-w-xl bg-[var(--terminal)] shadow-[0_0_8px_var(--terminal)]" />

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/boot">
            <TerminalButton variant="primary" size="lg">
              &gt; ENTRA NELLA SFIDA
            </TerminalButton>
          </Link>
          <Link to="/live-demo">
            <TerminalButton variant="ghost" size="lg">
              GUARDA COME FUNZIONA ↓
            </TerminalButton>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5 sm:gap-8 font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] text-[var(--terminal)]">
          <span>PERFORMANCE VERIFICATE</span>
          <span className="hidden sm:inline h-3 w-px bg-[var(--terminal)]/40" />
          <span>ZERO SCREENSHOT FALSI</span>
          <span className="hidden sm:inline h-3 w-px bg-[var(--terminal)]/40" />
          <span>SOLO TRADER REALI</span>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 2 — IL PROBLEMA
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s2.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 bg-[#111111] px-4 py-20 sm:py-28 ${s2.cls}`}
      >
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <Label text="// IL PROBLEMA" />
            <h2 className="mt-4 font-impact text-5xl sm:text-6xl lg:text-7xl leading-[0.9] text-foreground">
              IL TRADING È PIENO
              <br />
              DI BUGIARDI.
            </h2>
            <div className="mt-6 space-y-4 text-[var(--text-dim)] text-base sm:text-lg leading-relaxed">
              <p>
                Chiunque può aprire TikTok e mostrarsi come trader di successo. Basta uno
                screenshot modificato, un conto a leva altissima, o semplicemente mentire.
              </p>
              <p>
                Non esiste nessun posto dove i numeri vengano verificati davvero.{" "}
                <span className="text-foreground font-semibold">Fino ad oggi.</span>
              </p>
            </div>
          </div>
          <CliTerminal />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 3 — LA SOLUZIONE
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s3.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 px-4 py-20 sm:py-28 ${s3.cls}`}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <Label text="// LA SOLUZIONE" />
            <h2 className="mt-4 font-impact text-5xl sm:text-6xl lg:text-7xl leading-[0.9] text-foreground">
              UN POSTO DOVE
              <br />
              NON PUOI FINGERE.
            </h2>
            <p className="mt-5 mx-auto max-w-xl text-[var(--text-dim)] text-base sm:text-lg leading-relaxed">
              HACK_THE_TRADING è la prima piattaforma dove ogni performance è verificata dal
              broker. Non da noi. Dal broker.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: ">_",
                title: "SFIDE LIVE",
                body: "I trader si sfidano in tempo reale su conto demo. Ogni pip è visibile. Ogni perdita è visibile. Non si può barare.",
              },
              {
                icon: "✓",
                title: "DATI VERIFICATI",
                body: "Le performance vengono lette in sola lettura direttamente da AvaTrade. Nessuno può modificarle. Il broker certifica tutto.",
              },
              {
                icon: "◉",
                title: "SPETTACOLO PURO",
                body: "Guarda i trader operare dal vivo. Segui chi vuoi. Impara da chi dimostra di essere bravo davvero, non da chi lo dice.",
              },
            ].map(({ icon, title, body }) => (
              <TerminalCard key={title} glow="green" className="p-6">
                <div className="font-mono text-2xl text-[var(--terminal)] mb-3">{icon}</div>
                <h3 className="font-impact text-2xl tracking-wider text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{body}</p>
              </TerminalCard>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 4 — COME FUNZIONA
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s4.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 bg-[#111111] px-4 py-20 sm:py-28 ${s4.cls}`}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Label text="// COME FUNZIONA" />
            <h2 className="mt-4 font-impact text-5xl sm:text-6xl leading-[0.9] text-foreground">
              TRE PASSI.
              <br />
              NESSUNA SCUSA.
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* connector line — desktop */}
            <div className="absolute hidden md:block top-6 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-[var(--terminal)]/30" />

            {[
              {
                n: "01",
                title: "APRI IL CONTO",
                body: "Apri un conto demo su AvaTrade tramite il nostro link. Zero costi, zero rischi. Colleghi il conto alla piattaforma HTT in sola lettura.",
              },
              {
                n: "02",
                title: "SALI IN CLASSIFICA",
                body: "Partecipa alle sfide. I tuoi risultati appaiono in classifica in tempo reale, verificati e pubblici. Nessuno può toccarli.",
              },
              {
                n: "03",
                title: "DIVENTA IL RIFERIMENTO",
                body: "I trader bravi diventano visibili. La community ti segue. Il tuo track record verificato parla per te.",
              },
            ].map(({ n, title, body }, i) => (
              <div
                key={n}
                className="relative flex flex-row md:flex-col md:items-center md:text-center gap-5 md:gap-0 px-4 md:px-6 pb-10 md:pb-0"
              >
                {/* connector line — mobile */}
                {i < 2 && (
                  <div className="absolute md:hidden left-10 top-12 bottom-0 w-px bg-[var(--terminal)]/30" />
                )}
                <div className="relative z-10 shrink-0 w-12 h-12 border border-[var(--terminal)] bg-background flex items-center justify-center font-mono text-sm text-[var(--terminal)] md:mb-5">
                  {n}
                </div>
                <div>
                  <h3 className="font-impact text-lg tracking-wider text-foreground mb-1.5">
                    STEP {n} — {title}
                  </h3>
                  <p className="text-sm text-[var(--text-dim)] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 4B — PER I TRADER
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s4b.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 px-4 py-20 sm:py-28 ${s4b.cls}`}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <Label text="// PER I TRADER" amber />
            <h2 className="mt-4 font-impact text-5xl sm:text-6xl lg:text-7xl leading-[0.9] text-foreground">
              TRASFORMA IL TUO
              <br />
              TEMPO IN REDDITO.
            </h2>
            <p className="mt-5 mx-auto max-w-xl text-[var(--text-dim)] text-base sm:text-lg leading-relaxed">
              Stai già tradando. Stai già perdendo tempo davanti ai grafici. Con HTT quel
              tempo diventa un asset.
            </p>
          </div>

          {/* 3 step come funziona per il trader */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {[
              {
                n: "01",
                title: "FAI LA SFIDA LIVE",
                body: "Trada come fai sempre, sul tuo conto demo AvaTrade. HTT legge i risultati in tempo reale. Niente da installare, niente da cambiare.",
              },
              {
                n: "02",
                title: "COSTRUISCI IL TUO PUBBLICO",
                body: "Chi ti guarda operare dal vivo può seguirti e supportarti. Più sei bravo, più persone ti seguono. Il tuo track record verificato parla per te.",
              },
              {
                n: "03",
                title: "GUADAGNA MENTRE TRADI",
                body: "Chi vuole seguire le tue operazioni si registra tramite il tuo link AvaTrade. Zero costi per loro. Zero sforzo per te.",
              },
            ].map(({ n, title, body }) => (
              <div
                key={n}
                className="border border-[var(--amber)]/30 bg-[var(--bg-secondary)] p-6"
              >
                <div className="font-mono text-xs text-[var(--amber)] tracking-widest mb-3">
                  [{n}]
                </div>
                <h3 className="font-impact text-xl tracking-wider text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {/* tre modi per guadagnare */}
          <div className="text-center mb-10">
            <h3 className="font-impact text-3xl sm:text-4xl text-[var(--amber)] htt-text-glow-amber">
              TRE MODI PER GUADAGNARE.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: "> $",
                title: "LINK DI AFFILIAZIONE",
                body: "Ogni persona che si registra su AvaTrade tramite il tuo link ti genera una commissione. Gratis. Automatico. Senza fare niente di extra.",
                badge: "PASSIVO",
              },
              {
                icon: "> ◈",
                title: "POOL WATCH-TIME",
                body: "HTT distribuisce una quota dei propri ricavi ai trader più seguiti, in base al tempo che la community passa sulle tue live.",
                badge: "RICORRENTE",
              },
              {
                icon: "> ✓",
                title: "IL TUO METODO VALE",
                body: "Quando il tuo track record è verificato e pubblico, puoi vendere il tuo metodo a chi vuole imparare. Solo numeri reali.",
                badge: "SCALABILE",
              },
            ].map(({ icon, title, body, badge }) => (
              <div
                key={title}
                className="border border-[var(--amber)]/30 bg-[var(--bg-secondary)] p-6 transition-all duration-200 hover:border-[var(--amber)] hover:shadow-[0_0_20px_-6px_var(--amber)]"
              >
                <div className="font-mono text-lg text-[var(--amber)] mb-3">{icon}</div>
                <h4 className="font-impact text-xl tracking-wider text-foreground mb-2">
                  {title}
                </h4>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed mb-4">{body}</p>
                <span className="inline-block font-mono text-[10px] tracking-widest text-[var(--terminal)] border border-[var(--terminal)]/40 px-2 py-0.5">
                  {badge}
                </span>
              </div>
            ))}
          </div>

          {/* compliance */}
          <div className="border border-border p-4 font-mono text-[11px] text-[var(--text-dim)] leading-relaxed mb-10">
            &gt; NOTA LEGALE: HTT è una piattaforma di spettacolo e apprendimento
            competitivo. Le live mostrano trader che competono — non forniscono segnali da
            copiare. L&apos;affiliazione è un programma standard di introducing broker. Il
            trading comporta rischi significativi di perdita.
          </div>

          {/* CTAs trader */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/per-i-trader">
              <TerminalButton variant="amber" size="lg">
                &gt; SEI UN TRADER? INIZIA QUI
              </TerminalButton>
            </Link>
            <Link to="/per-i-trader">
              <TerminalButton
                variant="ghost"
                size="lg"
                className="border-[var(--amber)]/40 text-[var(--amber)] hover:border-[var(--amber)] hover:bg-[var(--amber)]/5 hover:text-[var(--amber)]"
              >
                SCOPRI COME FUNZIONA L&apos;AFFILIAZIONE ↓
              </TerminalButton>
            </Link>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] text-[var(--text-dim)]">
            Nessun costo. Nessun obbligo. Colleghi il conto e inizi subito.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 5 — CLASSIFICHE
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s5.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 bg-[#111111] px-4 py-20 sm:py-28 ${s5.cls}`}
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Label text="// CLASSIFICA LIVE" />
            <h2 className="mt-4 font-impact text-5xl sm:text-6xl leading-[0.9] text-foreground">
              I MIGLIORI
              <br />
              TRADER VERIFICATI.
            </h2>
          </div>

          <TerminalCard label="> LIVE_LEADERBOARD" glow="green" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] tracking-widest text-[var(--text-dim)] uppercase">
                    <th className="text-left px-4 py-3">RANK</th>
                    <th className="text-left px-4 py-3">TRADER</th>
                    <th className="text-right px-4 py-3">WIN RATE</th>
                    <th className="text-right px-4 py-3">MAX DD</th>
                    <th className="text-right px-4 py-3">PIPS</th>
                    <th className="text-left px-4 py-3">BADGE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      rank: "#1",
                      trader: "NULL_0x47",
                      wr: "94%",
                      dd: "-2.1%",
                      pips: "+847",
                      badge: "TOP 10",
                    },
                    {
                      rank: "#2",
                      trader: "DECODE_22",
                      wr: "89%",
                      dd: "-3.4%",
                      pips: "+612",
                      badge: "TOP 10",
                    },
                    {
                      rank: "#3",
                      trader: "SIGNAL_K",
                      wr: "87%",
                      dd: "-4.2%",
                      pips: "+589",
                      badge: "TOP 10",
                    },
                    {
                      rank: "#4",
                      trader: "PHANTOM_9",
                      wr: "83%",
                      dd: "-5.1%",
                      pips: "+441",
                      badge: "RISING",
                    },
                    {
                      rank: "#5",
                      trader: "CIPHER_01",
                      wr: "81%",
                      dd: "-5.8%",
                      pips: "+398",
                      badge: "RISING",
                    },
                  ].map(({ rank, trader, wr, dd, pips, badge }) => (
                    <tr
                      key={rank}
                      className="border-b border-border/40 hover:bg-[var(--terminal)]/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-[var(--text-dim)]">{rank}</td>
                      <td className="px-4 py-3 text-[var(--terminal)] font-semibold">{trader}</td>
                      <td className="px-4 py-3 text-right text-foreground">{wr}</td>
                      <td className="px-4 py-3 text-right text-[var(--alert)]">{dd}</td>
                      <td className="px-4 py-3 text-right text-[var(--terminal)]">{pips}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] tracking-widest border px-2 py-0.5 ${
                            badge === "TOP 10"
                              ? "border-[var(--terminal)]/40 text-[var(--terminal)]"
                              : "border-[var(--amber)]/40 text-[var(--amber)]"
                          }`}
                        >
                          {badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-[10px] font-mono text-[var(--text-dim)] border-t border-border">
              Dati aggiornati in tempo reale da AvaTrade. Verificati. Non modificabili.
            </p>
          </TerminalCard>

          <div className="mt-8 text-center">
            <Link to="/leaderboard">
              <TerminalButton variant="primary" size="md">
                &gt; VEDI LA CLASSIFICA COMPLETA
              </TerminalButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 6 — IL BRAND / MANIFESTO
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s6.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 bg-[#111111] px-4 py-20 sm:py-28 ${s6.cls}`}
      >
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <Label text="// IL MANIFESTO" />
            <h2 className="mt-4 font-impact text-5xl sm:text-6xl leading-[0.9] text-foreground">
              DECODIFICA
              <br />
              IL MERCATO.
            </h2>
            <div className="mt-6 space-y-4 text-[var(--text-dim)] text-base leading-relaxed">
              <p>HTT non è un corso. Non è un guru. Non è un canale Telegram di segnali.</p>
              <p>
                È una piattaforma dove il trading smette di essere un teatro e diventa uno
                sport.
              </p>
              <p>
                <span className="text-foreground font-semibold">Chi è bravo si vede.</span>
                <br />
                Chi finge, sparisce.
              </p>
              <p>
                Il mercato resta lo stesso.
                <br />
                Cambia il modo in cui lo vivrai.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="border border-[var(--terminal)]/40 bg-[#050505] px-12 py-10 shadow-[0_0_60px_-12px_var(--terminal)] flex flex-col items-center gap-6">
              <HttLogo size={72} showCursor />
              <div className="font-mono text-sm tracking-[0.3em] text-[var(--terminal)] htt-text-glow-green">
                &gt; HACK_THE_TRADING
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SEZIONE 7 — CTA FINALE
      ════════════════════════════════════════════════════════════════ */}
      <section
        ref={s7.ref as React.RefObject<HTMLElement>}
        className={`relative z-10 px-4 py-24 sm:py-36 ${s7.cls}`}
      >
        <div className="mx-auto max-w-3xl border border-[var(--terminal)]/50 p-10 sm:p-16 text-center shadow-[0_0_80px_-20px_var(--terminal)]">
          <div className="font-mono text-sm sm:text-base text-[var(--terminal)] tracking-[0.18em] htt-text-glow-green mb-6">
            &gt; SISTEMA PRONTO.
          </div>
          <h2 className="font-impact text-6xl sm:text-8xl lg:text-[9rem] leading-[0.88] text-foreground">
            ENTRA.
            <br />
            O RESTA
            <br />A GUARDARE.
          </h2>
          <p className="mt-8 text-[var(--text-dim)] text-base sm:text-lg leading-relaxed">
            Zero costi. Zero obblighi.
            <br />
            Solo la verità sul tuo trading.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/boot">
              <TerminalButton variant="primary" size="lg">
                &gt; INIZIA ORA
              </TerminalButton>
            </Link>
            <Link to="/live-demo">
              <TerminalButton variant="ghost" size="lg">
                GUARDA LE SFIDE LIVE
              </TerminalButton>
            </Link>
          </div>
          <p className="mt-8 font-mono text-[10px] text-[var(--text-dim)] leading-relaxed max-w-md mx-auto">
            HTT è una piattaforma di spettacolo e apprendimento competitivo. Non eseguiamo
            trade né forniamo segnali da copiare. Il trading comporta rischi significativi.
          </p>
        </div>
      </section>
    </div>
  );
}
