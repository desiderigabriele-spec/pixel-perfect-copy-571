import { useEffect, useRef } from "react";

// Effetto "market rain": numeri singoli che cadono in stile matrix,
// ~70% verde / 30% rosso, teste brillanti. Bassa opacità per restare sfondo.
// Si pausa automaticamente se l'utente ha 'prefers-reduced-motion'.

type Props = { opacity?: number; className?: string };

export function MarketRain({ opacity = 0.08, className = "" }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // statico, niente animazione

    const FONT_SIZE = 14;
    let columns = 0;
    let drops: { y: number; speed: number; color: "g" | "r"; bright: boolean }[] = [];
    let dpr = window.devicePixelRatio || 1;

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(dpr, dpr);
      columns = Math.floor(w / FONT_SIZE);
      drops = Array.from({ length: columns }, () => ({
        y: Math.random() * h,
        speed: 0.6 + Math.random() * 1.4,
        color: Math.random() < 0.7 ? "g" : "r",
        bright: Math.random() < 0.15,
      }));
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    function frame() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx!.fillStyle = "rgba(13,13,13,0.18)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const ch = Math.random() < 0.5
          ? String(Math.floor(Math.random() * 10))
          : (Math.random() < 0.4 ? "-" : String(Math.floor(Math.random() * 10)));
        const x = i * FONT_SIZE;
        const baseG = d.bright ? "#9CFFB7" : "#00FF41";
        const baseR = d.bright ? "#FF7088" : "#FF0033";
        ctx!.fillStyle = d.color === "g" ? baseG : baseR;
        ctx!.fillText(ch, x, d.y);
        d.y += d.speed * FONT_SIZE * 0.6;
        if (d.y > h && Math.random() > 0.975) {
          d.y = -FONT_SIZE;
          d.speed = 0.6 + Math.random() * 1.4;
          d.color = Math.random() < 0.7 ? "g" : "r";
          d.bright = Math.random() < 0.15;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
      style={{ opacity }}
    />
  );
}