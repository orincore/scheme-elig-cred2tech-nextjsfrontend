'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMsmeAuth, ONBOARDING_ROUTES } from '@/contexts/MsmeAuthContext';
import PanVerificationPage from '@/components/auth/PanVerificationPage';

function PanRouteInner() {
  const { isInitialized, resolveStage } = useMsmeAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addMode = searchParams.get('add') === '1';
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;

    const authToken = typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null;
    if (!authToken) {
      router.replace(ONBOARDING_ROUTES.landing);
      return;
    }

    // Adding ANOTHER business: the user is intentionally back at PAN even though
    // their primary onboarding is complete — allow it (just require a session).
    if (addMode) {
      setAllowed(true);
      return;
    }

    // First-time onboarding: only valid when the real stage is still 'pan'.
    (async () => {
      const stage = await resolveStage();
      if (cancelled) return;
      if (stage === 'pan') { setAllowed(true); return; }
      router.replace(
        stage === 'dashboard' ? ONBOARDING_ROUTES.dashboard
          : stage === 'profile' ? ONBOARDING_ROUTES.profile
          : ONBOARDING_ROUTES.landing,
      );
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, addMode]);

  if (!allowed) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <PanVerificationPage />
    </main>
  );
}

export default function OnboardingPanPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <PanRouteInner />
    </Suspense>
  );
}
