'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { casesApi } from '@/lib/services/api';

interface PendingActionsContextValue {
  /** Pending document uploads + payment requests awaiting payment, across all cases. */
  pendingCount: number;
  /** Re-fetches the count — call after fulfilling a document request or paying a request. */
  refresh: () => void;
}

const PendingActionsContext = createContext<PendingActionsContextValue>({
  pendingCount: 0,
  refresh: () => {},
});

export function usePendingActions() {
  return useContext(PendingActionsContext);
}

/**
 * Wraps the MSME dashboard so the sidebar's "Track Applications" badge and any
 * page that resolves a pending action (document upload, payment) share one
 * source of truth — pages call refresh() on success instead of polling.
 */
export function PendingActionsProvider({ children }: { children: ReactNode }) {
  const { userId, authStep } = useMsmeAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) { setPendingCount(0); return; }
    try {
      const [docsRes, paymentsRes] = await Promise.all([
        casesApi.getMsmeDocumentRequests(parseInt(userId)),
        casesApi.getMsmePaymentRequestsAll(parseInt(userId)),
      ]);
      const pendingDocs = (docsRes?.requests || []).filter((r: any) => r.status === 'PENDING').length;
      const pendingPayments = (paymentsRes?.paymentRequests || []).filter((p: any) => p.status === 'APPROVED').length;
      setPendingCount(pendingDocs + pendingPayments);
    } catch {
      // Best-effort — keep the last known count rather than flashing 0 on a transient error.
    }
  }, [userId]);

  useEffect(() => {
    if (authStep === 'authenticated') load();
    else setPendingCount(0);
  }, [authStep, load]);

  return (
    <PendingActionsContext.Provider value={{ pendingCount, refresh: load }}>
      {children}
    </PendingActionsContext.Provider>
  );
}
