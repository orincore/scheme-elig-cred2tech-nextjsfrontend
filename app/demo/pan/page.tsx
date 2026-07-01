'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { UnderlineField, fieldLabelClass } from '@/components/ui/underline-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { CheckCircle2, Loader2 } from 'lucide-react';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const DEMO_PAN_DATA = {
  pan: 'ADPPS1234A',
  personalName: 'Adarsh Suradkar',
  email: 'adarsh.suradkar@gmail.com',
  legalNameOfBusiness: 'Suradkar Textiles Pvt. Ltd.',
  constitutionOfBusiness: 'Private Limited Company',
  principalState: 'Maharashtra',
  gstin: '27ADPPS1234A1ZP',
};

const CONSENT_TEXT =
  'I authorize Cred2Tech to collect, verify and process my business and credit ' +
  'information for the purpose of assessing my eligibility for financial schemes. ' +
  'I understand this consent is valid for 180 days, after which my credit ' +
  'information will be purged unless I renew consent, and that I may withdraw it ' +
  'at any time.';

type VerifyStep = 'idle' | 'fetching' | 'verified';

export default function DemoPanPage() {
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(true);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [verifyLabel, setVerifyLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async () => {
    setVerifyStep('fetching');
    setVerifyLabel('Connecting to GST network…');
    await delay(900);
    setVerifyLabel('Fetching GST records for PAN…');
    await delay(1100);
    setVerifyLabel('Validating business information…');
    await delay(800);
    setVerifyStep('verified');
  };

  const handleContinue = async () => {
    setSubmitting(true);
    await delay(1200);
    router.push('/demo/profile');
  };

  const details = [
    { label: 'Legal Name', value: DEMO_PAN_DATA.legalNameOfBusiness },
    { label: 'Constitution', value: DEMO_PAN_DATA.constitutionOfBusiness },
    { label: 'State', value: DEMO_PAN_DATA.principalState },
    { label: 'GSTIN', value: DEMO_PAN_DATA.gstin },
  ];

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 md:py-16 justify-center max-w-2xl mx-auto w-full"
    >
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Verify Your Details
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Enter your PAN number to auto-fill your business details
        </p>
      </div>

      <div className="space-y-8">
        {/* Consent */}
        {verifyStep === 'idle' && (
          <label className="flex items-start gap-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600 cursor-pointer"
            />
            <span className="text-[12.5px] leading-snug text-[#4a5d73] dark:text-[#94a3b8]">
              {CONSENT_TEXT}
            </span>
          </label>
        )}

        {/* PAN field */}
        <UnderlineField
          label="PAN"
          required
          placeholder="ABCDE1234F"
          value={DEMO_PAN_DATA.pan}
          onChange={() => {}}
          disabled={verifyStep !== 'idle'}
          maxLength={10}
          rightSlot={
            verifyStep === 'verified' ? (
              <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyStep === 'fetching' || !consentChecked}
                className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {verifyStep === 'fetching' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Verify'
                )}
              </button>
            )
          }
        />

        {/* Fetching status */}
        {verifyStep === 'fetching' && (
          <div className="flex items-center gap-3 text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500 shrink-0" />
            <span>{verifyLabel}</span>
          </div>
        )}

        {/* Auto-filled details */}
        {verifyStep === 'verified' && (
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
              Auto-filled Details
            </p>
            <div className="grid grid-cols-2 gap-4">
              {details.map((d) => (
                <div key={d.label} className="space-y-0.5">
                  <p className="text-[12px] text-[#4a5d73] dark:text-[#94a3b8]">{d.label}</p>
                  <p className="text-[14px] font-semibold text-[#0a1628] dark:text-[#e6edf7]">{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal name */}
        {verifyStep === 'verified' && (
          <UnderlineField
            label="Your Name"
            placeholder="Name as per PAN"
            value={DEMO_PAN_DATA.personalName}
            onChange={() => {}}
          />
        )}

        {/* Email */}
        {verifyStep === 'verified' && (
          <UnderlineField
            label="Email"
            required
            type="email"
            placeholder="your.email@example.com"
            value={DEMO_PAN_DATA.email}
            onChange={() => {}}
          />
        )}

        <TravelingBorderButton
          onClick={verifyStep === 'verified' ? handleContinue : handleVerify}
          disabled={
            verifyStep === 'fetching' ||
            submitting ||
            (verifyStep === 'idle' && !consentChecked)
          }
          className="w-full py-3.5 text-[15px] rounded-[10px]"
          showIcon={!submitting && verifyStep !== 'fetching'}
        >
          {submitting || verifyStep === 'fetching' ? (
            <div className="flex justify-center items-center w-full h-full">
              <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            </div>
          ) : verifyStep === 'verified' ? (
            <span>Continue</span>
          ) : (
            <span>Verify PAN</span>
          )}
        </TravelingBorderButton>
      </div>
    </AuthShell>
  );
}
