'use client';

import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { toast } from 'sonner';
import { CheckCircle2, Lock } from 'lucide-react';

const PLAN = {
  name: 'Registration',
  price: '₹499',
  period: '/one-time',
  description: 'Complete your registration',
  features: [
    'Access to 100+ government schemes',
    'Personalized scheme recommendations',
    'Save unlimited schemes',
    'Expert guidance & consulting',
    'Priority support',
    'Scheme comparison tools',
  ],
};

export default function PaymentPage() {
  const { completePayment, isLoading } = useMsmeAuth();

  const handlePayment = async () => {
    const success = await completePayment();
    if (success) {
      toast.success('Welcome! You can now explore schemes');
    }
  };

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 justify-center max-w-lg mx-auto w-full"
    >
      <div className="mb-8">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Activate your account
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          A one-time registration to unlock unlimited access to government schemes.
        </p>
      </div>

      {/* Plan card */}
      <div className="relative rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 bg-white dark:bg-[#162048] p-6 shadow-[0_10px_40px_rgba(79,70,229,0.12)]">
        <div className="absolute -top-3 left-6">
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
            Most Popular
          </span>
        </div>

        <div className="pt-2">
          <h3 className="text-xl font-bold text-[#0a1628] dark:text-[#e6edf7]">{PLAN.name}</h3>
          <p className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8] mt-0.5">{PLAN.description}</p>
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-[#0a1628] dark:text-[#e6edf7]">{PLAN.price}</span>
          <span className="text-[#4a5d73] dark:text-[#94a3b8]">{PLAN.period}</span>
        </div>

        <ul className="mt-5 space-y-2.5">
          {PLAN.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-px" />
              <span className="text-[14px] text-[#0a1628]/90 dark:text-[#e6edf7]/90">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <TravelingBorderButton
            onClick={handlePayment}
            disabled={isLoading}
            solid
            showIcon={!isLoading}
            className="w-full py-3.5 text-[15px] rounded-[10px]"
          >
            {isLoading ? (
              <div className="flex justify-center items-center w-full h-full">
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              </div>
            ) : (
              <span>Proceed to Payment</span>
            )}
          </TravelingBorderButton>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-[#4a5d73] dark:text-[#94a3b8]">
        <Lock className="h-[13px] w-[13px] text-indigo-600" />
        Your payment is secure and encrypted
      </div>
    </AuthShell>
  );
}
