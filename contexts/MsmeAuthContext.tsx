'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
  authStep: 'landing' | 'otp' | 'pan-verification' | 'payment' | 'profile-summary' | 'add-business' | 'authenticated';
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  sendOtp: (mobile: string) => Promise<boolean>;
  setMobile: (mobile: string) => void;
  verifyOtp: (otp: string) => Promise<boolean>;
  setPanAndProfile: (pan: string, profile: Omit<UserProfile, 'pan' | 'mobile' | 'userId'>, userId: string, businessId?: number | null) => Promise<boolean>;
  completePayment: () => Promise<boolean>;
  continueToDashboard: () => void;
  refreshBusinesses: () => Promise<void>;
  setActiveBusiness: (businessId: number) => Promise<boolean>;
  startAddBusiness: () => Promise<boolean>;
  goToAddBusinessHub: () => void;
  initiateDataRefresh: () => Promise<{ orderId: string; amount: number; currency: string; keyId: string } | null>;
  completeDataRefresh: (orderId: string, paymentId: string, signature: string) => Promise<boolean>;
  logout: () => void;
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

  // Initialize from sessionStorage
  useEffect(() => {
    const savedToken = sessionStorage.getItem('msme_auth_token');
    const savedProfile = sessionStorage.getItem('msme_profile');
    const savedMobile = sessionStorage.getItem('msme_mobile');
    const savedUserId = sessionStorage.getItem('msme_user_id');

    if (savedToken && savedMobile) {
      setToken(savedToken);
      setUserId(savedUserId);
      setMobileState(savedMobile);
      setAuthStep('authenticated');

      const savedActiveBiz = sessionStorage.getItem('msme_active_business');
      if (savedActiveBiz) setActiveBusinessId(Number(savedActiveBiz));

      // Only set profile if it exists in sessionStorage
      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile));
        } catch (e) {
          console.error('Failed to parse saved profile:', e);
        }
      }
    }
    setIsInitialized(true);
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
      setAuthStep('otp');
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
    setAuthStep('otp');
    setError(null);
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

      // Use backend's authStep to determine next step
      const backendAuthStep = data.authStep;
      if (backendAuthStep === 'dashboard') {
        // Existing paid user — fetch their profile and show summary
        try {
          const profileRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobile}`, {
            headers: { 'Authorization': `Bearer ${data.token}` },
          });
          const profileData = await profileRes.json();

          // Fetch refresh pricing
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
      } else if (backendAuthStep === 'payment') {
        setAuthStep('payment');
      } else {
        setAuthStep('pan-verification');
      }

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

      setAuthStep('payment');
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
        setBusinesses(data.businesses || []);
        const active = data.activeBusinessId ?? data.businesses?.[0]?.id ?? null;
        if (active != null) {
          setActiveBusinessId(Number(active));
          sessionStorage.setItem('msme_active_business', String(active));
        }
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
    router.push('/');
    return true;
  };

  const goToAddBusinessHub = () => {
    setAuthStep('add-business');
    router.push('/');
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
    setExistingProfile(null);
    setBusinesses([]);
    setActiveBusinessId(null);
    setPendingBusinessId(null);
    router.push('/');
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
    refreshBusinesses,
    setActiveBusiness,
    startAddBusiness,
    goToAddBusinessHub,
    initiateDataRefresh,
    completeDataRefresh,
    logout,
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
