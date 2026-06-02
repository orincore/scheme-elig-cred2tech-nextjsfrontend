'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { PhoneInput } from '@/components/ui/phone-input';
import { fieldLabelClass } from '@/components/ui/underline-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { validateMobile } from '@/lib/validators';
import { toast } from 'sonner';
import { Briefcase, Shield } from 'lucide-react';

export default function LoginPage() {
  const { sendOtp, isLoading } = useMsmeAuth();
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobileState] = useState('');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const err = validateMobile(mobile, countryCode);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    const success = await sendOtp(mobile);
    if (success) {
      toast.success('OTP sent to your mobile number');
    } else {
      toast.error('Failed to send OTP. Please try again.');
    }
  };

  return (
    <AuthShell brand={<MsmeAuthBrand />}>
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Sign in to continue
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Enter your mobile number to get started
        </p>
      </div>

      <div className="space-y-8 mb-8">
        <div>
          <label className={fieldLabelClass}>Mobile Number *</label>
          <PhoneInput
            countryCode={countryCode}
            phoneNumber={mobile}
            onCountryCodeChange={(code) => { setCountryCode(code); setError(''); }}
            onPhoneNumberChange={(digits) => { setMobileState(digits); setError(''); }}
            onBlur={() => setError(validateMobile(mobile, countryCode))}
            error={!!error}
          />
          {error ? (
            <span className="text-[11px] text-red-500 mt-1.5 block">{error}</span>
          ) : (
            <p className="text-[12px] text-[#4a5d73] dark:text-[#94a3b8] mt-2">
              We&apos;ll send an OTP to verify your number
            </p>
          )}
        </div>
      </div>

      <TravelingBorderButton
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full py-3.5 text-[15px] rounded-[10px]"
        showIcon={!isLoading}
      >
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full">
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          </div>
        ) : (
          <span>Continue</span>
        )}
      </TravelingBorderButton>

      {/* Portal links */}
      <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[12px] text-[#4a5d73] dark:text-[#94a3b8] text-center mb-3">
          Are you an Agent or Admin?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/agent/login"
            className="flex items-center justify-center gap-2 rounded-[10px] border border-gray-200 dark:border-gray-700 py-2.5 text-[13px] font-semibold text-[#0a1628] dark:text-[#e6edf7] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Agent Portal
          </Link>
          <Link
            href="/admin/login"
            className="flex items-center justify-center gap-2 rounded-[10px] border border-gray-200 dark:border-gray-700 py-2.5 text-[13px] font-semibold text-[#0a1628] dark:text-[#e6edf7] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Admin Portal
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-[#4a5d73] dark:text-[#94a3b8]">
        <Shield className="h-[13px] w-[13px] text-indigo-600" />
        256-bit encryption · Your data stays private
      </div>
    </AuthShell>
  );
}
