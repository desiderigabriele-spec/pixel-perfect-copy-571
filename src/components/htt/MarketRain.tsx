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
  gridY: number;
  stepFrac: number;
  speed: number;
  cells: number[];
  maxTrail: number;
};

const FONT_SIZE = 14;
const CELL_W = Math.round(FONT_SIZE * 1.7); // 24
const GREEN = "#00FF41";
const RED = "#FF0033";
const GREEN_HEAD = "#AFFFCC";
const RED_HEAD = "#FFAAB5";

export function MarketRain({ opacity = 0.15, className = "", topOffset = 64 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cap DPR at 2: a 3× phone draws 9× pixels per frame — far too slow.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // shadowBlur is the heaviest 2D op on mobile — skip it on touch devices.
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const useGlow = !isTouch;
    const FRAME_MS = isTouch ? 1000 / 20 : 1000 / 30;

    let cols: Col[] = [];
    let w = 0;
    let h = 0;
    let lastCount = -1;

    function totalRows() {
      return Math.ceil(h / FONT_SIZE) + 2;
    }

    // seeded: pre-fill trail + place head on-screen so the first frame looks full.
    function makeCol(x: number, seeded: boolean): Col {
      const maxTrail = 10 + Math.floor(Math.random() * 10);
      const cells = [initialValue()];
      let gridY: number;
      if (seeded) {
        gridY = Math.floor(Math.random() * (totalRows() + maxTrail));
        const pre = Math.floor(Math.random() * maxTrail);
        for (let i = 0; i < pre; i++) cells.push(initialValue());
      } else {
        gridY = -(1 + Math.floor(Math.random() * 8));
      }
      return {
        x,
        gridY,
        stepFrac: Math.random(),
        speed: 0.2 + Math.random() * 0.35,
        cells,
        maxTrail,
      };
    }

    function applyResize() {
      w = window.innerWidth;
      h = window.innerHeight - topOffset;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
      // Only rebuild columns when the column count actually changes (e.g. rotation
      // or desktop resize). Mobile scroll only changes height via the address bar —
      // keep the existing columns so the rain doesn't reset on every scroll.
      const count = Math.floor(w / CELL_W);
      if (count !== lastCount) {
        lastCount = count;
        cols = Array.from({ length: count }, (_, i) =>
          makeCol(i * CELL_W + CELL_W / 2, true),
        );
      }
    }

    let resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(applyResize, 150);
    }

    applyResize();
    window.addEventListener("resize", onResize);

    function drawFrame() {
      ctx!.fillStyle = "#0D0D0D";
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = `700 ${FONT_SIZE}px "JetBrains Mono", monospace`;
      ctx!.textBaseline = "top";
      ctx!.textAlign = "center";

      const rows = totalRows();

      for (const c of cols) {
        c.stepFrac += c.speed;
        while (c.stepFrac >= 1) {
          c.stepFrac -= 1;
          c.gridY++;
          c.cells.unshift(mutate(c.cells[0]));
          if (c.cells.length > c.maxTrail) c.cells.pop();
        }

        const len = c.cells.length;

        // Trail (oldest → newest so the head renders on top).
        ctx!.shadowBlur = 0;
        for (let i = len - 1; i >= 1; i--) {
          const rowY = (c.gridY - i) * FONT_SIZE;
          if (rowY < -FONT_SIZE || rowY > h) continue;
          const alpha = Math.pow(1 - i / len, 0.7);
          if (alpha < 0.02) continue;
          ctx!.globalAlpha = alpha;
          const v = c.cells[i];
          ctx!.fillStyle = v >= 0 ? GREEN : RED;
          ctx!.fillText(label(v), c.x, rowY);
        }

        // Head.
        const headY = c.gridY * FONT_SIZE;
        ctx!.globalAlpha = 1;
        if (headY >= -FONT_SIZE && headY <= h + FONT_SIZE) {
          const hv = c.cells[0];
          const isPos = hv >= 0;
          if (useGlow) {
            ctx!.shadowColor = isPos ? GREEN : RED;
            ctx!.shadowBlur = 10;
          }
          ctx!.fillStyle = isPos ? GREEN_HEAD : RED_HEAD;
          ctx!.fillText(label(hv), c.x, headY);
          if (useGlow) ctx!.shadowBlur = 0;
        }

        // Respawn above the top once the whole column has fallen off the bottom.
        if (c.gridY - c.cells.length > rows + 1) {
          const fresh = makeCol(c.x, false);
          c.gridY = fresh.gridY;
          c.stepFrac = fresh.stepFrac;
          c.speed = fresh.speed;
          c.cells = fresh.cells;
          c.maxTrail = fresh.maxTrail;
        }
      }

      ctx!.globalAlpha = 1;
    }

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
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [topOffset]);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        className={`pointer-events-none fixed left-0 right-0 bottom-0 ${className}`}
        style={{ top: topOffset, opacity, zIndex: 0, willChange: "transform" }}
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
