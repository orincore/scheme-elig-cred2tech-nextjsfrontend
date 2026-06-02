'use client';

import { useEffect } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { Building2, Plus, CheckCircle2, Briefcase } from 'lucide-react';

const CONSTITUTION_LABEL: Record<string, string> = {
  proprietorship: 'Proprietorship',
  partnership: 'Partnership',
  pvt_ltd: 'Private Limited',
  cooperative: 'Co-operative',
  ngo: 'Trust / NGO',
};

export default function AddBusinessPage() {
  const { businesses, refreshBusinesses, startAddBusiness, continueToDashboard, isLoading } = useMsmeAuth();

  useEffect(() => {
    refreshBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verified = businesses.filter((b) => b.panVerified);

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 justify-center max-w-xl mx-auto w-full"
    >
      <div className="mb-8">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Your businesses
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Add every business you own to discover schemes tailored to each one.
        </p>
      </div>

      {/* Business list */}
      <div className="space-y-3 mb-8">
        {verified.map((b, i) => (
          <div
            key={b.id}
            className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#162048] p-4 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#0a1628] dark:text-[#e6edf7] truncate">
                {b.legalNameOfBusiness || b.tradeNameOfBusiness || b.panNumber || 'Business'}
              </p>
              <p className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8] truncate">
                {b.panNumber}
                {b.constitutionOfBusiness ? ` · ${b.constitutionOfBusiness}` : b.businessType ? ` · ${CONSTITUTION_LABEL[b.businessType] || b.businessType}` : ''}
                {b.principalState || b.state ? ` · ${b.principalState || b.state}` : ''}
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          </div>
        ))}

        {verified.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-[14px] text-[#4a5d73] dark:text-[#94a3b8]">
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No businesses added yet.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={startAddBusiness}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-[10px] border border-gray-200 dark:border-gray-700 py-3 text-[14px] font-semibold text-[#0a1628] dark:text-[#e6edf7] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add another business
        </button>
        <TravelingBorderButton
          onClick={continueToDashboard}
          disabled={isLoading || verified.length === 0}
          solid
          className="flex-1 py-3 text-[15px] rounded-[10px] flex items-center justify-center"
        >
          Continue to dashboard
        </TravelingBorderButton>
      </div>

      <p className="text-center text-[11px] text-[#4a5d73] dark:text-[#94a3b8] mt-6">
        Each additional business requires a one-time verification payment.
      </p>
    </AuthShell>
  );
}
