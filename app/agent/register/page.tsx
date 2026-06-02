'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthStepper, type AuthStep } from '@/components/auth/auth-stepper';
import { UnderlineField, fieldLabelClass } from '@/components/ui/underline-field';
import { PasswordField } from '@/components/ui/password-field';
import { PasswordChecklist } from '@/components/ui/password-checklist';
import { UnderlineSelect } from '@/components/ui/underline-select';
import { PhoneInput } from '@/components/ui/phone-input';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { pincodeService } from '@/lib/pincodeService';
import {
  validateName,
  validateEmail,
  validateMobile,
  validatePincode,
  validatePassword,
  allPasswordRequirementsMet,
} from '@/lib/validators';
import { AlertCircle, ArrowLeft, Check, CheckCircle2 } from 'lucide-react';

const EXPERTISE_OPTIONS = [
  'Finance', 'MSME', 'Subsidies', 'Loans', 'Government Schemes',
  'Taxation', 'Legal', 'Consulting', 'Business Development', 'Marketing',
];

const AVAILABILITY_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'ON_LEAVE', label: 'On Leave' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const STEPS: AuthStep[] = [
  { num: 1, title: 'Your Details' },
  { num: 2, title: 'Location' },
  { num: 3, title: 'Expertise & Account' },
];

