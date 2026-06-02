'use client';

import { useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { toast } from 'sonner';
import { CheckCircle2, RefreshCw, Building2, MapPin, User, Info } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function ProfileSummaryPage() {
  const {
    existingProfile,
    isLoading,
    error,
    continueToDashboard,
    initiateDataRefresh,
    completeDataRefresh,
  } = useMsmeAuth();

  const [refreshed, setRefreshed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const order = await initiateDataRefresh();
      if (!order) {
        toast.error(error || 'Failed to create payment order');
        return;
      }

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(script);
        });
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount * 100,
        currency: order.currency,
        order_id: order.orderId,
        name: 'MSME Scheme Discovery',
        description: 'Refresh PAN data',
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const success = await completeDataRefresh(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          if (success) {
            toast.success('Data refreshed successfully!');
            setRefreshed(true);
          } else {
            toast.error(error || 'Data refresh failed after payment');
          }
          setIsRefreshing(false);
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled');
            setIsRefreshing(false);
          },
        },
        theme: { color: '#6366f1' },
      });

      rzp.open();
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Something went wrong. Please try again.');
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const Field = ({ label, value, span }: { label: string; value: string | number | null | undefined; span?: boolean }) => (
    <div className={`space-y-0.5 ${span ? 'col-span-2 md:col-span-3' : ''}`}>
      <p className="text-[12px] text-[#4a5d73] dark:text-[#94a3b8]">{label}</p>
      <p className="text-[14px] font-semibold text-[#0a1628] dark:text-[#e6edf7] break-words">{value || 'N/A'}</p>
    </div>
  );

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
    </div>
  );

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-10 lg:px-14 md:py-12 max-w-4xl mx-auto w-full"
    >
      <div className="mb-8">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Welcome Back!
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Here is your business profile on record.
          {existingProfile?.lastDataRefreshAt && (
            <> Last updated: <span className="font-semibold text-[#0a1628] dark:text-[#e6edf7]">{formatDate(existingProfile.lastDataRefreshAt)}</span></>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#162048] p-6 space-y-6">
        <Section icon={<User className="w-4 h-4" />} title="Identity">
          <Field label="Name" value={existingProfile?.name} />
          <Field label="Mobile" value={existingProfile?.mobileNumber} />
          <Field label="Email" value={existingProfile?.email} />
          <Field label="PAN Number" value={existingProfile?.panNumber} />
        </Section>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <Section icon={<Building2 className="w-4 h-4" />} title="Business">
          <Field label="Legal Name" value={existingProfile?.legalNameOfBusiness} />
          <Field label="Trade Name" value={existingProfile?.tradeNameOfBusiness} />
          <Field label="GSTIN" value={existingProfile?.gstin} />
          <Field label="Constitution" value={existingProfile?.constitutionOfBusiness} />
          <Field label="Taxpayer Type" value={existingProfile?.taxpayerType} />
          <Field label="GSTIN Status" value={existingProfile?.gstinStatus} />
          <Field label="Business Type" value={existingProfile?.businessType} />
          <Field label="Business Sector" value={existingProfile?.businessSector} />
          <Field label="Enterprise Category" value={existingProfile?.enterpriseCategory} />
          <Field label="Annual Turnover (₹L)" value={existingProfile?.annualTurnoverLakhs} />
          <Field label="Years in Operation" value={existingProfile?.yearsInOperation} />
          <Field label="Registration Date" value={existingProfile?.registrationDate} />
        </Section>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <Section icon={<MapPin className="w-4 h-4" />} title="Address">
          <Field label="Principal Address" value={existingProfile?.principalAddress} span />
          <Field label="City" value={existingProfile?.principalCity} />
          <Field label="District" value={existingProfile?.principalDistrict} />
          <Field label="State" value={existingProfile?.principalState} />
          <Field label="Pincode" value={existingProfile?.principalPincode} />
        </Section>

        {refreshed && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <div className="flex items-center gap-2 text-[13px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Profile data has been refreshed with the latest information.
            </div>
          </>
        )}
      </div>

      {!refreshed && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Only fetch the latest data if your details have recently changed on your
            GST account, or if this information looks very old. Each refresh is a
            paid update, so there&apos;s no need to refresh if everything above is
            already correct.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 mt-4">
        {!refreshed && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2.5 text-[13px] font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-px hover:shadow-md hover:shadow-indigo-500/20 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {/* "New" sticker overlay */}
            {!(isRefreshing || isLoading) && (
              <span className="pointer-events-none absolute -top-2.5 -left-2.5 z-10">
                <span className="relative flex">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-70 animate-ping" />
                  <span className="relative inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-md ring-2 ring-white dark:ring-[#0a1628] -rotate-12">
                    New
                  </span>
                </span>
              </span>
            )}

            {isRefreshing || isLoading ? (
              <><div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> Processing…</>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />
                Fetch Latest Details (₹{existingProfile?.refreshPrice ?? 49})
              </>
            )}
          </button>
        )}

        <TravelingBorderButton
          onClick={continueToDashboard}
          disabled={isRefreshing || isLoading}
          solid
          showIcon={false}
          className="px-5 py-2.5 text-[14px] rounded-lg"
        >
          {refreshed ? 'Go to Dashboard' : 'Continue with Existing Details'}
        </TravelingBorderButton>
      </div>

      {error && <p className="text-[11px] text-red-500 text-center mt-4">{error}</p>}
    </AuthShell>
  );
}
