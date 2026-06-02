'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { AuthShell } from '@/components/auth/auth-shell';
import { UnderlineField } from '@/components/ui/underline-field';
import { PasswordField } from '@/components/ui/password-field';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import { validateEmail, validateRequired } from '@/lib/validators';
import { AlertCircle, Check, Lock } from 'lucide-react';

export default function AgentLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const { login } = useAgentAuth();
  const router = useRouter();

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
        setTimeout(() => router.push('/agent/dashboard'), 700);
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
        <h2 className="text-3xl font-bold leading-tight mb-4">Welcome Back</h2>
        <p className="text-indigo-100 text-[15px] leading-relaxed opacity-90">
          Sign in to manage your case pipeline, track applications, and access
          enterprise-grade analytics seamlessly.
        </p>
      </div>
      <div className="relative mt-auto flex-1 flex items-center justify-center">
        <div className="absolute h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl animate-pulse" />
        <div className="absolute h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse [animation-delay:1s]" />
        <div className="relative w-64 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-2xl rotate-[-6deg]">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-8 rounded-lg bg-white/80" />
            <div className="h-3 w-12 rounded-full bg-white/40" />
          </div>
          <div className="h-3 w-32 rounded-full bg-white/50 mb-2" />
          <div className="h-3 w-24 rounded-full bg-white/30 mb-6" />
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-20 rounded-full bg-white/40" />
            <div className="h-6 w-10 rounded bg-white/70" />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <AuthShell brand={brand}>
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#0a1628] dark:text-[#e6edf7] tracking-tight mb-2">
          Agent Sign In
        </h1>
        <p className="text-[#4a5d73] dark:text-[#94a3b8] text-[14px] md:text-[15px]">
          Access your secure Cred2Tech portal
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
          placeholder="name@company.com"
        />

        <div>
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
          <div className="flex justify-end mt-2">
            <button
              type="button"
              className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-transparent border-0 cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        </div>
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
        <Lock className="h-[13px] w-[13px] text-indigo-600" />
        256-bit encryption · Trusted by 10,000+ businesses
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center space-y-2">
        <p className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
          New to the platform?
          <Link
            href="/agent/register"
            className="text-indigo-600 dark:text-indigo-400 font-bold ml-1 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
          >
            Register as Agent
          </Link>
        </p>
        <p className="text-[13px]">
          <Link
            href="/admin/login"
            className="text-[#4a5d73] dark:text-[#94a3b8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Admin Login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
