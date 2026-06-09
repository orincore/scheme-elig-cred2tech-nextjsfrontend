'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getMissingFields } from '@/lib/eligibilityFields';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Each onboarding step has its own URL so a page refresh resumes exactly where
// the user left off (no more falling through to the dashboard with free access).
export const ONBOARDING_ROUTES = {
  landing: '/',
  otp: '/onboarding/otp',
  pan: '/onboarding/pan',
  profile: '/onboarding/profile',
  summary: '/onboarding/summary',
  businesses: '/onboarding/businesses',
  dashboard: '/dashboard',
} as const;

// Canonical onboarding stage for a logged-in user, derived from authoritative
// backend state (verified businesses + saved profile) — never from a stale
// client flag. This is what makes refresh-resume correct and tamper-proof.
export type OnboardingStage = 'pan' | 'profile' | 'dashboard';

export interface UserProfile {
  userId: string;
  mobile: string;
  pan: string;
  name: string;
  email: string;
  businessType: string;
  state: string;
}

export interface BusinessProfile {
  id: number;
  isPrimary?: boolean;
  hasPaid?: boolean;
  panNumber: string | null;
  panVerified?: boolean;
  gstin?: string | null;
  legalNameOfBusiness?: string | null;
  tradeNameOfBusiness?: string | null;
  constitutionOfBusiness?: string | null;
  businessType?: string | null;
  businessSector?: string | null;
  enterpriseCategory?: string | null;
  principalState?: string | null;
  state?: string | null;
}

export interface ExistingProfile {
  name: string | null;
  mobileNumber: string;
  email: string | null;
  panNumber: string | null;
  gstin: string | null;
  legalNameOfBusiness: string | null;
  tradeNameOfBusiness: string | null;
  principalAddress: string | null;
  principalCity: string | null;
  principalState: string | null;
  principalDistrict: string | null;
  principalPincode: string | null;
  constitutionOfBusiness: string | null;
  taxpayerType: string | null;
  gstinStatus: string | null;
  registrationDate: string | null;
  businessType: string | null;
  businessSector: string | null;
  enterpriseCategory: string | null;
  annualTurnoverLakhs: number | null;
  yearsInOperation: number | null;
  lastDataRefreshAt: string | null;
  dataRefreshCount: number;
  refreshPrice: number;
}

export interface AuthContextType {
  token: string | null;
  mobile: string | null;
  userId: string | null;
  userProfile: UserProfile | null;
  existingProfile: ExistingProfile | null;
  businesses: BusinessProfile[];
  activeBusinessId: number | null;
  pendingBusinessId: number | null;
  authStep: 'landing' | 'otp' | 'pan-verification' | 'profile-onboarding' | 'payment' | 'profile-summary' | 'add-business' | 'authenticated';
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  sendOtp: (mobile: string) => Promise<boolean>;
  setMobile: (mobile: string) => void;
  verifyOtp: (otp: string) => Promise<boolean>;
  setPanAndProfile: (pan: string, profile: Omit<UserProfile, 'pan' | 'mobile' | 'userId'>, userId: string, businessId?: number | null) => Promise<boolean>;
  completePayment: () => Promise<boolean>;
  continueToDashboard: () => void;
  /**
   * Re-derive the user's onboarding stage from the backend (verified businesses +
   * saved profile). Used by per-page guards so refresh / deep-links resume at the
   * correct step instead of leaking dashboard access.
   */
  resolveStage: () => Promise<OnboardingStage | null>;
  refreshBusinesses: () => Promise<void>;
  setActiveBusiness: (businessId: number) => Promise<boolean>;
  startAddBusiness: () => Promise<boolean>;
  goToAddBusinessHub: () => void;
  initiateDataRefresh: () => Promise<{ orderId: string; amount: number; currency: string; keyId: string } | null>;
  completeDataRefresh: (orderId: string, paymentId: string, signature: string) => Promise<boolean>;
  logout: () => void;
  /**
   * Cancel onboarding: delete the incomplete account created during this flow
   * (if any), wipe all local/session storage, and return to the landing page.
   */
  abandonOnboarding: () => Promise<void>;
}

const MsmeAuthContext = createContext<AuthContextType | undefined>(undefined);

