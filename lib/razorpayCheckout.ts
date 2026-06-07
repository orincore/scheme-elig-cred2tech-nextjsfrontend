// Shared Razorpay checkout helper: create order → open checkout → verify.
// Used by the dashboard unlock and the paid "Re-run analysis" action so the
// payment plumbing lives in one place.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export type ServicePaymentType = 'PAN_VERIFICATION' | 'DATA_REFRESH' | 'REANALYSIS';

export interface PayForServiceOptions {
  token: string;
  userId: string;
  mobile?: string;
  paymentType: ServicePaymentType;
  businessId?: string | number;
  description?: string;
  prefillName?: string;
  prefillEmail?: string;
}

export interface PayResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

/**
 * Runs a full Razorpay payment for a service and resolves once it is verified
 * (or cancelled / failed). Resolves rather than throws so callers can branch on
 * `success` / `cancelled` without try/catch noise.
 */
export async function payForService(opts: PayForServiceOptions): Promise<PayResult> {
  try {
    await loadRazorpay();

    const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.token}` },
      body: JSON.stringify({
        userId: opts.userId,
        paymentType: opts.paymentType,
        mobile: opts.mobile || '',
        businessId: opts.businessId,
      }),
    });
    const order = await orderRes.json();
    if (!order?.success) {
      return { success: false, error: order?.message || 'Failed to create payment order' };
    }

    return await new Promise<PayResult>((resolve) => {
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount * 100,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Cred2Tech',
        description: opts.description || 'Payment',
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.token}` },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            resolve(verifyData?.success
              ? { success: true }
              : { success: false, error: verifyData?.message || 'Payment verification failed' });
          } catch {
            resolve({ success: false, error: 'Payment verification failed' });
          }
        },
        prefill: { name: opts.prefillName || '', email: opts.prefillEmail || '', contact: opts.mobile || '' },
        theme: { color: '#6366f1' },
        modal: { ondismiss: () => resolve({ success: false, cancelled: true }) },
      });
      rzp.open();
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Payment failed' };
  }
}
