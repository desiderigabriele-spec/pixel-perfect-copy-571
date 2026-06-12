import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: "green" | "amber" | "alert" | "none";
  label?: string;
}

// TerminalCard: riquadro stile terminale con bordo, label opzionale e glow.
export function TerminalCard({ children, glow = "none", label, className, ...rest }: Props) {
  const glowMap = {
    green: "border-[var(--terminal)]/60 shadow-[0_0_24px_-8px_var(--terminal)]",
    amber: "border-[var(--amber)]/60 shadow-[0_0_24px_-8px_var(--amber)]",
    alert: "border-[var(--alert)]/60 shadow-[0_0_24px_-8px_var(--alert)]",
    none: "border-border",
  } as const;

  return (
    <div
      {...rest}
      className={cn(
        "relative z-10 border bg-card backdrop-blur-sm",
        glowMap[glow],
        className,
      )}
    >
      {label && (
        <div className="absolute -top-2.5 left-3 px-1.5 bg-background font-mono text-[10px] tracking-widest text-[var(--text-dim)]">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}