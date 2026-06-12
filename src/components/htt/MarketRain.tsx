import { useEffect, useRef } from "react";

// "Market Rain": digital rain a tema mercati finanziari.
// Colonne indipendenti con size/velocità random (parallasse),
// token = ticker / percentuali / numeri / frecce, teste bianche con glow,
// scia con fade-out verso il nero. Rispetta prefers-reduced-motion.

type Props = { opacity?: number; className?: string; topOffset?: number };

const TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "TSLA",
  "AAPL",
  "NVDA",
  "SPY",
  "EUR",
  "USD",
  "GOLD",
  "OIL",
  "DXY",
  "NDX",
  "XRP",
  "MSFT",
  "META",
];

function randToken(polarity: "pos" | "neg"): string {
  const r = Math.random();
  if (r < 0.22) return TICKERS[Math.floor(Math.random() * TICKERS.length)];
  if (r < 0.42) {
    const sign = polarity === "pos" ? "+" : "-";
    const n = (Math.random() * 9.9).toFixed(1);
    return `${sign}${n}%`;
  }
  if (r < 0.55) return polarity === "pos" ? "▲" : "▼";
  if (r < 0.8) {
    const len = 2 + Math.floor(Math.random() * 4);
    let s = "";
    for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  return String(Math.floor(Math.random() * 10));
}

type Column = {
  x: number;
  y: number;
  size: number;
  speed: number;
  polarity: "pos" | "neg";
  token: string;
  stepCounter: number;
};

export function MarketRain({ opacity = 0.5, className = "", topOffset = 64 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = window.devicePixelRatio || 1;
    const COL_WIDTH = 16; // spaziatura orizzontale media
    let cols: Column[] = [];
    let w = 0;
    let h = 0;

    function makeCol(x: number, initialY?: number): Column {
      const size = 10 + Math.floor(Math.random() * 9); // 10..18
      const polarity: "pos" | "neg" = Math.random() < 0.55 ? "pos" : "neg";
      return {
        x,
        y: initialY ?? -Math.random() * h,
        size,
        speed: 0.4 + Math.random() * 1.2,
        polarity,
        token: randToken(polarity),
        stepCounter: 0,
      };
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight - topOffset;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
      // riempi sfondo nero pieno
      ctx!.fillStyle = "#000000";
      ctx!.fillRect(0, 0, w, h);
      const count = Math.floor(w / COL_WIDTH);
      cols = Array.from({ length: count }, (_, i) =>
        makeCol(i * COL_WIDTH + COL_WIDTH / 2, Math.random() * h),
      );
    }
    resize();
    window.addEventListener("resize", resize);

    function drawFrame() {
      // scia: rettangolo nero semi-trasparente → fade verso l'alto
      ctx!.fillStyle = "rgba(0,0,0,0.09)";
      ctx!.fillRect(0, 0, w, h);

      for (const c of cols) {
        // ogni N step la colonna cambia token (per leggibilità)
        if (c.stepCounter % 6 === 0) {
          c.token = randToken(c.polarity);
        }
        c.stepCounter++;

        ctx!.font = `${c.size}px "Fira Code", "Courier New", monospace`;
        ctx!.textBaseline = "top";

        const color = c.polarity === "pos" ? "#00FF66" : "#FF2A4D";

        // testa bianca con glow
        ctx!.shadowColor = color;
        ctx!.shadowBlur = 6;
        ctx!.fillStyle = "#FFFFFF";
        ctx!.fillText(c.token, c.x, c.y);

        // riga sopra (coda immediata) nel colore della polarità
        ctx!.shadowBlur = 0;
        ctx!.fillStyle = color;
        ctx!.fillText(c.token, c.x, c.y - c.size - 2);

        c.y += c.speed * c.size * 0.9;

        if (c.y > h + 40 && Math.random() > 0.965) {
          const x = c.x;
          const fresh = makeCol(x, -c.size * 2);
          Object.assign(c, fresh);
        }
      }
    }

    // primo frame sempre (anche con reduced motion → stato statico visibile)
    drawFrame();
    if (reduce) {
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    let last = 0;
    const FRAME_MS = 1000 / 30; // ~30fps
    function loop(now: number) {
      if (now - last >= FRAME_MS) {
        last = now;
        drawFrame();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed left-0 right-0 bottom-0 ${className}`}
      style={{
        top: topOffset,
        opacity,
        zIndex: 0,
        background: "transparent",
      }}
    />
  );
}
