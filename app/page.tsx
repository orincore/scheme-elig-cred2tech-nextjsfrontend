'use client';

import { useEffect } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/auth/LoginPage';
import OtpPage from '@/components/auth/OtpPage';
import PanVerificationPage from '@/components/auth/PanVerificationPage';
import PaymentPage from '@/components/auth/PaymentPage';
import ProfileSummaryPage from '@/components/auth/ProfileSummaryPage';
import AddBusinessPage from '@/components/auth/AddBusinessPage';

export default function Home() {
  const { authStep } = useMsmeAuth();
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const { isAuthenticated: isAgentAuthenticated } = useAgentAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect admin to admin dashboard
    if (isAdminAuthenticated) {
      router.push('/admin/dashboard');
      return;
    }
    
    // Redirect agent to agent dashboard
    if (isAgentAuthenticated) {
      router.push('/agent/dashboard');
      return;
    }
    
    // Redirect MSME user to dashboard
    if (authStep === 'authenticated') {
      router.push('/dashboard');
    }
  }, [authStep, isAdminAuthenticated, isAgentAuthenticated, router]);

  return (
    <main className="min-h-screen bg-background">
      {authStep === 'landing' && <LoginPage />}
      {authStep === 'otp' && <OtpPage />}
      {authStep === 'pan-verification' && <PanVerificationPage />}
      {authStep === 'payment' && <PaymentPage />}
      {authStep === 'profile-summary' && <ProfileSummaryPage />}
      {authStep === 'add-business' && <AddBusinessPage />}
    </main>
  );
}