export const MsmeAuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [mobile, setMobileState] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null);
  const [pendingBusinessId, setPendingBusinessId] = useState<number | null>(null);
  const [authStep, setAuthStep] = useState<AuthContextType['authStep']>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map a resolved onboarding stage onto the matching authStep value.
  const stageToAuthStep = (stage: OnboardingStage): AuthContextType['authStep'] =>
    stage === 'dashboard' ? 'authenticated' : stage === 'profile' ? 'profile-onboarding' : 'pan-verification';

  /**
   * Derive the canonical onboarding stage from the backend. The user is only
   * "authenticated" (dashboard) once they have a PAN-verified business AND a
   * complete eligibility profile — otherwise they resume at the exact step that
   * is still pending. Returns null if not logged in.
   */
  const resolveStage = async (): Promise<OnboardingStage | null> => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    const mobileNumber = mobile || sessionStorage.getItem('msme_mobile');
    if (!authToken || !mobileNumber) return null;

    try {
      // 1) Businesses → is there a PAN-verified business, and which is active?
      const bizRes = await fetch(`${API_BASE_URL}/api/msme-auth/businesses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // A 401 means the token's account no longer exists (admin deleted it) or the
      // session was revoked. Don't bounce the ghost session into onboarding — clear
      // it and return to the landing page so the user can log in fresh.
      if (bizRes.status === 401) {
        logout();
        return null;
      }

      const bizData = await bizRes.json();
      const list: BusinessProfile[] = bizData?.businesses || [];
      const activeId = bizData?.activeBusinessId ?? list.find((b) => b.isPrimary)?.id ?? list[0]?.id ?? null;

      // Keep context + sessionStorage in sync so the dashboard scopes correctly.
      setBusinesses(list);
      if (activeId != null) {
        setActiveBusinessId(Number(activeId));
        sessionStorage.setItem('msme_active_business', String(activeId));
      }

      const hasPanVerified = list.some((b) => b.panVerified);
      if (!hasPanVerified) return 'pan';

      // 2) Profile completeness for the active business (same logic the dashboard uses).
      const profRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const profData = await profRes.json();
      const profile = profData?.user || {};
      const profileComplete = getMissingFields(profile).length === 0;
      if (!profileComplete) return 'profile';

      return 'dashboard';
    } catch {
      // On a transient error, don't grant dashboard access — keep them at PAN.
      return 'pan';
    }
  };

  // Initialize from sessionStorage, then confirm the real stage with the backend
  // so a refresh mid-onboarding resumes correctly instead of unlocking the dashboard.
  useEffect(() => {
    const savedToken = sessionStorage.getItem('msme_auth_token');
    const savedProfile = sessionStorage.getItem('msme_profile');
    const savedMobile = sessionStorage.getItem('msme_mobile');
    const savedUserId = sessionStorage.getItem('msme_user_id');

    if (!savedToken || !savedMobile) {
      // Not logged in yet — but if an OTP was just sent, restore that pending
      // mobile so a refresh on the OTP page resumes instead of dropping to landing.
      const pendingMobile = sessionStorage.getItem('msme_pending_mobile');
      if (pendingMobile) {
        setMobileState(pendingMobile);
        setAuthStep('otp');
      }
      setIsInitialized(true);
      return;
    }

    setToken(savedToken);
    setUserId(savedUserId);
    setMobileState(savedMobile);

    const savedActiveBiz = sessionStorage.getItem('msme_active_business');
    if (savedActiveBiz) setActiveBusinessId(Number(savedActiveBiz));

    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }

    // Authoritatively resolve where this user actually is in onboarding.
    (async () => {
      const stage = await resolveStage();
      setAuthStep(stage ? stageToAuthStep(stage) : 'landing');
      setIsInitialized(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendOtp = async (mobileNumber: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/msme-auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileNumber }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setMobileState(mobileNumber);
      // Persist the in-progress mobile so the OTP page survives a refresh.
      sessionStorage.setItem('msme_pending_mobile', mobileNumber);
      setAuthStep('otp');
      router.push(ONBOARDING_ROUTES.otp);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const setMobile = (mobileNumber: string) => {
    setMobileState(mobileNumber);
    sessionStorage.setItem('msme_pending_mobile', mobileNumber);
    setAuthStep('otp');
    setError(null);
    router.push(ONBOARDING_ROUTES.otp);
  };

  const verifyOtp = async (otp: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Call backend verify-otp endpoint
      const response = await fetch(`${API_BASE_URL}/api/msme-auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile, otp }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'OTP verification failed');
      }

      setToken(data.token);
      setUserId(data.userId);
      sessionStorage.setItem('msme_auth_token', data.token);
      sessionStorage.setItem('msme_mobile', mobile || '');
      sessionStorage.setItem('msme_user_id', data.userId);
      // OTP is verified — the pending-mobile hint is no longer needed.
      sessionStorage.removeItem('msme_pending_mobile');

      // EXISTING (already-paid) users keep their flow intact: review their
      // profile summary, optionally pay to refresh, then continue to dashboard.
      if (data.authStep === 'dashboard') {
        try {
          const profileRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobile}`, {
            headers: { 'Authorization': `Bearer ${data.token}` },
          });
          const profileData = await profileRes.json();

          const paymentStatusRes = await fetch(`${API_BASE_URL}/api/payment/status/${data.userId}`, {
            headers: { 'Authorization': `Bearer ${data.token}` },
          });
          const paymentStatus = await paymentStatusRes.json();

          if (profileData.success) {
            setExistingProfile({
              ...profileData.user,
              refreshPrice: paymentStatus?.refreshPrice || 49,
            });
          }
        } catch (e) {
          console.error('Failed to load existing profile:', e);
        }
        setAuthStep('profile-summary');
        router.push(ONBOARDING_ROUTES.summary);
        return true;
      }

      // NEW users (and anyone mid-onboarding): resume at the exact pending step.
      const stage = await resolveStage();
      const resolved = stage ?? 'pan';
      setAuthStep(stageToAuthStep(resolved));
      router.push(
        resolved === 'dashboard'
          ? ONBOARDING_ROUTES.dashboard
          : resolved === 'profile'
            ? ONBOARDING_ROUTES.profile
            : ONBOARDING_ROUTES.pan,
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // The PAN has ALREADY been verified (and persisted) by the verify step that
  // returned `businessId`. This only saves the personal name/email and advances
  // to payment — it does NOT re-call /verify-pan (no second Signzy charge).
  const setPanAndProfile = async (
    pan: string,
    profile: Omit<UserProfile, 'pan' | 'mobile' | 'userId'>,
    userId: string,
    businessId?: number | null,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Track the business this PAN was attached to (used for the payment step).
      if (businessId) setPendingBusinessId(Number(businessId));

      // Persist personal name + email to the DB so we don't re-ask for it on the
      // dashboard (CompleteProfileModal triggers when the stored email is empty).
      if (profile.email || profile.name) {
        try {
          await fetch(`${API_BASE_URL}/api/msme-auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name: profile.name, email: profile.email }),
          });
        } catch {
          /* non-fatal — user can still complete it later */
        }
      }

      const fullProfile: UserProfile = {
        ...profile,
        pan,
        mobile: mobile || '',
        userId,
      };

      setUserProfile(fullProfile);
      sessionStorage.setItem('msme_profile', JSON.stringify(fullProfile));

      // NEW FLOW: no payment here. PAN is verified → make the just-verified
      // business the active one (so the dashboard + analysis scope to it, even
      // when adding additional businesses), then send the user to complete their
      // profile onboarding. Payment now happens on the dashboard (pay to unlock).
      if (businessId) {
        await setActiveBusiness(Number(businessId));
      }
      await refreshBusinesses();
      const stage = await resolveStage();
      if (stage === 'dashboard') {
        // Profile already complete (e.g. auto-filled from GST) — go straight in.
        setAuthStep('authenticated');
        router.push(ONBOARDING_ROUTES.dashboard);
      } else {
        setAuthStep('profile-onboarding');
        router.push(ONBOARDING_ROUTES.profile);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const completePayment = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Load Razorpay script
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
      });

      // Check if payment is required
      const checkResponse = await fetch(`${API_BASE_URL}/api/payment/check-required`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action: 'PAN_VERIFICATION', businessId: pendingBusinessId ?? undefined }),
      });

      const checkData = await checkResponse.json();

      // This business is already paid for — jump to the add-business hub.
      if (checkData.hasPaid === true) {
        await refreshBusinesses();
        setAuthStep('add-business');
        return true;
      }

      // Create payment order
      const orderResponse = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, paymentType: 'PAN_VERIFICATION', mobile, businessId: pendingBusinessId ?? undefined }),
      });

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // Initialize Razorpay
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'Cred2Tech',
        description: 'Registration Payment',
        handler: async (response: any) => {
          // Verify payment
          const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId: orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            // Business is now registered + paid; show the hub so the user can
            // add more businesses or continue to the dashboard.
            await refreshBusinesses();
            setPendingBusinessId(null);
            setAuthStep('add-business');
          } else {
            setError(verifyData.message || 'Payment verification failed');
          }
          setIsLoading(false);
        },
        prefill: {
          name: userProfile?.name || '',
          email: userProfile?.email || '',
          contact: mobile || '',
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            setError('Payment cancelled');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      setIsLoading(false);
      return false;
    }
  };

  const continueToDashboard = () => {
    setPendingBusinessId(null);
    setAuthStep('authenticated');
    router.push('/dashboard');
  };

  const refreshBusinesses = async (): Promise<void> => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/msme-auth/businesses`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        const list = data.businesses || [];
        setBusinesses(list);
        const ids = list.map((b: BusinessProfile) => Number(b.id));
        const serverActive = data.activeBusinessId != null ? Number(data.activeBusinessId) : null;
        // Preserve the user's current selection if it's still a valid business —
        // otherwise a refresh (e.g. triggered right after switching) would clobber
        // the just-made choice with a cached/stale server value. Only (re)initialise
        // when there is no valid local selection.
        setActiveBusinessId((prev) => {
          const next = (prev != null && ids.includes(prev))
            ? prev
            : (serverActive != null && ids.includes(serverActive) ? serverActive : (ids[0] ?? null));
          if (next != null) sessionStorage.setItem('msme_active_business', String(next));
          return next;
        });
      }
    } catch {
      /* non-fatal */
    }
  };

  const setActiveBusiness = async (businessId: number): Promise<boolean> => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    if (!authToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/msme-auth/businesses/active`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!data.success) return false;
      setActiveBusinessId(Number(businessId));
      sessionStorage.setItem('msme_active_business', String(businessId));
      return true;
    } catch {
      return false;
    }
  };

  // Begin adding a new business: navigate directly to PAN verification.
  // The business row is created only after PAN is successfully verified,
  // so no orphan placeholder rows are left if the user abandons the flow.
  const startAddBusiness = async (): Promise<boolean> => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    if (!authToken) return false;
    setPendingBusinessId(null);  // no pre-created row
    setAuthStep('pan-verification');
    // `add=1` tells the PAN page this is an additional business, so its guard
    // allows it even though the user's primary stage is already 'dashboard'.
    router.push(`${ONBOARDING_ROUTES.pan}?add=1`);
    return true;
  };

  const goToAddBusinessHub = () => {
    setAuthStep('add-business');
    router.push(ONBOARDING_ROUTES.businesses);
  };

  const initiateDataRefresh = async (): Promise<{ orderId: string; amount: number; currency: string; keyId: string } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, paymentType: 'DATA_REFRESH', mobile }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to create order');
      return { orderId: data.orderId, amount: data.amount, currency: data.currency, keyId: data.keyId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate payment';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const completeDataRefresh = async (orderId: string, paymentId: string, signature: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Verify payment
      const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, paymentId, signature }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.message || 'Payment verification failed');

      // Refresh PAN data
      const refreshRes = await fetch(`${API_BASE_URL}/api/msme-auth/refresh-pan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const refreshData = await refreshRes.json();
      if (!refreshData.success) throw new Error(refreshData.message || 'Data refresh failed');

      // Re-fetch updated profile
      const profileRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobile}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const profileData = await profileRes.json();
      if (profileData.success) {
        setExistingProfile(prev => ({ ...prev!, ...profileData.user }));
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Data refresh failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setMobileState(null);
    setUserId(null);
    setUserProfile(null);
    setAuthStep('landing');
    setError(null);
    sessionStorage.removeItem('msme_auth_token');
    sessionStorage.removeItem('msme_profile');
    sessionStorage.removeItem('msme_mobile');
    sessionStorage.removeItem('msme_user_id');
    sessionStorage.removeItem('msme_active_business');
    sessionStorage.removeItem('msme_pending_mobile');
    setExistingProfile(null);
    setBusinesses([]);
    setActiveBusinessId(null);
    setPendingBusinessId(null);
    router.push('/');
  };

  const abandonOnboarding = async (): Promise<void> => {
    const authToken = token || sessionStorage.getItem('msme_auth_token');
    const uid = userId || sessionStorage.getItem('msme_user_id');

    // Delete the half-finished account so abandoned onboarding doesn't leave an
    // orphan user (no PAN / no complete profile) behind. Best-effort — even if
    // the call fails we still clear the local session below.
    if (authToken && uid) {
      try {
        await fetch(`${API_BASE_URL}/api/msme-auth/delete/${uid}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        /* non-fatal */
      }
    }

    // Wipe everything so no stale onboarding state survives the logout.
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* storage may be unavailable — logout() still resets in-memory state */
    }

    logout();
  };

  const value: AuthContextType = {
    token,
    mobile,
    userId,
    userProfile,
    existingProfile,
    businesses,
    activeBusinessId,
    pendingBusinessId,
    authStep,
    isLoading,
    isInitialized,
    error,
    sendOtp,
    setMobile,
    verifyOtp,
    setPanAndProfile,
    completePayment,
    continueToDashboard,
    resolveStage,
    refreshBusinesses,
    setActiveBusiness,
    startAddBusiness,
    goToAddBusinessHub,
    initiateDataRefresh,
    completeDataRefresh,
    logout,
    abandonOnboarding,
  };

  return (
    <MsmeAuthContext.Provider value={value}>
      {children}
    </MsmeAuthContext.Provider>
  );
};

export const useMsmeAuth = () => {
  const context = useContext(MsmeAuthContext);
  if (context === undefined) {
    throw new Error('useMsmeAuth must be used within MsmeAuthProvider');
  }
  return context;
};
