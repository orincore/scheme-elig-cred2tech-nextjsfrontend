'use client';

import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import AddBusinessPage from '@/components/auth/AddBusinessPage';

export default function OnboardingBusinessesPage() {
  // The add-business hub is only reachable once the user has finished onboarding
  // their first (primary) business — i.e. they belong on the dashboard.
  const allowed = useOnboardingGuard('dashboard');
  if (!allowed) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <AddBusinessPage />
    </main>
  );
}
