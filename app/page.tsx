'use client';

import { useEffect, useState } from 'react';
import { useMsmeAuth, ONBOARDING_ROUTES } from '@/contexts/MsmeAuthContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/auth/LoginPage';

export default function Home() {
  const { isInitialized, authStep, resolveStage } = useMsmeAuth();
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const { isAuthenticated: isAgentAuthenticated } = useAgentAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Admin / agent take priority over the MSME flow.
    if (isAdminAuthenticated) {
      router.replace('/admin/dashboard');
      return;
    }
    if (isAgentAuthenticated) {
      router.replace('/agent/dashboard');
      return;
    }

    if (!isInitialized) return;
    let cancelled = false;

    const authToken = typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null;

    // OTP in progress (no token yet) → resume the OTP step.
    if (!authToken) {
      if (authStep === 'otp') {
        router.replace(ONBOARDING_ROUTES.otp);
        return;
      }
      setShowLogin(true);
      return;
    }

    // Logged in / mid-onboarding → jump to the user's real stage.
    (async () => {
      const stage = await resolveStage();
      if (cancelled) return;
      router.replace(
        stage === 'dashboard' ? ONBOARDING_ROUTES.dashboard
          : stage === 'profile' ? ONBOARDING_ROUTES.profile
          : stage === 'pan' ? ONBOARDING_ROUTES.pan
          : ONBOARDING_ROUTES.landing,
      );
      if (!stage) setShowLogin(true);
    })();

    return () => { cancelled = true; };
  }, [isInitialized, authStep, isAdminAuthenticated, isAgentAuthenticated, router]);

  if (!showLogin) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <LoginPage />
    </main>
  );
}
