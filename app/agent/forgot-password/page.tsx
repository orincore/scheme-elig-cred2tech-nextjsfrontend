'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { agentAuthApi } from '@/lib/services/api';
import { AuthShell } from '@/components/auth/auth-shell';
import { UnderlineField } from '@/components/ui/underline-field';
import { PasswordField } from '@/components/ui/password-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { validateEmail } from '@/lib/validators';
import { AlertCircle, ArrowLeft, CheckCircle2, MailCheck } from 'lucide-react';

const brand = (
  <>
    <div className="mt-12 text-white">
      <h2 className="text-3xl font-bold leading-tight mb-4">Reset your access</h2>
      <p className="text-indigo-100 text-[15px] leading-relaxed opacity-90">
        Enter your registered email and we'll send you a one-time code to set a new password.
      </p>
    </div>
    <div className="relative mt-auto flex-1 flex items-center justify-center">
      <div className="absolute h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl animate-pulse" />
      <div className="absolute h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse [animation-delay:1s]" />
    </div>
  </>
);

export default function AgentForgotPasswordPage() {
  const router = useRouter();

  // step 1: email — step 2: otp + new password
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');

  // step 1 state
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFieldError, setEmailFieldError] = useState<string | undefined>();

  // step 2 state
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ otp?: string; password?: string; confirm?: string }>({});

  // ── Step 1: request OTP ─────────────────────────────────────────────────────
  const submitEmail = async () => {
    const err = validateEmail(email, { allowSpam: true });
    if (err) { setEmailFieldError(err); return; }
    setEmailFieldError(undefined);
    setEmailLoading(true);
    setEmailError('');
    try {
      const res = await agentAuthApi.forgotPassword(email.trim());
      if (res?.success) {
        setSubmittedEmail(email.trim());
        setStep('otp');
      } else {
        setEmailError(res?.message || 'Something went wrong. Please try again.');
      }
    } catch (e: any) {
      setEmailError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Step 2: verify OTP + set new password ───────────────────────────────────
  const validateOtpForm = () => {
    const errs: typeof fieldErrors = {};
    if (!/^\d{6}$/.test(otp.trim())) errs.otp = 'Enter the 6-digit code from the email';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (confirm !== password) errs.confirm = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitOtp = async () => {
    if (!validateOtpForm()) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await agentAuthApi.resetPassword(submittedEmail, otp.trim(), password);
      if (res?.success) {
        setDone(true);
        setTimeout(() => router.push('/agent/login'), 2000);
      } else {
        setOtpError(res?.message || 'Could not reset your password. Please try again.');
      }
    } catch (e: any) {
      setOtpError(e?.message || 'Could not reset your password. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Done state ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <AuthShell brand={brand}>
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-[26px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">Password updated</h1>
          <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] leading-relaxed mb-8">
            Your password has been reset. Redirecting you to sign in…
          </p>
          <Link href="/agent/login" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Go to Sign In
          </Link>
        </div>
      </AuthShell>
    );
  }

  // ── Step 2: OTP + new password ──────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <AuthShell brand={brand}>
        <div className="mb-8 flex items-start gap-3 px-3 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <MailCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-[13px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
            We sent a 6-digit code to <strong>{submittedEmail}</strong>. Enter it below along with your new password. The code expires in 10 minutes.
          </p>
        </div>

        <div className="mb-8">
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">Set a new password</h1>
        </div>

        {otpError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-6 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            <AlertCircle className="h-[15px] w-[15px] shrink-0" />
            {otpError}
          </div>
        )}

        <div className="space-y-8 mb-8">
          <UnderlineField
            label="6-digit code"
            required
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setFieldErrors((p) => ({ ...p, otp: undefined })); setOtpError(''); }}
            error={fieldErrors.otp}
            placeholder="123456"
          />
          <PasswordField
            label="New Password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })); setOtpError(''); }}
            error={fieldErrors.password}
          />
          <PasswordField
            label="Confirm New Password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(v) => { setConfirm(v); setFieldErrors((p) => ({ ...p, confirm: undefined })); setOtpError(''); }}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') submitOtp(); }}
            error={fieldErrors.confirm}
          />
        </div>

        <TravelingBorderButton
          onClick={submitOtp}
          disabled={otpLoading}
          className="w-full py-3.5 text-[15px] rounded-[10px]"
          showIcon={!otpLoading}
        >
          {otpLoading ? (
            <div className="flex justify-center items-center w-full h-full">
              <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            </div>
          ) : (
            <span>Verify &amp; Reset Password</span>
          )}
        </TravelingBorderButton>

        <div className="mt-6 text-center text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
          Didn't receive a code?{' '}
          <button
            onClick={() => { setStep('email'); setOtp(''); setPassword(''); setConfirm(''); setOtpError(''); setFieldErrors({}); }}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
          >
            Resend
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <Link href="/agent/login" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </div>
      </AuthShell>
    );
  }

  // ── Step 1: email ───────────────────────────────────────────────────────────
  return (
    <AuthShell brand={brand}>
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">Forgot password?</h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Enter your email and we'll send you a one-time reset code.
        </p>
      </div>

      {emailError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-6 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <AlertCircle className="h-[15px] w-[15px] shrink-0" />
          {emailError}
        </div>
      )}

      <div className="space-y-8 mb-8">
        <UnderlineField
          label="Email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(v) => { setEmail(v); setEmailError(''); setEmailFieldError(undefined); }}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') submitEmail(); }}
          error={emailFieldError}
          placeholder="name@company.com"
        />
      </div>

      <TravelingBorderButton
        onClick={submitEmail}
        disabled={emailLoading}
        className="w-full py-3.5 text-[15px] rounded-[10px]"
        showIcon={!emailLoading}
      >
        {emailLoading ? (
          <div className="flex justify-center items-center w-full h-full">
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          </div>
        ) : (
          <span>Send Reset Code</span>
        )}
      </TravelingBorderButton>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
        <Link href="/agent/login" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
      </div>
    </AuthShell>
  );
}
