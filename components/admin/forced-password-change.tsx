'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordField } from '@/components/ui/password-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { AlertCircle, Check, Shield, ShieldCheck, KeyRound } from 'lucide-react';

/**
 * Full-page "set your password" screen shown on a new admin's FIRST login (they
 * arrive with an auto-generated temporary password). Mirrors the admin login
 * page UI (AuthShell + brand panel + underline/password fields + traveling
 * button) so the onboarding flow feels like one continuous, streamlined system.
 */
export default function ForcedPasswordChange() {
  const { changePassword, logout, admin } = useAdminAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ old?: string; next?: string; confirm?: string }>({});

  const validate = () => {
    const errs: { old?: string; next?: string; confirm?: string } = {};
    if (!oldPassword) errs.old = 'Enter your temporary password';
    if (!newPassword) errs.next = 'Choose a new password';
    else if (newPassword.length < 8) errs.next = 'Must be at least 8 characters';
    if (!confirm) errs.confirm = 'Re-enter your new password';
    else if (newPassword && confirm !== newPassword) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setApiError('');
    setState('loading');
    try {
      const ok = await changePassword(oldPassword, newPassword);
      if (ok) {
        setState('success');
        // mustChangePassword flips to false in context → the layout swaps to the
        // dashboard automatically once this screen unmounts.
      } else {
        setState('error');
        setApiError('Could not set your password. Please try again.');
        setTimeout(() => setState('idle'), 1200);
      }
    } catch (err: any) {
      setState('error');
      setApiError(err?.message || 'Temporary password is incorrect');
      setTimeout(() => setState('idle'), 1200);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

  const brand = (
    <>
      <div className="mt-12 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-indigo-100 mb-5">
          <Shield className="h-3.5 w-3.5" />
          Admin Console
        </div>
        <h2 className="text-3xl font-bold leading-tight mb-4">
          {admin?.fullName ? `Welcome, ${admin.fullName.split(' ')[0]}` : 'Welcome aboard'}
        </h2>
        <p className="text-indigo-100 text-[15px] leading-relaxed opacity-90">
          One quick step before you start — replace your temporary password with
          one only you know. It keeps your audited admin access secure.
        </p>
      </div>
      <div className="relative mt-auto flex-1 flex items-center justify-center">
        <div className="absolute h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl animate-pulse" />
        <div className="absolute h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse [animation-delay:1s]" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl rotate-[-6deg]">
          <ShieldCheck className="h-14 w-14 text-white/90" />
        </div>
      </div>
    </>
  );

  return (
    <AuthShell brand={brand}>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-[12px] font-semibold text-indigo-600 dark:text-indigo-300 mb-4">
          <KeyRound className="h-3.5 w-3.5" />
          First sign-in
        </div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Set Your Password
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          You're signed in with a temporary password. Choose a new one to continue.
        </p>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-6 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <AlertCircle className="h-[15px] w-[15px] shrink-0" />
          {apiError}
        </div>
      )}

      <div className="space-y-8 mb-8">
        <PasswordField
          label="Temporary Password"
          required
          autoComplete="current-password"
          value={oldPassword}
          onChange={(v) => { setOldPassword(v); setApiError(''); setFieldErrors((p) => ({ ...p, old: undefined })); }}
          onKeyDown={onKeyDown}
          error={fieldErrors.old}
        />
        <PasswordField
          label="New Password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(v) => { setNewPassword(v); setApiError(''); setFieldErrors((p) => ({ ...p, next: undefined })); }}
          onKeyDown={onKeyDown}
          error={fieldErrors.next}
        />
        <PasswordField
          label="Confirm New Password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(v) => { setConfirm(v); setApiError(''); setFieldErrors((p) => ({ ...p, confirm: undefined })); }}
          onKeyDown={onKeyDown}
          error={fieldErrors.confirm}
        />
      </div>

      <TravelingBorderButton
        onClick={submit}
        disabled={state === 'loading'}
        className="w-full py-3.5 text-[15px] rounded-[10px]"
        showIcon={state === 'idle' || state === 'error'}
      >
        {state === 'loading' ? (
          <div className="flex justify-center items-center w-full h-full">
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          </div>
        ) : state === 'success' ? (
          <div className="flex items-center justify-center gap-2 w-full h-full">
            <Check className="h-[18px] w-[18px] " />
            <span>Password Set</span>
          </div>
        ) : (
          <span>Set Password & Continue</span>
        )}
      </TravelingBorderButton>

      <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-[#4a5d73] dark:text-[#94a3b8]">
        <Shield className="h-[13px] w-[13px] text-indigo-600" />
        Your new password is encrypted · All activity is audited
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
        <button
          onClick={logout}
          className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          Not you? Log out
        </button>
      </div>
    </AuthShell>
  );
}
