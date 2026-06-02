'use client';

import { useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { UnderlineField, fieldLabelClass } from '@/components/ui/underline-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export default function PanVerificationPage() {
  const { setPanAndProfile, userId, isLoading, error, pendingBusinessId, businesses } = useMsmeAuth();
  // isAddingAnother: user already has at least one business, so this is an additional one.
  // No longer relies on pendingBusinessId since we don't pre-create the row.
  const isAddingAnother = (businesses?.filter(b => b.panVerified)?.length || 0) > 0;
  const [pan, setPan] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [state, setState] = useState('');

  const [verifyingPan, setVerifyingPan] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panData, setPanData] = useState<any>(null);
  const [verifiedBusinessId, setVerifiedBusinessId] = useState<number | null>(null);
  const [panError, setPanError] = useState<string | null>(null);

  const handlePanVerify = async () => {
    if (!pan || pan.length !== 10) {
      toast.error('Please enter a valid 10-character PAN');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setPanError(null);
    setVerifyingPan(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/msme-auth/verify-pan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('msme_auth_token')}`,
        },
        body: JSON.stringify({
          pan: pan.toUpperCase(),
          userId,
          // When adding another business, tell the backend to create a fresh row
          // only after PAN verification succeeds (no pre-created placeholder).
          ...(isAddingAnother
            ? { createNew: true }
            : { businessId: pendingBusinessId ?? undefined }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPanData(data.data);
        setPanVerified(true);
        setPanError(null);
        if (data.businessId) setVerifiedBusinessId(Number(data.businessId));

        if (data.data.legalNameOfBusiness) setName(data.data.legalNameOfBusiness);
        if (data.data.principalState) setState(data.data.principalState);
        if (data.data.constitutionOfBusiness) {
          const constitutionMap: Record<string, string> = {
            'Private Limited Company': 'pvt-ltd',
            'Public Limited Company': 'public-ltd',
            'Limited Liability Partnership': 'llp',
            'Partnership': 'partnership',
            'Proprietorship': 'sole-proprietor',
            'Sole Proprietor': 'sole-proprietor',
          };
          setBusinessType(constitutionMap[data.data.constitutionOfBusiness] || '');
        }

        toast.success('PAN verified successfully');
      } else {
        // 409 Conflict = duplicate PAN; surface as inline error, not just toast
        const msg: string = data.message || 'PAN verification failed';
        const isDuplicate = response.status === 409 || msg.toLowerCase().includes('already added');

        setPanError(isDuplicate
          ? 'This PAN is already registered under your profile. Each business must have a unique PAN.'
          : msg
        );

        if (!isDuplicate) toast.error(msg);
      }
    } catch (err) {
      console.error('PAN verification error:', err);
      const msg = 'Failed to connect to verification service. Please try again.';
      setPanError(msg);
      toast.error(msg);
    } finally {
      setVerifyingPan(false);
    }
  };

  const handleSubmit = async () => {
    if (!panVerified) {
      toast.error('Please verify your PAN first');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    const success = await setPanAndProfile(pan, { name, email, businessType, state }, userId, verifiedBusinessId ?? pendingBusinessId);

    if (success) {
      toast.success('Profile verified successfully');
    } else {
      toast.error(error || 'Verification failed');
    }
  };

  const details: { label: string; value?: string }[] = panData
    ? [
        { label: 'Legal Name', value: panData.legalNameOfBusiness },
        { label: 'Constitution', value: panData.constitutionOfBusiness },
        { label: 'State', value: panData.principalState },
        { label: 'GSTIN', value: panData.gstin },
      ].filter((d) => d.value)
    : [];

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 md:py-16 justify-center max-w-2xl mx-auto w-full"
    >
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          {isAddingAnother ? 'Add a Business' : 'Verify Your Details'}
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          {isAddingAnother
            ? 'Enter the PAN of the business you want to add'
            : 'Enter your PAN number to auto-fill your business details'}
        </p>
      </div>

      <div className="space-y-8">
        {/* PAN + verify */}
        <UnderlineField
          label="PAN"
          required
          placeholder="ABCDE1234F"
          value={pan}
          onChange={(v) => { setPan(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)); setPanError(null); }}
          disabled={isLoading || panVerified || verifyingPan}
          maxLength={10}
          rightSlot={
            panVerified ? (
              <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
            ) : (
              <button
                type="button"
                onClick={handlePanVerify}
                disabled={verifyingPan || pan.length !== 10}
                className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {verifyingPan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
              </button>
            )
          }
        />

        {/* PAN duplicate / error banner */}
        {panError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-red-700 dark:text-red-400 leading-snug">
                {panError}
              </p>
              {panError.toLowerCase().includes('already registered') && (
                <p className="text-[12px] text-red-600/80 dark:text-red-400/70 mt-1">
                  Check your saved businesses on the Profile page, or use a different PAN to add a new business.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Auto-filled details */}
        {panVerified && details.length > 0 && (
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

        {/* Email (new user only) */}
        {panVerified && !isAddingAnother && (
          <UnderlineField
            label="Email"
            required
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={setEmail}
            disabled={isLoading}
          />
        )}

        {error && <p className="text-[11px] text-red-500">{error}</p>}

        <TravelingBorderButton
          onClick={handleSubmit}
          disabled={!panVerified || isLoading || (!isAddingAnother && !email.includes('@'))}
          className="w-full py-3.5 text-[15px] rounded-[10px]"
          showIcon={!isLoading}
        >
          {isLoading ? (
            <div className="flex justify-center items-center w-full h-full">
              <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            </div>
          ) : (
            <span>Continue to Payment</span>
          )}
        </TravelingBorderButton>
      </div>
    </AuthShell>
  );
}
