'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useSchemes } from '@/contexts/SchemesContext';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EligibilityDashboard from '@/components/dashboard/EligibilityDashboard';
import MissingProfileModal from '@/components/dashboard/MissingProfileModal';
import IndustrySelectModal from '@/components/dashboard/IndustrySelectModal';
import CompleteProfileModal from '@/components/dashboard/CompleteProfileModal';
import LockedSchemesTeaser from '@/components/dashboard/LockedSchemesTeaser';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const allowed = useOnboardingGuard('dashboard');
  const { token, mobile, userProfile, activeBusinessId, refreshBusinesses } = useMsmeAuth();
  const { loadSchemesForDashboard } = useSchemes();

  // null = still checking, true/false = locked state for the active business.
  const [locked, setLocked] = useState<boolean | null>(null);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Determine whether the active business has been unlocked (paid).
  const checkLocked = useCallback(async () => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    if (!authToken) return;
    try {
      const bizId = activeBusinessId ?? sessionStorage.getItem('msme_active_business');
      const q = bizId ? `?businessId=${bizId}` : '';
      const res = await fetch(`${API_BASE_URL}/api/msme-eligibility/results${q}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setLocked(data?.locked === true);
    } catch {
      // Fail safe: treat as locked so real data is never shown without payment.
      setLocked(true);
    }
  }, [token, activeBusinessId]);

  useEffect(() => {
    if (!allowed) return;
    refreshBusinesses().finally(checkLocked);
  }, [allowed, checkLocked, refreshBusinesses]);

  // Only load real (streaming) scheme data once the business is unlocked.
  useEffect(() => {
    if (allowed && locked === false) {
      loadSchemesForDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, locked]);

  // Name/email completion prompt (unlocked dashboard only).
  useEffect(() => {
    const checkProfile = async () => {
      if (!allowed || locked !== false || !token) return;
      const mobileNumber = userProfile?.mobile || mobile;
      if (!mobileNumber) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
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
  }, [allowed, locked, token, mobile, userProfile]);

  // Called after a successful unlock payment: flip to unlocked + load real data.
  const handleUnlocked = useCallback(() => {
    setLocked(false);
  }, []);

  if (!allowed || locked === null) {
    return <DashboardLayout><div className="min-h-[40vh]" /></DashboardLayout>;
  }

  if (locked) {
    return (
      <DashboardLayout>
        <LockedSchemesTeaser onUnlocked={handleUnlocked} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <EligibilityDashboard />
      <IndustrySelectModal />
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
