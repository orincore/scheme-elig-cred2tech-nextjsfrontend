'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMsmeAuth, ONBOARDING_ROUTES } from '@/contexts/MsmeAuthContext';
import ProfileSummaryPage from '@/components/auth/ProfileSummaryPage';

/**
 * Existing-user "Welcome back" review screen. It only makes sense right after a
 * fresh login (when the profile is loaded in memory); on a hard refresh we can't
 * rebuild it, so we resolve the user's real stage and route them onward.
 */
export default function OnboardingSummaryPage() {
  const { isInitialized, existingProfile, resolveStage } = useMsmeAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;

    const authToken = typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null;
    if (!authToken) {
      router.replace(ONBOARDING_ROUTES.landing);
      return;
    }

    // Loaded in-memory from a fresh login → show the summary.
    if (existingProfile) {
      setReady(true);
      return;
    }

    // Refresh / deep-link → send them to their real stage.
    (async () => {
      const stage = await resolveStage();
      if (cancelled) return;
      router.replace(
        stage === 'profile' ? ONBOARDING_ROUTES.profile
          : stage === 'pan' ? ONBOARDING_ROUTES.pan
          : ONBOARDING_ROUTES.dashboard,
      );
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, existingProfile]);

  if (!ready) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <ProfileSummaryPage />
    </main>
  );
}
