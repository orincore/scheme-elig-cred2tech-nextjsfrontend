'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMsmeAuth, OnboardingStage, ONBOARDING_ROUTES } from '@/contexts/MsmeAuthContext';

const STAGE_ROUTE: Record<OnboardingStage, string> = {
  pan: ONBOARDING_ROUTES.pan,
  profile: ONBOARDING_ROUTES.profile,
  dashboard: ONBOARDING_ROUTES.dashboard,
};

/**
 * Guards a token-gated onboarding step (pan / profile / dashboard) against the
 * user's REAL backend stage. If they belong on a different step (because they
 * refreshed, deep-linked, or left onboarding incomplete), they're redirected
 * there — so nobody can skip ahead to the dashboard with free access.
 *
 * Returns `true` only once the user is confirmed to belong on this page.
 */
export function useOnboardingGuard(expected: OnboardingStage): boolean {
  const { isInitialized, token, resolveStage } = useMsmeAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;

    const authToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null);
    if (!authToken) {
      router.replace(ONBOARDING_ROUTES.landing);
      return;
    }

    (async () => {
      const stage = await resolveStage();
      if (cancelled) return;
      if (!stage) {
        router.replace(ONBOARDING_ROUTES.landing);
        return;
      }
      if (stage === expected) {
        setAllowed(true);
        return;
      }
      router.replace(STAGE_ROUTE[stage]);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, expected]);

  return allowed;
}
