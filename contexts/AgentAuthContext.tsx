'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { agentAuthApi } from '@/lib/services/api';
import { toast } from 'sonner';

interface Agent {
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
  lastLoginAt?: string;
  loginCount?: number;
  createdAt: string;
}

interface AgentAuthContextType {
  agent: Agent | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<Agent>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  region: string;
  expertise: string[];
  availability?: string;
  certifications?: string[];
  gender?: string;
}

const AgentAuthContext = createContext<AgentAuthContextType | undefined>(undefined);

export function AgentAuthProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('agent_token');
      if (token) {
        try {
          const response = await agentAuthApi.getProfile();
          if (response.success) {
            setAgent(response.agent);
          }
        } catch (error) {
          console.error('Failed to restore session:', error);
          localStorage.removeItem('agent_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('AgentAuthContext: Calling login API with email:', email);
      const response = await agentAuthApi.login(email, password);
      console.log('AgentAuthContext: Login API response:', response);
      
      if (response.success) {
        localStorage.setItem('agent_token', response.token);
        setAgent(response.agent);
        toast.success('Login successful');
        return true;
      }
      console.log('AgentAuthContext: Login response success was false');
      return false;
    } catch (error: any) {
      console.error('AgentAuthContext: Login error:', error);
      toast.error(error.message || 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await agentAuthApi.register(data);
      
      if (response.success) {
        toast.success('Registration successful! Please wait for admin approval.');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('agent_token');
    setAgent(null);
    toast.success('Logged out successfully');
    window.location.href = '/';
  }, []);

  const updateProfile = useCallback(async (data: Partial<Agent>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await agentAuthApi.updateProfile(data);
      
      if (response.success) {
        setAgent(response.agent);
        toast.success('Profile updated successfully');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await agentAuthApi.changePassword(currentPassword, newPassword);
      
      if (response.success) {
        toast.success('Password changed successfully');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AgentAuthContext.Provider
      value={{
        agent,
        isLoading,
        isAuthenticated: !!agent,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  const context = useContext(AgentAuthContext);
  if (context === undefined) {
    throw new Error('useAgentAuth must be used within an AgentAuthProvider');
  }
  return context;
}
