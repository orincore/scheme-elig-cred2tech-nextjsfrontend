'use client';

import { useEffect, useRef, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Lock, Loader2, ShieldCheck, CheckCircle2, Landmark, BadgePercent, Award,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Phase = 'idle' | 'analyzing' | 'result';

// Plausible-looking placeholders shown behind the blur so the locked grid reads
// as "real results waiting to be revealed" rather than empty boxes.
const FAKE_CARDS = [
  { name: 'Credit Linked Capital Subsidy Scheme', ministry: 'Ministry of MSME', icon: BadgePercent, tag: 'Subsidy' },
  { name: 'Prime Minister Employment Generation Programme', ministry: 'Ministry of MSME', icon: Landmark, tag: 'Loan' },
  { name: 'Stand-Up India Scheme', ministry: 'Department of Financial Services', icon: Landmark, tag: 'Loan' },
  { name: 'Technology Upgradation Fund Scheme', ministry: 'Ministry of Textiles', icon: Award, tag: 'Grant' },
  { name: 'Market Development Assistance Scheme', ministry: 'Ministry of Commerce', icon: BadgePercent, tag: 'Subsidy' },
  { name: 'National SC-ST Hub Scheme', ministry: 'Ministry of MSME', icon: Award, tag: 'Support' },
];

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

/**
 * Locked dashboard for an unpaid business. The user runs analysis, the backend
 * returns ONLY the eligible count (never the schemes), we show that count behind
 * a blurred teaser, and unlocking it via payment reveals the real data.
 */
export default function LockedSchemesTeaser({ onUnlocked }: { onUnlocked: () => void }) {
  const { token, userId, mobile, activeBusinessId } = useMsmeAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(0);
  const [unlockPrice, setUnlockPrice] = useState<number>(99);
  const [paying, setPaying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authToken = () => token || sessionStorage.getItem('msme_auth_token') || '';
  const bizId = () => activeBusinessId ?? sessionStorage.getItem('msme_active_business') ?? undefined;

  // Fetch the (admin-configurable) unlock price up front.
  useEffect(() => {
    const uid = userId || sessionStorage.getItem('msme_user_id');
    if (!uid) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment/status/${uid}`, {
          headers: { Authorization: `Bearer ${authToken()}` },
        });
        const data = await res.json();
        if (data?.unlockPrice) setUnlockPrice(Number(data.unlockPrice));
      } catch {
        /* keep default */
      }
    })();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollPreview = () => {
    const tick = async () => {
      try {
        const q = bizId() ? `?businessId=${bizId()}` : '';
        const res = await fetch(`${API_BASE_URL}/api/msme-eligibility/preview-status${q}`, {
          headers: { Authorization: `Bearer ${authToken()}` },
        });
        const data = await res.json();

        if (data?.unlocked) { onUnlocked(); return; }

        if (typeof data?.eligibleCount === 'number' && data.eligibleCount > count) {
          setCount(data.eligibleCount);
        }

        if (data?.status === 'completed') {
          setCount(data.eligibleCount || 0);
          setPhase('result');
          return;
        }
        if (data?.status === 'error') {
          toast.error('Analysis failed. Please try again.');
          setPhase('idle');
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      pollRef.current = setTimeout(tick, 2500);
    };
    pollRef.current = setTimeout(tick, 2000);
  };

  const handleAnalyse = async () => {
    setPhase('analyzing');
    setCount(0);
    try {
      const res = await fetch(`${API_BASE_URL}/api/msme-eligibility/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ businessId: bizId() }),
      });
      const data = await res.json();

      if (data?.unlocked) { onUnlocked(); return; }

      if (data?.requiresProfile) {
        toast.error('Please complete your business profile first.');
        window.location.href = '/onboarding/profile';
        return;
      }
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to start analysis');
      }
      pollPreview();
    } catch (err) {
      console.error('Preview analyse failed:', err);
      toast.error('Could not start analysis. Please try again.');
      setPhase('idle');
    }
  };

  const handleUnlock = async () => {
    setPaying(true);
    try {
      await loadRazorpay();
      const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({
          userId: userId || sessionStorage.getItem('msme_user_id'),
          paymentType: 'PAN_VERIFICATION',
          mobile: mobile || sessionStorage.getItem('msme_mobile') || '',
          businessId: bizId(),
        }),
      });
      const order = await orderRes.json();
      if (!order?.success) throw new Error(order?.message || 'Failed to create order');

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount * 100,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Cred2Tech',
        description: 'Unlock your eligible schemes',
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData?.success) {
              toast.success('Unlocked! Loading your schemes…');
              onUnlocked();
            } else {
              toast.error(verifyData?.message || 'Payment verification failed');
            }
          } catch {
            toast.error('Payment verification failed');
          } finally {
            setPaying(false);
          }
        },
        prefill: { contact: mobile || '' },
        theme: { color: '#6366f1' },
        modal: { ondismiss: () => { setPaying(false); toast.info('Payment cancelled'); } },
      });
      rzp.open();
    } catch (err) {
      console.error('Unlock payment failed:', err);
      toast.error('Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  const blurCount = Math.min(Math.max(count, 4), 6);

  return (
    <div className="space-y-6">
      {/* Header (mirrors the unlocked dashboard) */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Scheme Eligibility</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-matched government schemes for your business
        </p>
      </div>

      {/* IDLE — call to analyse */}
      {phase === 'idle' && (
        <Card className="relative overflow-hidden border-indigo-200/70 dark:border-indigo-900/50 bg-linear-to-r from-indigo-50 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-[#162048] dark:to-indigo-950/20 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Discover the schemes you qualify for</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Our AI scans 100+ government schemes against your full business profile to
            find every one you're eligible for.
          </p>
          <Button onClick={handleAnalyse} size="lg" className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Sparkles className="mr-2 h-4 w-4" /> Analyse My Schemes
          </Button>
        </Card>
      )}

      {/* ANALYZING — live count, no scheme details */}
      {phase === 'analyzing' && (
        <Card className="relative overflow-hidden p-6 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <p className="text-sm font-medium text-foreground flex-1">
              AI is matching government schemes against your full profile…
            </p>
            <span className="text-sm font-semibold text-primary tabular-nums">{count} eligible</span>
          </div>
          <Progress value={count > 0 ? Math.min(90, count * 8) : 6} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-2">This usually takes under a minute.</p>
        </Card>
      )}

      {/* RESULT — count revealed, schemes blurred behind the paywall */}
      {phase === 'result' && (
        <>
          <Card className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-linear-to-r from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-[#162048] dark:to-emerald-950/20 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] sm:text-[17px] font-bold leading-snug text-foreground">
                  Great news! You're eligible for{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">{count}</span>{' '}
                  {count === 1 ? 'scheme' : 'schemes'}.
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Unlock to see exactly which schemes, your match reasons and how to apply.
                </p>
              </div>
            </div>
          </Card>

          <div className="relative">
            {/* Blurred fake results */}
            <div className="grid md:grid-cols-2 gap-4 select-none pointer-events-none blur-[6px]" aria-hidden>
              {Array.from({ length: blurCount }).map((_, i) => {
                const f = FAKE_CARDS[i % FAKE_CARDS.length];
                const Icon = f.icon;
                return (
                  <Card key={i} className="p-5 pl-6 space-y-3 border-border/60">
                    <div className="flex justify-between gap-3">
                      <p className="text-[15px] font-semibold text-foreground">{f.name}</p>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Eligible
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" /> {f.ministry}
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px]">{f.tag}</span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px]">Central</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      You meet the core eligibility criteria for this scheme based on your business profile.
                    </p>
                  </Card>
                );
              })}
            </div>

            {/* Paywall overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card className="w-full max-w-md border-indigo-200/70 dark:border-indigo-900/50 bg-card/95 backdrop-blur-sm shadow-2xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
                  <Lock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Unlock your {count} {count === 1 ? 'scheme' : 'schemes'}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Get the full list with eligibility reasons, required documents and step-by-step
                  application guidance.
                </p>
                <Button
                  onClick={handleUnlock}
                  disabled={paying}
                  size="lg"
                  className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {paying ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    <>Unlock now · ₹{unlockPrice}</>
                  )}
                </Button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  Secure one-time payment · Powered by Razorpay
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
