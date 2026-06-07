'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import {
  MissingField,
  REQUIRED_SEARCH_FIELDS,
  getMissingFields,
  buildEligibilityDbPayload,
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
        if (missing.length === 0) {
          // Nothing to ask — go straight to the dashboard.
          continueToDashboard();
          return;
        }
        setFields(missing);
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
    () => fields.length > 0 && fields.every((f) => (values[f.key] ?? '').toString().trim() !== ''),
    [fields, values],
  );

  const handleChange = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.filter((f) => !(values[f.key] ?? '').toString().trim());
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const authToken = token || sessionStorage.getItem('msme_auth_token');
      const dbPayload = buildEligibilityDbPayload(values);
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
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 md:py-12 justify-center max-w-2xl mx-auto w-full"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[#0a1628] dark:text-[#e6edf7]">
                  {field.label}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                {field.type === 'select' && field.options ? (
                  <select
                    value={values[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-white dark:bg-[#162048] border border-gray-200 dark:border-gray-700 text-[#0a1628] dark:text-[#e6edf7] text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={`Enter ${field.label}`}
                    value={values[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-white dark:bg-[#162048] border border-gray-200 dark:border-gray-700 text-[#0a1628] dark:text-[#e6edf7] text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
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
