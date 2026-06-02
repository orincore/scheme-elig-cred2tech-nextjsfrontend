'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { UnderlineField } from '@/components/ui/underline-field';
import { PasswordField } from '@/components/ui/password-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { validateEmail, validateRequired } from '@/lib/validators';
import { AlertCircle, Check, Shield, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const { login, isAuthenticated } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push('/admin/dashboard');
  }, [isAuthenticated, router]);

  const validateFields = () => {
    const errs: { email?: string; password?: string } = {};
    const emailErr = validateEmail(email, { allowSpam: true });
    if (emailErr) errs.email = emailErr;
    const pwdErr = validateRequired(password, 'Password');
    if (pwdErr) errs.password = pwdErr;
    return errs;
  };

  const validateField = (field: 'email' | 'password') => {
    const msg =
      field === 'email' ? validateEmail(email, { allowSpam: true }) : validateRequired(password, 'Password');
    setFieldErrors((p) => ({ ...p, [field]: msg || undefined }));
  };

  const handleLogin = async () => {
    const errs = validateFields();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoginState('loading');
    setApiError('');
    try {
      const success = await login(email, password);
      if (success) {
        setLoginState('success');
        setTimeout(() => router.push('/admin/dashboard'), 700);
      } else {
        setLoginState('error');
        setApiError('Login failed. Please check your credentials.');
        setTimeout(() => setLoginState('idle'), 1200);
      }
    } catch (err: any) {
      setLoginState('error');
      setApiError(err?.message || 'Login failed');
      setTimeout(() => setLoginState('idle'), 1200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  const brand = (
    <>
      <div className="mt-12 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-indigo-100 mb-5">
          <Shield className="h-3.5 w-3.5" />
          Admin Console
        </div>
        <h2 className="text-3xl font-bold leading-tight mb-4">Control Center</h2>
        <p className="text-indigo-100 text-[15px] leading-relaxed opacity-90">
          Manage agents, review cases, and approve onboarding from one secure,
          audited dashboard.
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
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Admin Sign In
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Secure access to the Cred2Tech admin console
        </p>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-6 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <AlertCircle className="h-[15px] w-[15px] shrink-0" />
          {apiError}
        </div>
      )}

      <div className="space-y-8 mb-8">
        <UnderlineField
          label="Email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(v) => { setEmail(v); setApiError(''); setFieldErrors((p) => ({ ...p, email: undefined })); }}
          onBlur={() => validateField('email')}
          onKeyDown={handleKeyDown}
          error={fieldErrors.email}
          placeholder="admin@cred2tech.com"
        />

        <PasswordField
          label="Password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(v) => { setPassword(v); setApiError(''); setFieldErrors((p) => ({ ...p, password: undefined })); }}
          onBlur={() => validateField('password')}
          onKeyDown={handleKeyDown}
          error={fieldErrors.password}
        />
      </div>

      <TravelingBorderButton
        onClick={handleLogin}
        disabled={loginState === 'loading'}
        className="w-full py-3.5 text-[15px] rounded-[10px]"
        showIcon={loginState === 'idle' || loginState === 'error'}
      >
        {loginState === 'loading' ? (
          <div className="flex justify-center items-center w-full h-full">
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          </div>
        ) : loginState === 'success' ? (
          <div className="flex items-center justify-center gap-2 w-full h-full">
            <Check className="h-[18px] w-[18px]" />
            <span>Access Granted</span>
          </div>
        ) : (
          <span>Sign In</span>
        )}
      </TravelingBorderButton>

      <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-[#4a5d73] dark:text-[#94a3b8]">
        <Shield className="h-[13px] w-[13px] text-indigo-600" />
        Restricted access · All activity is audited
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-[13px]">
          <Link
            href="/agent/login"
            className="text-[#4a5d73] dark:text-[#94a3b8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Agent Login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
