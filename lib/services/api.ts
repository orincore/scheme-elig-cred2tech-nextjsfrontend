// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Helper to get auth token
const getToken = (type: 'agent' | 'admin' | 'msme') => {
  if (typeof window === 'undefined') return null;
  
  // MSME tokens are stored in sessionStorage
  if (type === 'msme') {
    return sessionStorage.getItem('msme_auth_token');
  }
  
  const token = localStorage.getItem(`${type}_token`);
  return token;
};

// Generic fetch wrapper
async function fetchApi(
  endpoint: string,
  options: RequestInit = {},
  tokenType: 'agent' | 'admin' | 'msme' = 'msme'
) {
  const token = getToken(tokenType);
  
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(options.headers as Record<string, string> || {}),
    },
  };

  const url = `${API_BASE_URL}${endpoint}`;

  const hadToken = !!token;

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      // Read the server's error message (if any) for clearer errors/toasts.
      let body: any = null;
      try { body = await response.json(); } catch { /* non-JSON body */ }
      const message: string = body?.message || `HTTP error! status: ${response.status}`;

      // Distinguish an INVALIDATED SESSION (a token we sent got rejected — expired,
      // account blocked/suspended, or session revoked) from a request that simply
      // failed (e.g. a login attempt with no token yet, or a validation error).
      // Only the former should clear creds + bounce to login. Without this guard,
      // a login attempt by a blocked account would wrongly say "logged out".
      const blockedOrRevoked =
        response.status === 403 &&
        /account is (not active|inactive|suspended|blocked)|session has been revoked/i.test(message);

      if (hadToken && (response.status === 401 || blockedOrRevoked)) {
        if (tokenType === 'msme') sessionStorage.removeItem('msme_auth_token');
        else localStorage.removeItem(`${tokenType}_token`);
        if (tokenType === 'admin' && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
          window.location.href = '/admin/login';
        }
        const revoked = /session has been revoked/i.test(message);
        throw new Error(
          response.status === 401
            ? 'Your session expired. Please log in again.'
            : revoked
              ? 'Your session has ended. Please log in again.'
              : 'Your admin access has been blocked. You have been logged out.',
        );
      }

      // No active session involved → surface the REAL server message so callers
      // (e.g. the login page) can show the actual reason.
      throw new Error(message);
    }

    return await response.json();
  } catch (error: any) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ==================== AGENT AUTH APIs ====================

