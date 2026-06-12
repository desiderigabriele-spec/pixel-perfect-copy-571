import { GlitchAvatar } from "./GlitchAvatar";

// Placeholder webcam trader: quadrato 1:1, overlay nome/badge/rank.
// In produzione qui andrà uno <video> stream WebRTC / HLS.
type Props = {
  username: string;
  side?: "long" | "short" | null;
  rank?: number | null;
};

export function TraderWebcam({ username, side, rank }: Props) {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-[var(--terminal)]/40 bg-[#0A0A0A]">
      {/* Scanlines decorative */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,255,65,0.18) 0px, rgba(0,255,65,0.18) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <GlitchAvatar name={username} color="green" size={120} />
      </div>
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--alert)] animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--alert)]">LIVE</span>
      </div>
      <div className="absolute top-2 right-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
        // CAM_01
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
        <div className="font-display text-base tracking-[0.06em] text-foreground">@{username}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
          {rank ? `RANK #${rank}` : "VERIFICATO AVATRADE"}
          {side ? ` · ${side === "long" ? "▲ LONG" : "▼ SHORT"}` : ""}
        </div>
      </div>
    </div>
  );
}