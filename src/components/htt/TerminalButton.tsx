import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "amber" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-[var(--terminal)]/10 text-[var(--terminal)] border-[var(--terminal)] hover:bg-[var(--terminal)] hover:text-background htt-text-glow-green",
  amber:
    "bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)] hover:bg-[var(--amber)] hover:text-background",
  danger:
    "bg-[var(--alert)]/10 text-[var(--alert)] border-[var(--alert)] hover:bg-[var(--alert)] hover:text-foreground",
  ghost:
    "bg-transparent text-foreground border-border hover:border-[var(--terminal)] hover:text-[var(--terminal)]",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-4 text-base",
} as const;

// TerminalButton: bottone stile terminale, font display + tracking ampio.
export const TerminalButton = forwardRef<HTMLButtonElement, Props>(function TerminalButton(
  { variant = "primary", size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-display uppercase tracking-[0.18em] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
});
