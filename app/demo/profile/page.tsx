'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { MsmeAuthBrand } from '@/components/auth/msme-auth-brand';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { fieldWrapperClass, fieldInputClass } from '@/components/ui/underline-field';
import { UnderlineSelect } from '@/components/ui/underline-select';
import { ClipboardList } from 'lucide-react';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const FIELDS = [
  { key: 'sector', label: 'Business Sector', type: 'select', options: [
    { value: 'textile', label: 'Textile & Apparel' },
    { value: 'manufacturing', label: 'Manufacturing' },
  ]},
  { key: 'msme_size', label: 'MSME Category', type: 'select', options: [
    { value: 'small', label: 'Small Enterprise' },
    { value: 'micro', label: 'Micro Enterprise' },
    { value: 'medium', label: 'Medium Enterprise' },
  ]},
  { key: 'annual_turnover', label: 'Annual Turnover (₹ Lakhs)', type: 'number' },
  { key: 'total_employees', label: 'Total Employees', type: 'number' },
  { key: 'business_type', label: 'Business Type / Constitution', type: 'select', options: [
    { value: 'pvt-ltd', label: 'Private Limited Company' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'sole-proprietor', label: 'Sole Proprietor' },
  ]},
  { key: 'business_stage', label: 'Business Stage', type: 'select', options: [
    { value: 'growth', label: 'Growth (2–5 years)' },
    { value: 'early', label: 'Early Stage (< 2 years)' },
    { value: 'mature', label: 'Mature / Established' },
  ]},
  { key: 'is_startup', label: 'DPIIT-recognised Startup?', type: 'select', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'udyam_registered', label: 'Udyam Registered?', type: 'select', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ]},
  { key: 'benefit_focus', label: 'Primary Benefit Interest', type: 'select', options: [
    { value: 'loan', label: 'Loan / Credit / Finance' },
    { value: 'subsidy', label: 'Subsidy / Grant' },
    { value: 'training', label: 'Training / Skill Development' },
    { value: 'technology', label: 'Technology Upgradation' },
  ]},
  { key: 'state', label: 'State', type: 'select', options: [
    { value: 'Maharashtra', label: 'Maharashtra' },
    { value: 'Gujarat', label: 'Gujarat' },
    { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  ]},
  { key: 'gender', label: 'Gender', type: 'select', options: [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
  ]},
  { key: 'caste', label: 'Social Category', type: 'select', options: [
    { value: 'OBC', label: 'OBC' },
    { value: 'General', label: 'General' },
    { value: 'SC', label: 'SC' },
    { value: 'ST', label: 'ST' },
  ]},
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'differently_abled', label: 'Differently Abled?', type: 'select', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'bpl', label: 'BPL Card Holder?', type: 'select', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'minority', label: 'Minority Community?', type: 'select', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
] as const;

type FieldKey = typeof FIELDS[number]['key'];

const DEMO_VALUES: Record<string, string> = {
  sector: 'textile',
  msme_size: 'small',
  annual_turnover: '85',
  total_employees: '45',
  business_type: 'pvt-ltd',
  business_stage: 'growth',
  is_startup: 'no',
  udyam_registered: 'yes',
  benefit_focus: 'loan',
  state: 'Maharashtra',
  gender: 'Male',
  caste: 'OBC',
  age: '38',
  differently_abled: 'no',
  bpl: 'no',
  minority: 'no',
};

export default function DemoProfilePage() {
  const router = useRouter();
  const [values] = useState<Record<string, string>>(DEMO_VALUES);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await delay(1800);
    router.push('/demo/dashboard');
  };

  return (
    <AuthShell
      brand={<MsmeAuthBrand />}
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 items-stretch">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col h-full">
              <label className="block text-[12px] font-medium text-black dark:text-[#94a3b8] mb-1.5">
                {field.label} *
              </label>
              {'options' in field && field.options ? (
                <UnderlineSelect
                  className="mt-auto"
                  value={values[field.key] || ''}
                  onChange={() => {}}
                  options={[...field.options]}
                  placeholder={`Select ${field.label}`}
                />
              ) : (
                <div className={`mt-auto ${fieldWrapperClass()}`}>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={`Enter ${field.label}`}
                    value={values[field.key] || ''}
                    onChange={() => {}}
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
            disabled={submitting}
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
    </AuthShell>
  );
}
