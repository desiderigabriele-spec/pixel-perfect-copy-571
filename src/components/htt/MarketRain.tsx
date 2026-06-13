import { useEffect, useRef } from "react";

type Props = { opacity?: number; className?: string; topOffset?: number };

function initialValue(): number {
  return Math.random() < 0.7
    ? 5 + Math.floor(Math.random() * 5)     // 5–9 positive, skewed high
    : -(1 + Math.floor(Math.random() * 4)); // -1 to -4 negative, low magnitude
}

function mutate(v: number): number {
  return Math.max(-9, Math.min(9, Math.random() < 0.62 ? v + 1 : v - 1));
}

function label(v: number): string {
  return v < 0 ? `-${Math.abs(v)}` : String(v);
}

type Col = {
  x: number;
  gridY: number;     // row index of head (increases as it falls)
  stepFrac: number;  // accumulated fractional step
  speed: number;     // grid cells per frame
  cells: number[];   // [0]=head value, [i]=i rows above head
  maxTrail: number;
};

const FONT_SIZE = 14;
const CELL_W = Math.round(FONT_SIZE * 1.7); // 24
const GREEN = "#00FF41";
const RED = "#FF0033";
const FRAME_MS = 1000 / 30;

export function MarketRain({ opacity = 0.08, className = "", topOffset = 64 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = window.devicePixelRatio || 1;
    let cols: Col[] = [];
    let w = 0;
    let h = 0;

    function totalRows() {
      return Math.ceil(h / FONT_SIZE) + 2;
    }

    function makeCol(x: number, gridY?: number): Col {
      const maxTrail = 12 + Math.floor(Math.random() * 12);
      return {
        x,
        gridY: gridY ?? -(1 + Math.floor(Math.random() * 8)),
        stepFrac: Math.random(),
        speed: 0.18 + Math.random() * 0.32,
        cells: [initialValue()],
        maxTrail,
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
      const count = Math.floor(w / CELL_W);
      const rows = totalRows();
      cols = Array.from({ length: count }, (_, i) =>
        makeCol(
          i * CELL_W + CELL_W / 2,
          Math.floor(Math.random() * rows * 1.5) - rows,
        ),
      );
    }

    resize();
    window.addEventListener("resize", resize);

    function drawFrame() {
      ctx!.fillStyle = "#0D0D0D";
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = `700 ${FONT_SIZE}px "JetBrains Mono", monospace`;
      ctx!.textBaseline = "top";
      ctx!.textAlign = "center";

      const rows = totalRows();

      for (const c of cols) {
        // Advance column position
        c.stepFrac += c.speed;
        while (c.stepFrac >= 1) {
          c.stepFrac -= 1;
          c.gridY++;
          c.cells.unshift(mutate(c.cells[0]));
          if (c.cells.length > c.maxTrail) c.cells.pop();
        }

        const len = c.cells.length;

        // Draw trail cells (oldest → newest so head renders on top)
        ctx!.shadowBlur = 0;
        for (let i = len - 1; i >= 1; i--) {
          const rowY = (c.gridY - i) * FONT_SIZE;
          if (rowY < -FONT_SIZE || rowY > h) continue;
          const alpha = Math.pow(1 - i / len, 0.7);
          if (alpha < 0.01) continue;
          ctx!.globalAlpha = alpha;
          const v = c.cells[i];
          ctx!.fillStyle = v >= 0 ? GREEN : RED;
          ctx!.fillText(label(v), c.x, rowY);
        }

        // Draw head with bright near-white tint and glow
        const headY = c.gridY * FONT_SIZE;
        ctx!.globalAlpha = 1;
        if (headY >= -FONT_SIZE && headY <= h + FONT_SIZE) {
          const hv = c.cells[0];
          const isPos = hv >= 0;
          ctx!.shadowColor = isPos ? GREEN : RED;
          ctx!.shadowBlur = 12;
          ctx!.fillStyle = isPos ? "rgba(210,255,225,1)" : "rgba(255,210,215,1)";
          ctx!.fillText(label(hv), c.x, headY);
          ctx!.shadowBlur = 0;
        }

        // Reset when entire column has fallen below screen
        if (c.gridY - c.cells.length > rows + 1) {
          const fresh = makeCol(c.x);
          c.gridY = fresh.gridY;
          c.stepFrac = fresh.stepFrac;
          c.speed = fresh.speed;
          c.cells = fresh.cells;
          c.maxTrail = fresh.maxTrail;
        }
      }

      ctx!.globalAlpha = 1;
    }

    drawFrame();
    if (reduce) return () => window.removeEventListener("resize", resize);

    let raf = 0;
    let last = 0;
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
  }, [topOffset]);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        className={`pointer-events-none fixed left-0 right-0 bottom-0 ${className}`}
        style={{ top: topOffset, opacity, zIndex: 0 }}
      />
      {/* Scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </>
  );
}
