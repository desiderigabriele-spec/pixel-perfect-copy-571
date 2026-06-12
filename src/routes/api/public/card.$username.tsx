import { createFileRoute } from "@tanstack/react-router";
import { renderShareCard } from "@/lib/cardSvg";

// SVG share card pubblica per un trader. Niente auth.
// Querystring:
//   format=story|post (default story)
//   type=challenge|top10|win|rank|milestone (default challenge)
//   rank=#  (opzionale)
// Esempi:
//   /api/public/card/marco?format=post&type=win
//   /api/public/card/marco?format=story&type=top10&rank=3
export const Route = createFileRoute("/api/public/card/$username")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const format = url.searchParams.get("format") === "post" ? "post" : "story";
        const typeParam = url.searchParams.get("type") ?? "challenge";
        const type = (["challenge","top10","win","rank","milestone"] as const).includes(typeParam as any)
          ? (typeParam as any) : "challenge";
        const rank = url.searchParams.get("rank") ? Number(url.searchParams.get("rank")) : undefined;

        const username = params.username.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
        if (!username) return new Response("Bad username", { status: 400 });

        // Referral URL: pagina pubblica del trader (sostituibile con vero referral broker).
        const origin = url.origin;
        const referralUrl = `${origin}/u/${username}`;

        const svg = renderShareCard({ username, format, type, rank, referralUrl });
        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});