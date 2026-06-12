import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// TerminalInput: input con label "> nome_" e cursore lampeggiante.
export const TerminalInput = forwardRef<HTMLInputElement, Props>(function TerminalInput(
  { label, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-mono text-xs text-[var(--terminal)] htt-cursor">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...rest}
        className={cn(
          "bg-background border border-border px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--terminal)] focus:shadow-[0_0_16px_-6px_var(--terminal)] transition-colors",
          error && "border-[var(--alert)] focus:border-[var(--alert)]",
          className,
        )}
      />
      {error && <span className="font-mono text-xs text-[var(--alert)]">{error}</span>}
    </div>
  );
});