export const agentAuthApi = {
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    region: string;
    expertise: string[];
    availability?: string;
    certifications?: string[];
    gender?: string;
  }) => fetchApi('/api/agent-auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }, 'msme'),
  
  login: (email: string, password: string) => fetchApi('/api/agent-auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, 'agent'),

  forgotPassword: (email: string) => fetchApi('/api/agent-auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }, 'agent'),

  resetPassword: (email: string, otp: string, newPassword: string) => fetchApi('/api/agent-auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  }, 'agent'),

  getProfile: () => fetchApi('/api/agent-auth/profile', {}, 'agent'),
  
  updateProfile: (data: any) => fetchApi('/api/agent-auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }, 'agent'),
  
  changePassword: (currentPassword: string, newPassword: string) => fetchApi('/api/agent-auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  }, 'agent'),

  clearAvailabilityLog: () =>
    fetchApi('/api/agent-auth/availability-log', { method: 'DELETE' }, 'agent'),

  getAvailabilityLog: (params?: { from?: string; to?: string }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/agent-auth/availability-log${query ? '?' + query : ''}`, {}, 'agent');
  },
};

// ==================== ADMIN AUTH APIs ====================

export const adminAuthApi = {
  login: (email: string, password: string) => fetchApi('/api/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, 'admin'),
  
  getProfile: () => fetchApi('/api/admin-auth/profile', {}, 'admin'),

  updateProfile: (data: { fullName?: string; email?: string; phone?: string }) =>
    fetchApi('/api/admin-auth/profile', { method: 'PUT', body: JSON.stringify(data) }, 'admin'),

  changePassword: (oldPassword: string, newPassword: string) =>
    fetchApi('/api/admin-auth/profile/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }, 'admin'),

  logoutAllDevices: () =>
    fetchApi('/api/admin-auth/profile/logout-all', { method: 'POST' }, 'admin'),

  getDashboardStats: () => fetchApi('/api/admin-auth/dashboard/stats', {}, 'admin'),
  
  getPendingAgents: () => fetchApi('/api/admin-auth/agents/pending', {}, 'admin'),
  
  getAllAgents: (params?: { status?: string; approvalStatus?: string }) => {
    const query = new URLSearchParams(params || {}).toString();
    return fetchApi(`/api/admin-auth/agents?${query}`, {}, 'admin');
  },

  getAgentById: (agentId: string | number) =>
    fetchApi(`/api/admin-auth/agents/${agentId}`, {}, 'admin'),
  
  approveAgent: (agentId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) => fetchApi(`/api/admin-auth/agents/${agentId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ action, rejectionReason }),
  }, 'admin'),
  
  updateAgentStatus: (agentId: string, action: string, reason?: string) => fetchApi(`/api/admin-auth/agents/${agentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ action, reason }),
  }, 'admin'),

  adminUpdateAgent: (agentId: string, payload: { fullName?: string; email?: string; phone?: string; gender?: string; region?: string; pincode?: string; expertise?: string[]; certifications?: string[] }) =>
    fetchApi(`/api/admin-auth/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, 'admin'),

  updateAgentSchemes: (agentId: string, payload: { supportedSchemes: string[]; city?: string; state?: string; pincode?: string }) =>
    fetchApi(`/api/admin-auth/agents/${agentId}/schemes`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, 'admin'),

  updateAgentAvailability: (agentId: string, availability: string) => fetchApi(`/api/admin-auth/agents/${agentId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({ availability }),
  }, 'admin'),

  getAgentAvailabilityLog: (agentId: string | number, params?: { from?: string; to?: string }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/admin-auth/agents/${agentId}/availability-log${query ? '?' + query : ''}`, {}, 'admin');
  },

  // ── AI usage & cost monitoring ──
  getAiUsageSummary: (params?: { from?: string; to?: string; stage?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v) as [string, string][]
    ).toString();
    return fetchApi(`/api/admin-auth/ai-usage/summary${query ? '?' + query : ''}`, {}, 'admin');
  },

  getAiUsageLog: (params?: { from?: string; to?: string; userId?: string; stage?: string; page?: number; pageSize?: number }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/admin-auth/ai-usage${query ? '?' + query : ''}`, {}, 'admin');
  },

  // ── Admin account management (SUPER_ADMIN) ──
  listAdmins: () => fetchApi('/api/admin-auth/admins', {}, 'admin'),

  getAdminByCode: (adminCode: string) =>
    fetchApi(`/api/admin-auth/admins/${adminCode}`, {}, 'admin'),

  createAdmin: (data: { fullName: string; email: string; phone?: string; role?: string }) =>
    fetchApi('/api/admin-auth/admins', { method: 'POST', body: JSON.stringify(data) }, 'admin'),

  updateAdminStatus: (id: string | number, status: string) =>
    fetchApi(`/api/admin-auth/admins/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, 'admin'),

  resetAdminPassword: (id: string | number) =>
    fetchApi(`/api/admin-auth/admins/${id}/reset-password`, { method: 'POST' }, 'admin'),

  deleteAdmin: (id: string | number) =>
    fetchApi(`/api/admin-auth/admins/${id}`, { method: 'DELETE' }, 'admin'),

  // ── Audit log (SUPER_ADMIN) ──
  getAuditLog: (params?: { adminId?: string; action?: string; from?: string; to?: string; page?: number; pageSize?: number }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/admin-auth/audit${query ? '?' + query : ''}`, {}, 'admin');
  },

  // ── Scheme ingestion control (proxies to AI engine) ──
  getSchemeIngestionStats: () =>
    fetchApi('/api/admin/scheme-ingestion/scheme-stats', {}, 'admin'),

  getIngestionStatus: () =>
    fetchApi('/api/admin/scheme-ingestion/status', {}, 'admin'),

  getIngestionRuns: (params?: { limit?: number; source?: string }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/admin/scheme-ingestion/runs${query ? '?' + query : ''}`, {}, 'admin');
  },

  runIngestion: (source: 'emsme' | 'myscheme', force = false) =>
    fetchApi('/api/admin/scheme-ingestion/run', {
      method: 'POST',
      body: JSON.stringify({ source, force }),
    }, 'admin'),

  // ── Scheme catalogue: categories (admin CRUD) ──
  listCategories: () => fetchApi('/api/admin/categories', {}, 'admin'),
  createCategory: (data: { label: string; key?: string; icon?: string; color?: string; order?: number; isActive?: boolean }) =>
    fetchApi('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  updateCategory: (id: string, data: any) =>
    fetchApi(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),
  deleteCategory: (id: string) =>
    fetchApi(`/api/admin/categories/${id}`, { method: 'DELETE' }, 'admin'),
  reorderCategories: (order: string[]) =>
    fetchApi('/api/admin/categories/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }, 'admin'),

  // ── Scheme catalogue: schemes (admin CRUD) ──
  listAdminSchemes: (params?: { search?: string; source?: string; category?: string; level?: string; page?: number; limit?: number }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/admin/schemes${query ? '?' + query : ''}`, {}, 'admin');
  },
  getAdminScheme: (id: string) => fetchApi(`/api/admin/schemes/${id}`, {}, 'admin'),
  createScheme: (data: any) => fetchApi('/api/admin/schemes', { method: 'POST', body: JSON.stringify(data) }, 'admin'),
  updateScheme: (id: string, data: any) => fetchApi(`/api/admin/schemes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),
  deleteScheme: (id: string) => fetchApi(`/api/admin/schemes/${id}`, { method: 'DELETE' }, 'admin'),

  // ── Payment pricing management ──
  listPricing: () => fetchApi('/api/admin/pricing', {}, 'admin'),
  updatePricing: (serviceType: string, data: { amount?: number; currency?: string; isActive?: boolean }) =>
    fetchApi(`/api/admin/pricing/${serviceType}`, { method: 'PATCH', body: JSON.stringify(data) }, 'admin'),

  // ── MSME User management (read-only) ──
  listMsmeUsers: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const clean = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const query = new URLSearchParams(clean).toString();
    return fetchApi(`/api/admin-auth/msme-users${query ? '?' + query : ''}`, {}, 'admin');
  },

  getMsmeUserDetail: (id: string | number) =>
    fetchApi(`/api/admin-auth/msme-users/${id}`, {}, 'admin'),

  // Force-delete an MSME user and ALL their records (cases, businesses, snapshots…).
  forceDeleteMsmeUser: (id: string | number) =>
    fetchApi(`/api/admin-auth/msme-users/${id}/force`, { method: 'DELETE' }, 'admin'),
};

// ==================== CASE APIs ====================

export const casesApi = {
  // MSME endpoints
  createCase: (data: {
    msmeUserId: number;
    schemeId: string;
    schemeName?: string;
    applicationData?: any;
  }) => fetchApi('/api/cases/internal/create-from-application', {
    method: 'POST',
    body: JSON.stringify(data),
  }, 'msme'),

  createCaseWithDocuments: async (
    data: {
      msmeUserId: number;
      schemeId: string;
      schemeName?: string;
      applicationData?: any;
    },
    documents: File[]
  ): Promise<any> => {
    const token = getToken('msme');
    const formData = new FormData();
    
    // Add case data as JSON string
    formData.append('caseData', JSON.stringify(data));
    
    // Add document files
    documents.forEach((file, index) => {
      formData.append('documents', file);
    });

    const response = await fetch(`${API_BASE_URL}/api/cases/internal/create-with-documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (response.status === 401) throw new Error('Invalid token');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || `Application submission failed: ${response.status}`);
    }
    return response.json();
  },

  getMsmeCases: (msmeUserId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (msmeUserId) params.append('msmeUserId', msmeUserId.toString());
    if (status) params.append('status', status);
    const query = params.toString();
    return fetchApi(`/api/cases/msme/my-cases${query ? '?' + query : ''}`, {}, 'msme');
  },

  getMsmeCaseDetails: (caseId: string, msmeUserId: number) => fetchApi(`/api/cases/msme/${caseId}?msmeUserId=${msmeUserId}`, {}, 'msme'),

  getMsmeUpcomingMeeting: (caseId: string, msmeUserId: number) =>
    fetchApi(`/api/cases/msme/${caseId}/meeting?msmeUserId=${msmeUserId}`, {}, 'msme'),

  // Agreement (MSME)
  getMsmeAgreement: (caseId: string, msmeUserId: number) =>
    fetchApi(`/api/cases/msme/${caseId}/agreement?msmeUserId=${msmeUserId}`, {}, 'msme'),

  getMsmeAgreementUrl: (caseId: string, msmeUserId: number, version?: 'signed' | 'original') =>
    fetchApi(`/api/cases/msme/${caseId}/agreement/url?msmeUserId=${msmeUserId}${version ? `&version=${version}` : ''}`, {}, 'msme'),

  signAgreementAsMsme: (caseId: string, msmeUserId: number, fullName: string) =>
    fetchApi(`/api/cases/msme/${caseId}/agreement/sign?msmeUserId=${msmeUserId}`, {
      method: 'POST',
      body: JSON.stringify({ fullName }),
    }, 'msme'),

  // Documents the MSME user uploaded for one of their own cases
  getMsmeCaseDocuments: (caseId: string, msmeUserId: number) =>
    fetchApi(`/api/cases/msme/${caseId}/documents?msmeUserId=${msmeUserId}`, {}, 'msme'),

  deleteCase: (caseId: string, msmeUserId: number) => fetchApi(`/api/cases/msme/${caseId}?msmeUserId=${msmeUserId}`, {
    method: 'DELETE',
  }, 'msme'),

  // Agent endpoints
  getAgentCases: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi(`/api/cases/agent/my-cases${query}`, {}, 'agent');
  },
  
  getAgentCaseDetails: (caseId: string) => fetchApi(`/api/cases/agent/${caseId}`, {}, 'agent'),

  getAgentCaseMeetings: (caseId: string) => fetchApi(`/api/cases/agent/${caseId}/meetings`, {}, 'agent'),

  // Agreement (agent)
  getAgentAgreement: (caseId: string) => fetchApi(`/api/cases/agent/${caseId}/agreement`, {}, 'agent'),

  getAgentAgreementUrl: (caseId: string, version?: 'signed' | 'original') =>
    fetchApi(`/api/cases/agent/${caseId}/agreement/url${version ? `?version=${version}` : ''}`, {}, 'agent'),

  signAgreementAsAgent: (caseId: string, fullName: string) =>
    fetchApi(`/api/cases/agent/${caseId}/agreement/sign`, {
      method: 'POST',
      body: JSON.stringify({ fullName }),
    }, 'agent'),
  
  updateCaseStatus: (caseId: string, status: string, notes?: string) => fetchApi(`/api/cases/agent/${caseId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  }, 'agent'),
  
  addCaseNote: (caseId: string, agentNotes: string) => fetchApi(`/api/cases/agent/${caseId}/notes`, {
    method: 'PUT',
    body: JSON.stringify({ agentNotes, noteType: 'AGENT' }),
  }, 'agent'),
  
  closeCase: (caseId: string, closureReason: string, closureNotes?: string) => fetchApi(`/api/cases/agent/${caseId}/close`, {
    method: 'PUT',
    body: JSON.stringify({ closureReason, closureNotes }),
  }, 'agent'),
  
  getAgentCaseHistory: () => fetchApi('/api/cases/agent/history', {}, 'agent'),

  // ── Document upload (multipart — bypasses the JSON fetchApi wrapper) ───────
  uploadCaseDocument: async (caseId: string, file: File, documentTag?: string): Promise<any> => {
    const token = getToken('agent');
    const formData = new FormData();
    formData.append('file', file);
    if (documentTag) formData.append('documentTag', documentTag);

    const response = await fetch(`${API_BASE_URL}/api/cases/agent/${caseId}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (response.status === 401) throw new Error('Invalid token');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || `Upload failed: ${response.status}`);
    }
    return response.json();
  },

  getCaseDocuments: (caseId: string) =>
    fetchApi(`/api/cases/agent/${caseId}/documents`, {}, 'agent'),

  getDocumentUrl: (caseId: string, documentId: string) =>
    fetchApi(`/api/cases/agent/${caseId}/documents/${documentId}/url`, {}, 'agent'),

  getDocumentRequestUrl: (caseId: string, requestId: string) =>
    fetchApi(`/api/cases/agent/${caseId}/document-requests/${requestId}/url`, {}, 'agent'),

  getMsmeDocumentUrl: (caseId: string, documentId: string, msmeUserId: number) =>
    fetchApi(`/api/cases/msme/${caseId}/documents/${documentId}/url?msmeUserId=${msmeUserId}`, {}, 'msme'),

  getMsmeDocumentRequestUrl: (requestId: string, msmeUserId: number) =>
    fetchApi(`/api/cases/msme/document-requests/${requestId}/url?msmeUserId=${msmeUserId}`, {}, 'msme'),

  getAdminDocumentUrl: (caseId: string, documentId: string) =>
    fetchApi(`/api/cases/admin/${caseId}/documents/${documentId}/url`, {}, 'admin'),

  logContactMSME: (caseId: string, method: string, notes?: string) =>
    fetchApi(`/api/cases/agent/${caseId}/contact`, {
      method: 'PUT',
      body: JSON.stringify({ method, notes }),
    }, 'agent'),

  // ── Document requests (agent) ──────────────────────────────────────────────
  createDocumentRequest: (caseId: string, documentName: string, description?: string) =>
    fetchApi(`/api/cases/agent/${caseId}/document-requests`, {
      method: 'POST',
      body: JSON.stringify({ documentName, description }),
    }, 'agent'),

  getDocumentRequests: (caseId: string) =>
    fetchApi(`/api/cases/agent/${caseId}/document-requests`, {}, 'agent'),

  // ── Document requests (MSME) ───────────────────────────────────────────────
  getMsmeDocumentRequests: (msmeUserId: number) =>
    fetchApi(`/api/cases/msme/document-requests?msmeUserId=${msmeUserId}`, {}, 'msme'),

  fulfillDocumentRequest: async (requestId: string, msmeUserId: number, file: File): Promise<any> => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE_URL}/api/cases/msme/document-requests/${requestId}/upload?msmeUserId=${msmeUserId}`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || `Upload failed: ${response.status}`);
    }
    return response.json();
  },

  // Admin endpoints
  getAllCases: (filters?: { status?: string; agentId?: string; priority?: string }) => {
    const query = new URLSearchParams(filters || {}).toString();
    return fetchApi(`/api/cases?${query}`, {}, 'admin');
  },
  
  getAdminCaseDetails: (caseId: string) => fetchApi(`/api/cases/admin/${caseId}`, {}, 'admin'),
  
  getEligibleAgents: (caseId: string) =>
    fetchApi(`/api/cases/${caseId}/eligible-agents`, {}, 'admin'),

  assignCase: (caseId: string, agentId: number, notes?: string) => fetchApi(`/api/cases/${caseId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ agentId, notes }),
  }, 'admin'),
  
  reassignCase: (caseId: string, newAgentId: number, reason?: string) => fetchApi(`/api/cases/${caseId}/reassign`, {
    method: 'PUT',
    body: JSON.stringify({ newAgentId, reason }),
  }, 'admin'),
  
  updateCaseStatusAdmin: (caseId: string, status: string, notes?: string) => fetchApi(`/api/cases/${caseId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  }, 'admin'),

  updateCasePriority: (caseId: string, priority: string) => fetchApi(`/api/cases/${caseId}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority }),
  }, 'admin'),
  
  addAdminNote: (caseId: string, adminNotes: string, msmeNotes?: string) => fetchApi(`/api/cases/${caseId}/notes/admin`, {
    method: 'PUT',
    body: JSON.stringify({ adminNotes, msmeNotes, noteType: 'ADMIN' }),
  }, 'admin'),

  // Meetings (admin)
  getCaseMeetings: (caseId: string) => fetchApi(`/api/cases/${caseId}/meetings`, {}, 'admin'),

  // Agreement (admin)
  getAgreement: (caseId: string) => fetchApi(`/api/cases/${caseId}/agreement`, {}, 'admin'),

  getAgreementUrl: (caseId: string, version?: 'signed' | 'original') =>
    fetchApi(`/api/cases/${caseId}/agreement/url${version ? `?version=${version}` : ''}`, {}, 'admin'),

  uploadAgreement: async (caseId: string, file: File): Promise<any> => {
    const token = getToken('admin');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}/agreement`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (response.status === 401) throw new Error('Invalid token');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || `Upload failed: ${response.status}`);
    }
    return response.json();
  },

  removeAgreement: (caseId: string) => fetchApi(`/api/cases/${caseId}/agreement`, { method: 'DELETE' }, 'admin'),

  scheduleMeeting: (caseId: string, dto: {
    platform: string;
    scheduledAt: string;
    durationMinutes?: number;
    meetingLink?: string;
    dialInInfo?: string;
    location?: string;
    notes?: string;
  }) => fetchApi(`/api/cases/${caseId}/meeting`, {
    method: 'POST',
    body: JSON.stringify(dto),
  }, 'admin'),

  rescheduleMeeting: (caseId: string, meetingId: string, scheduledAt: string, reason?: string) =>
    fetchApi(`/api/cases/${caseId}/meeting/${meetingId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ scheduledAt, reason }),
    }, 'admin'),

  cancelMeeting: (caseId: string, meetingId: string, reason?: string) =>
    fetchApi(`/api/cases/${caseId}/meeting/${meetingId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }, 'admin'),

  completeMeeting: (caseId: string, meetingId: string) =>
    fetchApi(`/api/cases/${caseId}/meeting/${meetingId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }, 'admin'),
};

export const msmeAuthApi = {
  sendEligibilityReport: (token: string, schemes: object[], pdfBase64?: string) =>
    fetch(`${API_BASE_URL}/api/msme-auth/send-eligibility-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ schemes, pdfBase64 }),
    }).then((r) => r.json()),
};

// Public, read-only display categories (admin-curated) for the dashboard buckets.
// No auth. Returns { success, categories: [{key,label,icon,color,order}] }.
export const getPublicCategories = () =>
  fetch(`${API_BASE_URL}/api/categories`).then((r) => r.json()).catch(() => ({ success: false, categories: [] }));

// CICRA consent management — credit-data endpoints (PAN verify, eligibility,
// refresh) are gated server-side and require a valid 180-day consent.
export const consentApi = {
  getStatus: () => fetchApi('/api/consent/status', {}, 'msme'),
  grant: (consentText?: string) =>
    fetchApi('/api/consent', {
      method: 'POST',
      body: JSON.stringify(consentText ? { consentText } : {}),
    }, 'msme'),
  withdraw: () =>
    fetchApi('/api/consent/withdraw', { method: 'POST', body: '{}' }, 'msme'),
  history: () => fetchApi('/api/consent/history', {}, 'msme'),
};

export { API_BASE_URL, getToken };
