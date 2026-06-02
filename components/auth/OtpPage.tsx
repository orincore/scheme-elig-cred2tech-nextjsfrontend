'use client';

import { useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { fieldLabelClass } from '@/components/ui/underline-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { toast } from 'sonner';
import { Check, ChevronLeft } from 'lucide-react';

export default function OtpPage() {
  const { mobile, verifyOtp, isLoading, error } = useMsmeAuth();
  const [otp, setOtp] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [resendTimer, setResendTimer] = useState(0);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 4) {
      toast.error('Please enter a valid 4-digit OTP');
      return;
    }
    setState('loading');
    const success = await verifyOtp(otp);
    if (success) {
      setState('success');
      toast.success('OTP verified successfully');
    } else {
      setState('idle');
      toast.error(error || 'OTP verification failed');
    }
  };

  const handleResendOtp = () => {
    toast.success('OTP resent to your mobile number');
    setResendTimer(30);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const loading = isLoading || state === 'loading';

  return (
    <AuthShell brand={<MsmeAuthBrand />}>
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Verify OTP
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          We&apos;ve sent a 4-digit code to{' '}
          <span className="font-semibold text-[#0a1628] dark:text-[#e6edf7]">+91 {mobile}</span>
        </p>
      </div>

      <div className="mb-8">
        <label className={fieldLabelClass}>OTP Code *</label>
        <div className={`pb-3 border-b transition-colors ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400'}`}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="••••"
            maxLength={4}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            disabled={loading}
            className="w-full bg-transparent border-0 outline-none text-center text-[28px] tracking-[0.5em] font-bold text-[#0a1628] dark:text-[#e6edf7] p-0 focus:ring-0 placeholder-gray-300 dark:placeholder-gray-700"
          />
        </div>
        {error && <span className="text-[11px] text-red-500 mt-1.5 block">{error}</span>}
      </div>

      <TravelingBorderButton
        onClick={handleVerifyOtp}
        disabled={loading || otp.length !== 4}
        className="w-full py-3.5 text-[15px] rounded-[10px]"
        showIcon={state === 'idle'}
      >
        {loading ? (
          <div className="flex justify-center items-center w-full h-full">
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          </div>
        ) : state === 'success' ? (
          <div className="flex items-center justify-center gap-2 w-full h-full">
            <Check className="h-[18px] w-[18px]" />
            <span>Verified</span>
          </div>
        ) : (
          <span>Verify OTP</span>
        )}
      </TravelingBorderButton>

      <div className="mt-8 text-center">
        <p className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8] mb-2">Didn&apos;t receive the code?</p>
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resendTimer > 0}
          className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 text-[13px] text-[#4a5d73] dark:text-[#94a3b8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Change mobile number
        </button>
      </div>
    </AuthShell>
  );
}
