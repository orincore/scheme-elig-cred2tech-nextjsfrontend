'use client';

import { useEffect, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ReceiptText, CheckCircle2, XCircle, Clock, RefreshCw, Lock, FileText, IndianRupee,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface Transaction {
  id: number;
  orderId: string | null;
  paymentId: string | null;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  type: string;
  label: string;
  paidAt: string | null;
  createdAt: string;
  failureReason: string | null;
}

const TYPE_ICON: Record<string, typeof FileText> = {
  PAN_VERIFICATION: Lock,
  REGISTRATION: Lock,
  DATA_REFRESH: FileText,
  REANALYSIS: RefreshCw,
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
    SUCCESS: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', label: 'Success' },
    FAILED: { icon: XCircle, cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300', label: 'Failed' },
    PENDING: { icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', label: 'Pending' },
  };
  const cfg = map[status] || { icon: Clock, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', label: status };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function TransactionsPage() {
  const { authStep } = useMsmeAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('msme_auth_token');
    if (!token && authStep !== 'authenticated') router.push('/');
  }, [authStep, router]);

  useEffect(() => {
    if (authStep !== 'authenticated') return;
    (async () => {
      const token = sessionStorage.getItem('msme_auth_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.success) setTransactions(data.transactions || []);
      } catch {
        /* leave empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [authStep]);

  if (authStep !== 'authenticated') return null;

  const successful = transactions.filter((t) => t.status === 'SUCCESS');
  const totalSpent = successful.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b-2 border-border pb-6">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Billing</p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Transactions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment history — scheme unlocks, PAN data updates and re-run analyses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Payments</p>
              <p className="text-2xl font-bold text-foreground">{successful.length}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total spent</p>
              <p className="text-2xl font-bold text-foreground flex items-center">
                <IndianRupee className="h-5 w-5" />{totalSpent.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <ReceiptText className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-foreground font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Your payments for scheme unlocks, PAN data updates and re-run analyses will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => {
              const Icon = TYPE_ICON[t.type] || ReceiptText;
              return (
                <Card key={t.id} className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                      <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{t.label}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {formatDate(t.paidAt || t.createdAt)}
                        {t.paymentId ? ` · ${t.paymentId}` : t.orderId ? ` · ${t.orderId}` : ''}
                      </p>
                      {t.status === 'FAILED' && t.failureReason && (
                        <p className="text-[12px] text-red-600 dark:text-red-400 mt-0.5 truncate">{t.failureReason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground flex items-center justify-end">
                        <IndianRupee className="h-4 w-4" />{Number(t.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t.currency}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
