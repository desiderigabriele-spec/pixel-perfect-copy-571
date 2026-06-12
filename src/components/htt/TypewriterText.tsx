import { useEffect, useState } from "react";

interface Props {
  text: string;
  speed?: number;
  onDone?: () => void;
  className?: string;
}

// TypewriterText: stampa progressiva carattere per carattere.
export function TypewriterText({ text, speed = 22, onDone, className }: Props) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, onDone]);
  return <span className={className}>{shown}</span>;
}