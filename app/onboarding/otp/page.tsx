'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMsmeAuth, ONBOARDING_ROUTES } from '@/contexts/MsmeAuthContext';
import OtpPage from '@/components/auth/OtpPage';

/**
 * Standalone OTP step. Resumes from the pending mobile saved at send-otp time;
 * if the user is already verified, they're routed to their real onboarding stage.
 */
export default function OnboardingOtpPage() {
  const { isInitialized, mobile, resolveStage } = useMsmeAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;

    const authToken = typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null;
    const pending = mobile || (typeof window !== 'undefined' ? sessionStorage.getItem('msme_pending_mobile') : null);

    // Already verified → send them to the correct step, not back to OTP.
    if (authToken) {
      (async () => {
        const stage = await resolveStage();
        if (cancelled) return;
        router.replace(
          stage === 'dashboard' ? ONBOARDING_ROUTES.dashboard
            : stage === 'profile' ? ONBOARDING_ROUTES.profile
            : ONBOARDING_ROUTES.pan,
        );
      })();
      return;
    }

    // No OTP in progress → back to the start.
    if (!pending) {
      router.replace(ONBOARDING_ROUTES.landing);
      return;
    }
    setReady(true);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, mobile]);

  if (!ready) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <OtpPage />
    </main>
  );
}
