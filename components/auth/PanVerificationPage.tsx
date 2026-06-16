'use client';

import { useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { OnboardingLogoutButton } from '@/components/auth/onboarding-logout-button';
import { UnderlineField, fieldLabelClass } from '@/components/ui/underline-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { consentApi } from '@/lib/services/api';

// CICRA: the borrower must consent before any credit information is collected.
// This is the exact wording stored in the consent ledger for audit evidence.
const CONSENT_TEXT =
  'I authorize Cred2Tech to collect, verify and process my business and credit ' +
  'information for the purpose of assessing my eligibility for financial schemes. ' +
  'I understand this consent is valid for 180 days, after which my credit ' +
  'information will be purged unless I renew consent, and that I may withdraw it ' +
  'at any time.';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export default function PanVerificationPage() {
  const { setPanAndProfile, userId, isLoading, error, pendingBusinessId, businesses } = useMsmeAuth();
  // isAddingAnother: user already has at least one business, so this is an additional one.
  // No longer relies on pendingBusinessId since we don't pre-create the row.
  const isAddingAnother = (businesses?.filter(b => b.panVerified)?.length || 0) > 0;
  const [pan, setPan] = useState('');
  // The person's own name (kept distinct from the business name fetched from PAN).
  const [personalName, setPersonalName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [state, setState] = useState('');
  // True when the PAN has no linked GST profile, so business details must be
  // entered manually (auto-fallback path).
  const [manualEntry, setManualEntry] = useState(false);

  // CICRA consent gate — PAN verification collects credit information, which the
  // backend blocks (403 CONSENT_REQUIRED) until a valid consent exists.
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentRecorded, setConsentRecorded] = useState(false);

  const [verifyingPan, setVerifyingPan] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panData, setPanData] = useState<any>(null);
  const [verifiedBusinessId, setVerifiedBusinessId] = useState<number | null>(null);
  const [panError, setPanError] = useState<string | null>(null);
  // Set when the PAN already exists on a DIFFERENT profile — we ask the user to
  // confirm before adding it to this account.
  const [duplicatePrompt, setDuplicatePrompt] = useState<string | null>(null);

  const handlePanVerify = async (confirmDuplicatePan = false) => {
    if (!pan || pan.length !== 10) {
      toast.error('Please enter a valid 10-character PAN');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    if (!consentChecked) {
      setPanError('Please provide consent to collect your credit information before verifying.');
      return;
    }

    setPanError(null);
    setVerifyingPan(true);
    try {
      // Record consent BEFORE collecting any credit data (CICRA). Idempotent
      // enough for onboarding — we only call it once per flow. If it fails the
      // backend would reject verify-pan anyway, so surface and stop.
      if (!consentRecorded) {
        const consentRes = await consentApi.grant(CONSENT_TEXT);
        if (!consentRes?.success) {
          setVerifyingPan(false);
          setPanError('Could not record your consent. Please try again.');
          return;
        }
        setConsentRecorded(true);
      }

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
          // Set after the user confirms they want to add a PAN that already
          // exists on a different profile.
          ...(confirmDuplicatePan ? { confirmDuplicatePan: true } : {}),
        }),
      });

      const data = await response.json();

      // Defensive: backend rejected for missing/expired consent. Record consent
      // and let the user retry (the checkbox is already ticked at this point).
      if (response.status === 403 && data.error === 'CONSENT_REQUIRED') {
        setConsentRecorded(false);
        setVerifyingPan(false);
        setPanError('Your consent could not be verified. Please ensure the consent box is ticked and try again.');
        return;
      }

      // PAN exists on another profile → ask the user to confirm, then retry.
      if (data.requiresPanConfirmation) {
        setDuplicatePrompt(data.message || 'This PAN is already registered on a different profile. Do you still want to add it?');
        return;
      }

      if (data.success) {
        setPanVerified(true);
        setPanError(null);
        if (data.businessId) setVerifiedBusinessId(Number(data.businessId));

        // No-GSTIN fallback: the PAN is valid but has no linked GST business
        // profile. Capture the holder's name and let them fill in the rest.
        if (data.manualEntryRequired) {
          setManualEntry(true);
          setPanData(null);
          if (data.data?.personalName) setPersonalName(data.data.personalName);
          toast.success('PAN verified. Please add your business details below.');
        } else {
          setManualEntry(false);
          setPanData(data.data);
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
        }
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

    const success = await setPanAndProfile(
      pan,
      {
        // Keep `name` populated locally with the personal name as a fallback for
        // any reader; the backend stores the personal name separately.
        name: personalName,
        personalName,
        email,
        businessType,
        state,
      },
      userId,
      verifiedBusinessId ?? pendingBusinessId,
    );

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
      headerSlot={<OnboardingLogoutButton />}
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
        {/* CICRA consent gate — must be ticked before PAN/credit data is collected */}
        {!panVerified && (
          <label className="flex items-start gap-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => { setConsentChecked(e.target.checked); setPanError(null); }}
              disabled={verifyingPan}
              className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600 cursor-pointer"
            />
            <span className="text-[12.5px] leading-snug text-[#4a5d73] dark:text-[#94a3b8]">
              {CONSENT_TEXT}
            </span>
          </label>
        )}

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
                onClick={() => handlePanVerify()}
                disabled={verifyingPan || pan.length !== 10 || !consentChecked}
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

        {/* No-GSTIN notice: PAN valid but no linked GST profile → manual entry */}
        {panVerified && manualEntry && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-700 dark:text-amber-400 leading-snug">
              We couldn&apos;t find GST records for this PAN. No problem — we&apos;ll ask
              for your business name, address and a few more details on the next step.
            </p>
          </div>
        )}

        {/* Your name (personal) — collected on both paths */}
        {panVerified && (
          <UnderlineField
            label="Your Name"
            placeholder="Name as per PAN"
            value={personalName}
            onChange={setPersonalName}
            disabled={isLoading}
          />
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
            <span>Continue</span>
          )}
        </TravelingBorderButton>
      </div>

      {/* PAN-already-on-another-profile confirmation */}
      <AlertDialog open={!!duplicatePrompt} onOpenChange={(o) => { if (!o) setDuplicatePrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> PAN already on another profile
            </AlertDialogTitle>
            <AlertDialogDescription>
              {duplicatePrompt}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={verifyingPan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setDuplicatePrompt(null); handlePanVerify(true); }}
              disabled={verifyingPan}
            >
              Yes, add it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthShell>
  );
}
