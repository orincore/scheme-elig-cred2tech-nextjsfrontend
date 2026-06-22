'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSignature, Upload, Eye, PenLine, CheckCircle2, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface AgreementSignature {
  name: string;
  signedAt: string;
}

export interface AgreementInfo {
  id: string | number;
  caseId: string | number;
  originalFileName?: string;
  status: 'PENDING_SIGNATURES' | 'FULLY_SIGNED';
  hasSigned: boolean;
  currentVersion: 'signed' | 'original';
  agent: AgreementSignature | null;
  msme: AgreementSignature | null;
}

type Role = 'admin' | 'agent' | 'msme';

interface AgreementCardProps {
  role: Role;
  agreement: AgreementInfo | null;
  loading?: boolean;
  /** Admin only: gates the Upload action until an agent is assigned to the case. */
  canUpload?: boolean;
  onUpload?: (file: File) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  onView: () => void | Promise<void>;
  onSign?: () => void;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function SignaturePill({ label, signature }: { label: string; signature: AgreementSignature | null }) {
  if (signature) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-green-700 dark:text-green-400">{label} signed</p>
          <p className="text-[10px] text-green-600/80 dark:text-green-400/70 truncate">{signature.name} · {fmtDateTime(signature.signedAt)}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 border border-border px-3 py-2">
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-[11px] font-semibold text-muted-foreground">{label} signature pending</p>
    </div>
  );
}

export function AgreementCard({ role, agreement, loading, canUpload = true, onUpload, onRemove, onView, onSign }: AgreementCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (agreement?.hasSigned && !window.confirm(
      'This agreement already has one or more signatures. Updating it will clear all existing signatures and both parties will need to sign again. Continue?',
    )) {
      return;
    }
    onUpload?.(file);
  };

  const handleRemoveClick = () => {
    if (!window.confirm(
      'Remove this service agreement? This deletes the uploaded file(s) and any signatures permanently. Both parties will be notified. This cannot be undone.',
    )) {
      return;
    }
    onRemove?.();
  };

  const mySignature = role === 'agent' ? agreement?.agent : role === 'msme' ? agreement?.msme : null;
  const canSign = (role === 'agent' || role === 'msme') && agreement && !mySignature;

  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-bold text-foreground flex-1">Service Agreement</h3>
        {role === 'admin' && agreement && (
          <>
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFilePicked} />
            <button
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <RefreshCw className="h-3.5 w-3.5" />Update
            </button>
            <button
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleRemoveClick}
            >
              <Trash2 className="h-3.5 w-3.5" />Remove
            </button>
          </>
        )}
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : !agreement ? (
          role === 'admin' ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <p className="text-sm text-muted-foreground/60 italic">No agreement uploaded yet</p>
              {canUpload ? (
                <>
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFilePicked} />
                  <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" />Upload Agreement
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground/50">Assign an agent before uploading an agreement</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <p className="text-sm text-muted-foreground/60 italic">No agreement available yet</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{agreement.originalFileName || 'Service Agreement.pdf'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {agreement.status === 'FULLY_SIGNED' ? 'Fully executed — showing the signed copy' : 'Awaiting signatures'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onView()} className="gap-1.5 shrink-0">
                <Eye className="h-3.5 w-3.5" />View{agreement.status === 'FULLY_SIGNED' ? ' Signed Copy' : ''}
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <SignaturePill label="Agent" signature={agreement.agent} />
              <SignaturePill label="MSME" signature={agreement.msme} />
            </div>

            {canSign && (
              <Button size="sm" onClick={onSign} className="gap-1.5 w-full sm:w-auto">
                <PenLine className="h-3.5 w-3.5" />Sign Agreement
              </Button>
            )}
            {mySignature && agreement.status !== 'FULLY_SIGNED' && (
              <p className="text-[11px] text-muted-foreground italic">You signed on {fmtDateTime(mySignature.signedAt)} — waiting for the other party.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
