'use client';

import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import ProfileOnboardingPage from '@/components/auth/ProfileOnboardingPage';

export default function OnboardingProfilePage() {
  const allowed = useOnboardingGuard('profile');
  if (!allowed) return <main className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background">
      <ProfileOnboardingPage />
    </main>
  );
}
