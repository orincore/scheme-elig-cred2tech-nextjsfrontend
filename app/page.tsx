'use client';

import { useEffect, useState } from 'react';
import { useMsmeAuth, ONBOARDING_ROUTES } from '@/contexts/MsmeAuthContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/auth/LoginPage';
import { Spinner } from '@/components/ui/spinner';

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

  // resolveStage() during the effect above is 2-3 sequential API round-trips
  // (businesses, then profile) against a remote DB — this can take several
  // seconds. This used to render a totally blank <main> for that whole
  // window, which reads as a stuck/broken page rather than "still loading".
  if (!showLogin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="size-6" />
          <p className="text-sm">Setting things up…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <LoginPage />
    </main>
  );
}
