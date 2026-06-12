// Logo HTT: piccola "finestra terminale" con header pallini, scritta HTT,
// mini-grafico a candele inline, e cursore lampeggiante. Tutto SVG/CSS,
// nessun asset esterno. Scalabile via prop `size`.

type Props = { size?: number; showCursor?: boolean; className?: string };

export function HttLogo({ size = 32, showCursor = true, className = "" }: Props) {
  const w = size * 3.6;
  const h = size * 1.1;
  return (
    <span
      className={`inline-flex items-center gap-2 align-middle ${className}`}
      style={{ height: h }}
    >
      <svg
        viewBox="0 0 144 44"
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* cornice finestra */}
        <rect x="0.5" y="0.5" width="143" height="43" rx="3" fill="#0D0D0D" stroke="#2A2A2A" />
        {/* barra titolo */}
        <rect x="0.5" y="0.5" width="143" height="9" fill="#1A1A1A" />
        <circle cx="6" cy="5" r="1.6" fill="#FF0033" />
        <circle cx="11" cy="5" r="1.6" fill="#FFB800" />
        <circle cx="16" cy="5" r="1.6" fill="#00FF41" />
        {/* candele */}
        <g stroke="#00FF41" strokeWidth="1">
          <line x1="92" y1="16" x2="92" y2="36" />
          <line x1="100" y1="14" x2="100" y2="34" />
          <line x1="108" y1="20" x2="108" y2="38" />
          <line x1="116" y1="12" x2="116" y2="30" />
          <line x1="124" y1="18" x2="124" y2="34" />
          <line x1="132" y1="10" x2="132" y2="28" />
        </g>
        <g>
          <rect x="89" y="20" width="6" height="10" fill="#00FF41" />
          <rect x="97" y="18" width="6" height="8" fill="#00FF41" />
          <rect x="105" y="26" width="6" height="6" fill="#FF0033" />
          <rect x="113" y="16" width="6" height="10" fill="#00FF41" />
          <rect x="121" y="22" width="6" height="8" fill="#00FF41" />
          <rect x="129" y="14" width="6" height="10" fill="#00FF41" />
        </g>
        {/* HTT */}
        <text
          x="8"
          y="32"
          fontFamily="'Bebas Neue','Anton',monospace"
          fontSize="20"
          letterSpacing="3"
          fill="#00FF41"
          style={{ filter: "drop-shadow(0 0 4px rgba(0,255,65,0.6))" }}
        >
          HTT
        </text>
        {/* cursore */}
        {showCursor && (
          <rect x="56" y="20" width="7" height="14" fill="#00FF41">
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>
    </span>
  );
}