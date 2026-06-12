import { getMockStats } from "@/lib/mockStats";

// Genera card share in SVG (stories 9:16 oppure post 1:1).
// Estetica HTT: nero #0D0D0D, verde #00FF41, font system mono (no Google Fonts
// in SVG: la stampa di Bebas Neue resta come fallback testuale).

type Format = "story" | "post";
type CardType = "challenge" | "top10" | "win" | "rank" | "milestone";

const W: Record<Format, number> = { story: 1080, post: 1080 };
const H: Record<Format, number> = { story: 1920, post: 1080 };

export function renderShareCard(opts: {
  username: string;
  format: Format;
  type?: CardType;
  rank?: number;
  referralUrl: string;
}): string {
  const { username, format } = opts;
  const type = opts.type ?? "challenge";
  const stats = getMockStats(username);
  const w = W[format];
  const h = H[format];

  const title = TITLE[type];
  const subtitle = `@${username}`;

  // Mini market-rain statica: 10 colonne di cifre verdi/rosse pseudo-random.
  const rainCols = 18;
  const rain: string[] = [];
  for (let c = 0; c < rainCols; c++) {
    const x = (c * w) / rainCols + 20;
    for (let r = 0; r < 28; r++) {
      const y = 60 + r * (h / 28);
      const digit = (c * 7 + r * 3) % 10;
      const color = (c + r) % 5 === 0 ? "#FF0033" : "#00FF41";
      rain.push(`<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="monospace" font-size="18" fill="${color}" opacity="0.08">${digit}</text>`);
    }
  }

  // Layout verticale
  const cy = h / 2;
  const titleY = format === "story" ? 480 : 260;
  const subY = titleY + 140;
  const statsY = format === "story" ? 1080 : 600;
  const ctaY = h - 260;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0D0D0D"/>
  ${rain.join("")}
  <!-- griglia decorativa -->
  <g opacity="0.12">
    ${Array.from({ length: 20 }, (_, i) =>
      `<line x1="0" y1="${(i * h) / 20}" x2="${w}" y2="${(i * h) / 20}" stroke="#00FF41" stroke-width="0.5"/>`
    ).join("")}
  </g>

  <!-- Header HTT -->
  <text x="60" y="100" font-family="monospace" font-size="26" fill="#00FF41" letter-spacing="6">HACK_THE_TRADING</text>
  <text x="60" y="130" font-family="monospace" font-size="14" fill="#888888" letter-spacing="3">// decode the market</text>

  <!-- Titolo grande -->
  <text x="60" y="${titleY}" font-family="Anton, Bebas Neue, Impact, sans-serif" font-size="${format === "story" ? 110 : 80}" fill="#00FF41" letter-spacing="4" style="filter:drop-shadow(0 0 16px rgba(0,255,65,0.5))">${escapeXml(title)}</text>
  <text x="60" y="${subY}" font-family="Anton, Bebas Neue, Impact, sans-serif" font-size="${format === "story" ? 80 : 60}" fill="#E5E5E5" letter-spacing="3">${escapeXml(subtitle)}</text>

  <!-- Stats -->
  <g font-family="monospace" fill="#E5E5E5">
    <text x="60" y="${statsY}" font-size="20" fill="#888888" letter-spacing="3">// METRICS</text>
    <text x="60" y="${statsY + 60}" font-size="44" fill="#00FF41">${stats.consistency_score}/100</text>
    <text x="60" y="${statsY + 90}" font-size="16" fill="#888888">CONSISTENCY</text>

    <text x="380" y="${statsY + 60}" font-size="44">${(stats.win_rate * 100).toFixed(1)}%</text>
    <text x="380" y="${statsY + 90}" font-size="16" fill="#888888">WIN RATE</text>

    <text x="680" y="${statsY + 60}" font-size="44" fill="#FFB800">${stats.profit_factor.toFixed(2)}</text>
    <text x="680" y="${statsY + 90}" font-size="16" fill="#888888">PROFIT FACTOR</text>
  </g>

  ${opts.rank ? `<text x="${w - 60}" y="${titleY}" text-anchor="end" font-family="Anton, sans-serif" font-size="${format === "story" ? 120 : 80}" fill="#FFB800">#${opts.rank}</text>` : ""}

  <!-- CTA -->
  <g>
    <rect x="60" y="${ctaY}" width="${w - 120}" height="160" fill="none" stroke="#00FF41" stroke-width="2"/>
    <text x="${w / 2}" y="${ctaY + 60}" text-anchor="middle" font-family="monospace" font-size="22" fill="#888888" letter-spacing="3">// SEGUIMI SU HTT</text>
    <text x="${w / 2}" y="${ctaY + 110}" text-anchor="middle" font-family="monospace" font-size="22" fill="#00FF41">${escapeXml(opts.referralUrl)}</text>
    <text x="${w / 2}" y="${ctaY + 140}" text-anchor="middle" font-family="monospace" font-size="12" fill="#888888">Sto partecipando al World Challenge. Non è un servizio di segnali.</text>
  </g>
</svg>`;
}

const TITLE: Record<CardType, string> = {
  challenge: "STO GAREGGIANDO",
  top10: "TOP 10",
  win: "HO VINTO",
  rank: "IN CLASSIFICA",
  milestone: "TRAGUARDO",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}