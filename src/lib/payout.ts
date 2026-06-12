// Stub Fase 2 — calcolo payout creator (pool élite / pool base).
// Anti-frode: solo watch-time da utenti affiliati, cap per viewer,
// peso moltiplicatore qualità. Per ora ritorna 0.
export async function calculatePayout(_traderId: string): Promise<{
  rank: number | null;
  pool: "elite" | "base" | null;
  estimatedAmount: number;
  currency: "EUR";
}> {
  return { rank: null, pool: null, estimatedAmount: 0, currency: "EUR" };
}