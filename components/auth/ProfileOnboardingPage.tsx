'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import { OnboardingLogoutButton } from '@/components/auth/onboarding-logout-button';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { fieldWrapperClass, fieldInputClass } from '@/components/ui/underline-field';
import { UnderlineSelect } from '@/components/ui/underline-select';
import {
  MissingField,
  REQUIRED_SEARCH_FIELDS,
  BUSINESS_IDENTITY_FIELDS,
  IDENTITY_SOURCE_MAP,
  getMissingFields,
  isManualBusiness,
  buildEligibilityDbPayload,
  buildBusinessIdentityPayload,
  lookupPincode,
} from '@/lib/eligibilityFields';
import { toast } from 'sonner';
import { Loader2, ClipboardList } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Dedicated, full-page profile onboarding (its own route) that collects every
 * detail still missing for scheme matching. Living on its own URL means a refresh
 * resumes here instead of slipping through to the dashboard.
 */
export default function ProfileOnboardingPage() {
  const { token, mobile, continueToDashboard } = useMsmeAuth();
  const [fields, setFields] = useState<MissingField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  // Business identity / address fields shown only for no-GSTIN (manual) profiles.
  const [identityFields, setIdentityFields] = useState<typeof BUSINESS_IDENTITY_FIELDS>([]);
  const [identityValues, setIdentityValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Work out which fields are still missing for this business.
  useEffect(() => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    const mobileNumber = mobile || sessionStorage.getItem('msme_mobile');
    if (!authToken || !mobileNumber) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        const profile = data?.user || {};
        const missing = getMissingFields(profile);

        // No-GSTIN profile → also collect the business identity/address that the
        // GST API would normally auto-fill. Only surface the section while a
        // REQUIRED identity field is still missing; prefill anything on record.
        let identity: typeof BUSINESS_IDENTITY_FIELDS = [];
        if (isManualBusiness(profile)) {
          const requiredMissing = BUSINESS_IDENTITY_FIELDS.some(
            (f) => !f.optional && !IDENTITY_SOURCE_MAP[f.key]?.(profile),
          );
          if (requiredMissing) {
            identity = BUSINESS_IDENTITY_FIELDS;
            const prefill: Record<string, string> = {};
            for (const f of identity) {
              const existing = IDENTITY_SOURCE_MAP[f.key]?.(profile);
              if (existing) prefill[f.key] = String(existing);
            }
            setIdentityValues(prefill);
            setIdentityFields(identity);
          }
        }

        if (missing.length === 0 && identity.length === 0) {
          // Nothing to ask — go straight to the dashboard.
          continueToDashboard();
          return;
        }
        // The identity section already collects State (auto-filled from pincode),
        // so drop the duplicate State field from the matching section.
        setFields(identity.length > 0 ? missing.filter((f) => f.key !== 'state') : missing);
      } catch {
        // On failure, fall back to the full required set so the user isn't stuck.
        setFields(REQUIRED_SEARCH_FIELDS);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allFilled = useMemo(
    () =>
      fields.every((f) => (values[f.key] ?? '').toString().trim() !== '') &&
      identityFields.every((f) => f.optional || (identityValues[f.key] ?? '').toString().trim() !== '') &&
      (fields.length > 0 || identityFields.length > 0),
    [fields, values, identityFields, identityValues],
  );

  const handleChange = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const [pincodeLoading, setPincodeLoading] = useState(false);

  const handleIdentityChange = (key: string, value: string) => {
    if (key === 'principalPincode') {
      const pin = value.replace(/\D/g, '').slice(0, 6);
      setIdentityValues((prev) => ({ ...prev, principalPincode: pin }));
      // Auto-fill City / District / State once a full 6-digit pincode is entered.
      if (pin.length === 6) {
        setPincodeLoading(true);
        lookupPincode(pin)
          .then((loc) => {
            if (loc) {
              setIdentityValues((prev) => ({
                ...prev,
                principalCity: loc.city,
                principalDistrict: loc.district,
                principalState: loc.state,
              }));
            } else {
              toast.error('Could not find that pincode — please fill City/District/State manually.');
            }
          })
          .finally(() => setPincodeLoading(false));
      }
      return;
    }
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.filter((f) => !(values[f.key] ?? '').toString().trim());
    const missingIdentity = identityFields.filter(
      (f) => !f.optional && !(identityValues[f.key] ?? '').toString().trim(),
    );
    if (missing.length > 0 || missingIdentity.length > 0) {
      toast.error(
        `Please fill in: ${[...missing, ...missingIdentity].map((f) => f.label).join(', ')}`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const authToken = token || sessionStorage.getItem('msme_auth_token');
      const dbPayload = {
        ...buildEligibilityDbPayload(values),
        ...buildBusinessIdentityPayload(identityValues),
      };
      const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(dbPayload),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to save profile');
      }
      toast.success('Profile completed!');
      // Profile is complete → enter the dashboard (analysis is gated/locked there).
      continueToDashboard();
    } catch (err) {
      console.error('Profile onboarding save failed:', err);
      toast.error('Failed to save your details. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
      headerSlot={<OnboardingLogoutButton />}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-16 md:py-12 justify-center max-w-5xl mx-auto w-full"
    >
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
          <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Complete your profile
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          A few more details about your business so we can match you with the right
          government schemes. This takes less than a minute.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#4a5d73] dark:text-[#94a3b8]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your details…
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Business identity / address — only for no-GSTIN profiles */}
          {identityFields.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[15px] font-bold text-[#0a1628] dark:text-[#e6edf7] mb-1">
                Business details
              </h2>
              <p className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8] mb-5">
                We couldn&apos;t auto-fill these from GST records. Enter your pincode and
                we&apos;ll fill in City, District &amp; State for you.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 items-stretch">
                {identityFields.map((field) => {
                  const isPincode = field.key === 'principalPincode';
                  return (
                    <div key={field.key} className="flex flex-col h-full">
                      <label className="flex items-center gap-1.5 text-[12px] font-medium text-black dark:text-[#94a3b8] mb-1.5">
                        {field.label} {field.optional ? '' : '*'}
                        {field.auto && (
                          <span className="text-[10px] font-normal text-indigo-500 dark:text-indigo-400">
                            auto-filled from pincode
                          </span>
                        )}
                        {isPincode && pincodeLoading && (
                          <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                        )}
                      </label>
                      <div className={`mt-auto ${fieldWrapperClass()}`}>
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          inputMode={isPincode ? 'numeric' : undefined}
                          maxLength={isPincode ? 6 : undefined}
                          placeholder={field.auto ? 'Enter pincode above' : `Enter ${field.label}`}
                          value={identityValues[field.key] || ''}
                          onChange={(e) => handleIdentityChange(field.key, e.target.value)}
                          className={`${fieldInputClass} placeholder:text-black dark:placeholder:text-[#94a3b8]`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {fields.length > 0 && identityFields.length > 0 && (
            <h2 className="text-[15px] font-bold text-[#0a1628] dark:text-[#e6edf7] mb-4">
              Scheme matching details
            </h2>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 items-stretch">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col h-full">
                <label className="block text-[12px] font-medium text-black dark:text-[#94a3b8] mb-1.5">{field.label} *</label>
                {field.type === 'select' && field.options ? (
                  <UnderlineSelect
                    className="mt-auto"
                    value={values[field.key] || ''}
                    onChange={(v) => handleChange(field.key, v)}
                    options={field.options}
                    placeholder={`Select ${field.label}`}
                  />
                ) : (
                  <div className={`mt-auto ${fieldWrapperClass()}`}>
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      placeholder={`Enter ${field.label}`}
                      value={values[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={`${fieldInputClass} placeholder:text-black dark:placeholder:text-[#94a3b8]`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 sm:max-w-xs">
            <TravelingBorderButton
              type="submit"
              disabled={submitting || !allFilled}
              showIcon={!submitting}
              className="w-full py-3.5 text-[15px] rounded-[10px]"
            >
              {submitting ? (
                <div className="flex justify-center items-center w-full h-full">
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                </div>
              ) : (
                <span>Continue to Dashboard</span>
              )}
            </TravelingBorderButton>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