export default function AgentRegisterPage() {
  const { register } = useAgentAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneCountryCode: '+91',
    phone: '',
    password: '',
    confirmPassword: '',
    pincode: '',
    district: '',
    state: '',
    expertise: [] as string[],
    availability: 'AVAILABLE',
    certifications: '',
    gender: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);

  const set = (patch: Partial<typeof formData>) => setFormData((p) => ({ ...p, ...patch }));
  const clearErr = (field: string) => setErrors((p) => ({ ...p, [field]: '' }));

  const handlePincodeChange = async (raw: string) => {
    const pincode = raw.replace(/\D/g, '').slice(0, 6);
    set({ pincode });
    clearErr('pincode');
    setApiError('');

    if (pincode.length < 6) {
      set({ district: '', state: '' });
      return;
    }

    setIsFetchingPincode(true);
    try {
      let data = await pincodeService.getPincodeData(pincode);
      if (!data) data = pincodeService.getPincodeDataFallback(pincode);
      if (data) {
        set({ district: data.city, state: data.state });
        setErrors((p) => ({ ...p, pincode: '', state: '', city: '' }));
      } else {
        setErrors((p) => ({ ...p, pincode: 'Invalid pincode. Please check and try again.' }));
        set({ district: '', state: '' });
      }
    } catch {
      setErrors((p) => ({ ...p, pincode: 'Failed to fetch pincode data. Please try again.' }));
      set({ district: '', state: '' });
    } finally {
      setIsFetchingPincode(false);
    }
  };

  const handleExpertiseChange = (value: string) =>
    setFormData((p) => ({
      ...p,
      expertise: p.expertise.includes(value)
        ? p.expertise.filter((e) => e !== value)
        : [...p.expertise, value],
    }));

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      e.fullName = validateName(formData.fullName, 'Full name');
      e.email = validateEmail(formData.email);
      e.phone = validateMobile(formData.phone, formData.phoneCountryCode);
    }
    if (s === 2) {
      e.pincode = validatePincode(formData.pincode);
      if (!e.pincode && (!formData.district || !formData.state)) {
        e.pincode = 'Enter a valid pincode to autofill your location';
      }
    }
    if (s === 3) {
      if (formData.expertise.length === 0) e.expertise = 'Select at least one area of expertise';
      e.password = validatePassword(formData.password);
      if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    Object.keys(e).forEach((k) => { if (!e[k]) delete e[k]; });
    return e;
  };

  const validateField = (field: string) => {
    let msg = '';
    switch (field) {
      case 'fullName': msg = validateName(formData.fullName, 'Full name'); break;
      case 'email': msg = validateEmail(formData.email); break;
      case 'phone': msg = validateMobile(formData.phone, formData.phoneCountryCode); break;
      case 'pincode': msg = validatePincode(formData.pincode); break;
      case 'password': msg = validatePassword(formData.password); break;
      case 'confirmPassword':
        msg = !formData.confirmPassword
          ? 'Please confirm your password'
          : formData.password !== formData.confirmPassword
            ? 'Passwords do not match'
            : '';
        break;
    }
    setErrors((p) => ({ ...p, [field]: msg }));
  };

  const hasStepErrors = () => {
    if (step === 2) return isFetchingPincode;
    if (step === 3)
      return (
        formData.expertise.length === 0 ||
        !allPasswordRequirementsMet(formData.password) ||
        formData.password !== formData.confirmPassword
      );
    return false;
  };

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setApiError('');
    try {
      const region = `${formData.district}, ${formData.state}`;
      const ok = await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: `${formData.phoneCountryCode}${formData.phone.trim()}`,
        password: formData.password,
        region,
        expertise: formData.expertise,
        availability: formData.availability,
        certifications: formData.certifications.split(',').map((c) => c.trim()).filter(Boolean),
        gender: formData.gender,
      });
      if (ok) {
        setSuccess(true);
        setTimeout(() => router.push('/agent/login'), 2800);
      }
    } catch (err: any) {
      setApiError(err?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a1628] p-4 font-sans">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#0a1628] dark:text-[#e6edf7] mb-2">Registration Successful!</h2>
          <p className="text-[#4a5d73] dark:text-[#94a3b8] mb-1">
            Your application has been submitted and is pending admin approval.
          </p>
          <p className="text-sm text-[#4a5d73] dark:text-[#94a3b8]">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  const brand = (
    <>
      <AuthStepper steps={STEPS} current={step} />
      <div className="relative mt-auto h-40 w-full pointer-events-none">
        <div className="absolute bottom-[-3rem] left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 dark:from-indigo-900 via-transparent to-transparent opacity-60" />
      </div>
    </>
  );

  return (
    <AuthShell
      brand={brand}
      contentClassName="flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 md:py-16 max-w-3xl mx-auto w-full mt-4 md:mt-0"
    >
      {/* Back button */}
      {step > 1 ? (
        <button
          onClick={prevStep}
          type="button"
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-sm mb-8 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors w-fit"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
          {step === 2 && 'Your Details'}
          {step === 3 && 'Location'}
        </button>
      ) : (
        <div className="h-12 mb-8 hidden md:block" />
      )}

      {/* API error */}
      {apiError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{apiError}</span>
        </div>
      )}

      {/* Step titles */}
      <div className="mb-10">
        <h2 className="text-3xl md:text-[32px] font-bold text-[#0a1628] dark:text-[#e6edf7] mb-2">
          {step === 1 && 'Tell us about yourself'}
          {step === 2 && 'Where are you located?'}
          {step === 3 && 'Your expertise & account'}
        </h2>
        <p className="text-[15px] text-[#4a5d73] dark:text-[#94a3b8]">
          {step === 1 && 'Basic details so MSMEs and admins can reach you.'}
          {step === 2 && 'We use your location to route relevant cases to you.'}
          {step === 3 && 'Pick what you do best and secure your account.'}
        </p>
      </div>

      <form onSubmit={step === 3 ? handleSubmit : nextStep} className="flex-1 flex flex-col">
        <div className="flex-1">
          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              <UnderlineField
                className="md:col-span-2"
                label="Full Name"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.fullName}
                onChange={(v) => { set({ fullName: v }); clearErr('fullName'); }}
                onBlur={() => validateField('fullName')}
                error={errors.fullName}
              />
              <div>
                <label className={fieldLabelClass}>Gender</label>
                <UnderlineSelect
                  value={formData.gender}
                  onChange={(v) => set({ gender: v })}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender…"
                />
              </div>
              <UnderlineField
                label="Email"
                required
                type="email"
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={(v) => { set({ email: v }); clearErr('email'); }}
                onBlur={() => validateField('email')}
                error={errors.email}
              />
              <div className="md:col-span-2">
                <label className={fieldLabelClass}>Mobile Number *</label>
                <PhoneInput
                  countryCode={formData.phoneCountryCode}
                  phoneNumber={formData.phone}
                  onCountryCodeChange={(code) => { set({ phoneCountryCode: code }); clearErr('phone'); }}
                  onPhoneNumberChange={(digits) => { set({ phone: digits }); clearErr('phone'); }}
                  onBlur={() => validateField('phone')}
                  error={!!errors.phone}
                />
                {errors.phone && <span className="text-[11px] text-red-500 mt-1.5 block">{errors.phone}</span>}
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              <UnderlineField
                label="Pin Code"
                required
                placeholder="400 001"
                inputMode="numeric"
                maxLength={6}
                value={formData.pincode}
                onChange={handlePincodeChange}
                onBlur={() => validateField('pincode')}
                error={errors.pincode}
                rightSlot={
                  isFetchingPincode ? (
                    <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  ) : undefined
                }
              />
              <UnderlineField
                label="District"
                required
                readOnly
                placeholder={formData.pincode.length < 6 ? 'Enter pincode first…' : 'District'}
                value={formData.district}
              />
              <UnderlineField
                className="md:col-span-2"
                label="State"
                required
                readOnly
                placeholder={formData.pincode.length < 6 ? 'Enter pincode first…' : 'State'}
                value={formData.state}
              />
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="grid grid-cols-1 gap-y-8">
              <div>
                <label className={fieldLabelClass}>Areas of Expertise * (select multiple)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EXPERTISE_OPTIONS.map((option) => {
                    const selected = formData.expertise.includes(option);
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => { handleExpertiseChange(option); clearErr('expertise'); }}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                          selected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-transparent border-gray-200 dark:border-gray-700 text-[#4a5d73] dark:text-[#94a3b8] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        {option}
                      </button>
                    );
                  })}
                </div>
                {errors.expertise && <span className="text-[11px] text-red-500 mt-2 block">{errors.expertise}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <div>
                  <label className={fieldLabelClass}>Availability</label>
                  <UnderlineSelect
                    value={formData.availability}
                    onChange={(v) => set({ availability: v })}
                    options={AVAILABILITY_OPTIONS}
                  />
                </div>
                <UnderlineField
                  label="Certifications (optional)"
                  placeholder="MBA, CFA (comma separated)"
                  value={formData.certifications}
                  onChange={(v) => set({ certifications: v })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <PasswordField
                  label="Password"
                  required
                  placeholder="Create password"
                  value={formData.password}
                  onChange={(v) => { set({ password: v }); clearErr('password'); }}
                  onBlur={() => validateField('password')}
                />
                <PasswordField
                  label="Confirm Password"
                  required
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(v) => { set({ confirmPassword: v }); clearErr('confirmPassword'); }}
                  onBlur={() => validateField('confirmPassword')}
                  error={errors.confirmPassword}
                />
              </div>

              <PasswordChecklist password={formData.password} />
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="mt-10 mb-6">
          <TravelingBorderButton
            type="submit"
            solid
            showIcon={false}
            disabled={hasStepErrors() || isLoading || isFetchingPincode}
            className="w-full py-4 text-[15px] flex items-center justify-center font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing…' : isFetchingPincode ? 'Fetching Address…' : step === 3 ? 'Register Now' : 'Continue'}
          </TravelingBorderButton>

          {step === 1 && (
            <p className="text-center text-sm mt-6 text-[#4a5d73] dark:text-[#94a3b8]">
              Already have an account?{' '}
              <Link
                href="/agent/login"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
