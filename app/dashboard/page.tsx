'use client';

import { useEffect, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useSchemes } from '@/contexts/SchemesContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EligibilityDashboard from '@/components/dashboard/EligibilityDashboard';
import MissingProfileModal from '@/components/dashboard/MissingProfileModal';
import CompleteProfileModal from '@/components/dashboard/CompleteProfileModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const { authStep, token, mobile, userProfile, refreshBusinesses } = useMsmeAuth();
  const { loadSchemesForDashboard } = useSchemes();
  const router = useRouter();
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  useEffect(() => {
    if (authStep !== 'authenticated') {
      router.push('/');
    }
  }, [authStep, router]);

  useEffect(() => {
    if (authStep === 'authenticated') {
      // Make sure the active business is known (persisted to sessionStorage)
      // before loading/analyzing, so results are scoped to the right business.
      refreshBusinesses().finally(() => loadSchemesForDashboard());
    }
  }, [authStep]);

  useEffect(() => {
    const checkProfile = async () => {
      if (authStep !== 'authenticated' || !token) return;
      const mobileNumber = userProfile?.mobile || mobile;
      if (!mobileNumber) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const user = data.user;
          setProfileName(user.name || user.legalNameOfBusiness || '');
          setProfileEmail(user.email || '');
          if ((!user.name && !user.legalNameOfBusiness) || !user.email) {
            setShowCompleteProfile(true);
          }
        }
      } catch {}
    };
    checkProfile();
  }, [authStep, token, mobile, userProfile]);

  if (authStep !== 'authenticated') {
    return null;
  }

  return (
    <DashboardLayout>
      <EligibilityDashboard />
      <MissingProfileModal />
      {showCompleteProfile && token && (
        <CompleteProfileModal
          token={token}
          initialName={profileName}
          initialEmail={profileEmail}
          onComplete={(name, email) => {
            setProfileName(name);
            setProfileEmail(email);
            setShowCompleteProfile(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
