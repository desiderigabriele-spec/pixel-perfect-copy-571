// Stub Fase 2 — pagamenti / tip / abbonamenti.
// Implementazione reale via Stripe quando la piattaforma sarà validata.
export interface PaymentProvider {
  createCheckout(opts: { amount: number; currency: string; userId: string }): Promise<{ url: string }>;
  refund(opts: { paymentId: string }): Promise<void>;
}

export const noopPaymentProvider: PaymentProvider = {
  async createCheckout() { throw new Error("payments_not_enabled"); },
  async refund() { throw new Error("payments_not_enabled"); },
};