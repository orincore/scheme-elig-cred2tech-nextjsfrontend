'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { PhoneInput } from '@/components/ui/phone-input';
import { fieldLabelClass } from '@/components/ui/underline-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function DemoLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    await delay(1600);
    router.push('/demo/otp');
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
            countryCode="+91"
            phoneNumber="8830948511"
            onCountryCodeChange={() => {}}
            onPhoneNumberChange={() => {}}
            onBlur={() => {}}
            error={false}
          />
          <p className="text-[12px] text-[#4a5d73] dark:text-[#94a3b8] mt-2">
            We&apos;ll send an OTP to verify your number
          </p>
        </div>
      </div>

      <TravelingBorderButton
        onClick={handleContinue}
        disabled={loading}
        className="w-full py-3.5 text-[15px] rounded-[10px]"
        showIcon={!loading}
      >
        {loading ? (
          <div className="flex justify-center items-center w-full h-full">
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          </div>
        ) : (
          <span>Continue</span>
        )}
      </TravelingBorderButton>

      <p className="mt-6 text-center text-[11px] text-[#4a5d73] dark:text-[#94a3b8] opacity-60">
        Demo account · Adarsh Suradkar
      </p>
    </AuthShell>
  );
}
