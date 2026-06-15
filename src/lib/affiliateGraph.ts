// Stub Fase 2 — albero sub-IB (trader come distributori).
// Quando il trader genererà referral, ogni nuovo affiliato si registra
// sotto di lui e la commissione sub-IB gli viene attribuita.
export type ReferralNode = { userId: string; children: ReferralNode[] };
export async function getReferralTree(_userId: string): Promise<ReferralNode | null> {
  return null;
}
