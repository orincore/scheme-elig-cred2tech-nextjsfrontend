'use client';

import { useEffect, useRef, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Lock, Loader2, ShieldCheck, CheckCircle2, Landmark, BadgePercent, Award,
  ScanSearch, FileSearch, BadgeCheck, Sparkles, PartyPopper,
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

/**
 * Full-screen, one-shot celebration: tasteful sparkles raining from the top when
 * the user discovers they're eligible. Pointer-events-none so it never blocks the
 * paywall, auto-clears after a few seconds, and respects reduced-motion.
 */
function CelebrationOverlay() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 4200);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#f43f5e'];
  const particles = Array.from({ length: 46 }).map((_, i) => ({
    i,
    left: Math.random() * 100,
    delay: Math.random() * 1.3,
    duration: 2.6 + Math.random() * 2.4,
    size: 12 + Math.random() * 14,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <Sparkles
          key={p.i}
          className="celebrate-fall absolute -top-12"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            color: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes celebrate-fall {
          0%   { transform: translateY(-12vh) rotate(0deg);   opacity: 0; }
          8%   { opacity: 1; }
          100% { transform: translateY(112vh) rotate(360deg); opacity: 0; }
        }
        .celebrate-fall {
          animation-name: celebrate-fall;
          animation-timing-function: cubic-bezier(.37,.05,.5,.95);
          animation-iteration-count: 1;
          animation-fill-mode: both;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .celebrate-fall { display: none; }
        }
      `}</style>
    </div>
  );
}

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

      {/* IDLE — call to analyse (flat SectionBox styling, matches /profile) */}
      {phase === 'idle' && (
        <div className="bg-card border border-border rounded-none overflow-hidden">
          {/* Header bar — mirrors profile SectionBox */}
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Discover Eligible Schemes</h3>
          </div>

          <div className="px-5 py-6">
            <h2 className="text-[17px] font-bold text-foreground">
              Discover the schemes you qualify for
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Our AI scans 100+ government schemes against your full business profile to
              find every one you&apos;re eligible for.
            </p>

            {/* What you get — grounded icons, flat rows */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">100+ schemes</p>
                  <p className="text-[12px] text-muted-foreground">Central &amp; state government</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Full profile match</p>
                  <p className="text-[12px] text-muted-foreground">Checked against your business</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Eligibility reasons</p>
                  <p className="text-[12px] text-muted-foreground">Know exactly why you qualify</p>
                </div>
              </div>
            </div>

            <Button onClick={handleAnalyse} className="mt-6 rounded-none">
              <ScanSearch className="mr-2 h-4 w-4" /> Analyse My Schemes
            </Button>
          </div>
        </div>
      )}

      {/* ANALYZING — live count, no scheme details (flat SectionBox styling) */}
      {phase === 'analyzing' && (
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Analysing Your Profile</h3>
          </div>
          <div className="px-5 py-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
              <p className="text-sm text-foreground flex-1">
                Matching government schemes against your full business profile…
              </p>
              <span className="text-sm font-semibold text-foreground tabular-nums">{count} eligible</span>
            </div>
            <Progress value={count > 0 ? Math.min(90, count * 8) : 6} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-2">This usually takes under a minute.</p>
          </div>
        </div>
      )}

      {/* RESULT — count revealed, schemes blurred behind the paywall */}
      {phase === 'result' && (
        <>
          {/* One-shot celebration when eligibility is revealed */}
          <CelebrationOverlay />

          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                <PartyPopper className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400 mb-0.5">
                  Congratulations
                </p>
                <p className="text-[15px] font-bold leading-snug text-foreground">
                  You&apos;re eligible for{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">{count}</span>{' '}
                  {count === 1 ? 'scheme' : 'schemes'}.
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Unlock to see exactly which schemes, your match reasons and how to apply.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Blurred fake results — flat cards mirroring the real scheme cards */}
            <div className="grid md:grid-cols-2 gap-4 select-none pointer-events-none blur-[6px]" aria-hidden>
              {Array.from({ length: blurCount }).map((_, i) => {
                const f = FAKE_CARDS[i % FAKE_CARDS.length];
                const Icon = f.icon;
                return (
                  <div key={i} className="bg-card border border-border rounded-none p-5 space-y-3">
                    <div className="flex justify-between gap-3">
                      <p className="text-[15px] font-semibold text-foreground">{f.name}</p>
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Eligible
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
                  </div>
                );
              })}
            </div>

            {/* Paywall overlay — flat card */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-card border border-border rounded-none shadow-lg p-6 text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-none border border-border bg-background">
                  <Lock className="h-5 w-5 text-muted-foreground" />
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
                  className="mt-5 w-full rounded-none"
                >
                  {paying ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    <>Unlock now · ₹{unlockPrice}</>
                  )}
                </Button>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Secure one-time payment · Powered by Razorpay
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
