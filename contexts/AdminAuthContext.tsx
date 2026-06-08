'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthApi } from '@/lib/services/api';
import { toast } from 'sonner';

interface Admin {
  id: string;
  adminCode?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
  status: string;
  lastLoginAt?: string;
  loginCount?: number;
  createdAt: string;
  mustChangePassword?: boolean;
}

interface DashboardStats {
  agents: {
    total_agents: string;
    pending_agents: string;
    approved_agents: string;
    rejected_agents: string;
    blocked_agents: string;
    suspended_agents: string;
  };
  cases: {
    total_cases: string;
    new_cases: string;
    assigned_cases: string;
    in_progress_cases: string;
    under_review_cases: string;
    documents_pending_cases: string;
    approved_cases: string;
    rejected_cases: string;
    closed_cases: string;
  };
  ai?: {
    total_cost_usd: string | number;
    total_calls: string | number;
    cost_30d_usd: string | number;
    calls_30d: string | number;
    total_cost_inr?: string | number;
    cost_30d_inr?: string | number;
    rate?: number | null;
    rate_date?: string | null;
  };
}

interface AgentApprovalData {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  region: string;
  expertise: string[];
  availability: string;
  certifications: string[];
  gender?: string;
  status: string;
  approvalStatus: string;
  createdAt: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  stats: DashboardStats | null;
  pendingAgents: AgentApprovalData[];
  allAgents: AgentApprovalData[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchStats: () => Promise<void>;
  fetchPendingAgents: () => Promise<void>;
  fetchAllAgents: (params?: { status?: string; approvalStatus?: string }) => Promise<void>;
  approveAgent: (agentId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) => Promise<boolean>;
  updateAgentStatus: (agentId: string, action: string, reason?: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  logoutAllDevices: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingAgents, setPendingAgents] = useState<AgentApprovalData[]>([]);
  const [allAgents, setAllAgents] = useState<AgentApprovalData[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await adminAuthApi.getProfile();
        if (response.success) {
          setAdmin(response.admin);
        } else {
          localStorage.removeItem('admin_token');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('admin_token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await adminAuthApi.login(email, password);
      if (response.success) {
        localStorage.setItem('admin_token', response.token);
        setAdmin(response.admin);
        toast.success('Login successful');
        return true;
      }
      return false;
    } finally {
      // Let the error propagate so the login page can show the REAL reason
      // (e.g. "Admin account is suspended", "Invalid email or password").
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
    setStats(null);
    setPendingAgents([]);
    setAllAgents([]);
    toast.success('Logged out successfully');
    window.location.href = '/';
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAuthApi.getDashboardStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchPendingAgents = useCallback(async () => {
    try {
      const response = await adminAuthApi.getPendingAgents();
      if (response.success) {
        setPendingAgents(response.agents);
      }
    } catch (error: any) {
      console.error('Failed to fetch pending agents:', error);
    }
  }, []);

  const fetchAllAgents = useCallback(async (params?: { status?: string; approvalStatus?: string }) => {
    try {
      const response = await adminAuthApi.getAllAgents(params);
      if (response.success) {
        setAllAgents(response.agents);
      }
    } catch (error: any) {
      console.error('Failed to fetch agents:', error);
    }
  }, []);

  const approveAgent = useCallback(async (agentId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string): Promise<boolean> => {
    try {
      const response = await adminAuthApi.approveAgent(agentId, action, rejectionReason);
      
      if (response.success) {
        toast.success(response.message);
        // Update pending agents list
        setPendingAgents((prev) => prev.filter((a) => a.id !== agentId));
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await adminAuthApi.getProfile();
      if (response.success) setAdmin(response.admin);
    } catch (error: any) {
      console.error('Failed to refresh profile:', error);
    }
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    const response = await adminAuthApi.changePassword(oldPassword, newPassword);
    if (response.success) {
      // Keep THIS device logged in with the freshly issued token (other devices
      // are revoked server-side). Clear the forced-change flag locally.
      if (response.token) localStorage.setItem('admin_token', response.token);
      setAdmin((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      return true;
    }
    return false;
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await adminAuthApi.logoutAllDevices();
    } finally {
      // This device's token is now revoked too — clear and return to the landing page.
      localStorage.removeItem('admin_token');
      setAdmin(null);
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  }, []);

  const updateAgentStatus = useCallback(async (agentId: string, action: string, reason?: string): Promise<boolean> => {
    try {
      const response = await adminAuthApi.updateAgentStatus(agentId, action, reason);
      
      if (response.success) {
        toast.success(response.message);
        // Refresh all agents list
        await fetchAllAgents();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
      return false;
    }
  }, [fetchAllAgents]);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        stats,
        pendingAgents,
        allAgents,
        login,
        logout,
        fetchStats,
        fetchPendingAgents,
        fetchAllAgents,
        approveAgent,
        updateAgentStatus,
        refreshProfile,
        changePassword,
        logoutAllDevices,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
