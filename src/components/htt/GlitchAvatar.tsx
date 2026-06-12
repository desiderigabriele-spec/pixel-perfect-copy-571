import { cn } from "@/lib/utils";

interface Props {
  name: string;
  color?: "green" | "amber" | "dim";
  size?: number;
  className?: string;
}

// GlitchAvatar: iniziale + scanline + bordo che pulsa nel colore del trader.
export function GlitchAvatar({ name, color = "green", size = 56, className }: Props) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  const colorMap = {
    green: "border-[var(--terminal)] text-[var(--terminal)] shadow-[0_0_18px_-4px_var(--terminal)]",
    amber: "border-[var(--amber)] text-[var(--amber)] shadow-[0_0_18px_-4px_var(--amber)]",
    dim: "border-border text-foreground",
  };

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-flex items-center justify-center border-2 bg-bg-secondary overflow-hidden htt-scanlines",
        colorMap[color],
        className,
      )}
    >
      <span className="font-display text-2xl htt-glitch" style={{ fontSize: size * 0.5 }}>
        {initial}
      </span>
      <span className="pointer-events-none absolute inset-0 mix-blend-screen opacity-60" />
    </div>
  );
}