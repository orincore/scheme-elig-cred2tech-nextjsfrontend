'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSignature, Upload, Eye, PenLine, CheckCircle2, Clock, RefreshCw, Trash2, Sparkles, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export interface AgreementSignature {
  name: string;
  signedAt: string;
  method?: 'EMAIL_OTP' | 'MOBILE_OTP' | null;
}

export interface AgreementInfo {
  id: string | number;
  caseId: string | number;
  originalFileName?: string;
  status: 'PENDING_SIGNATURES' | 'FULLY_SIGNED';
  hasSigned: boolean;
  currentVersion: 'signed' | 'original';
  isGenerated?: boolean;
  agent: AgreementSignature | null;
  msme: AgreementSignature | null;
}

type Role = 'admin' | 'agent' | 'msme';

interface AgreementCardProps {
  role: Role;
  agreement: AgreementInfo | null;
  loading?: boolean;
  /** Admin only: gates Generate/Upload until an agent is assigned. */
  canUpload?: boolean;
  generating?: boolean;
  onGenerate?: () => void | Promise<void>;
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

function methodIcon(method?: string | null) {
  if (method === 'EMAIL_OTP') return <Mail className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />;
  if (method === 'MOBILE_OTP') return <Smartphone className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />;
  return null;
}

function methodLabel(method?: string | null) {
  if (method === 'EMAIL_OTP') return 'via Email OTP';
  if (method === 'MOBILE_OTP') return 'via Mobile OTP';
  return '';
}

function SignaturePill({ label, signature }: { label: string; signature: AgreementSignature | null }) {
  if (signature) {
    return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-green-700 dark:text-green-400">{label} signed</p>
          <p className="text-[10px] text-green-600/80 dark:text-green-400/70 truncate">{signature.name} · {fmtDateTime(signature.signedAt)}</p>
          {signature.method && (
            <div className="flex items-center gap-1 mt-0.5">
              {methodIcon(signature.method)}
              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium">
                Digitally signed {methodLabel(signature.method)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-2">
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-[11px] font-semibold text-muted-foreground">{label} signature pending</p>
    </div>
  );
}

export function AgreementCard({
  role, agreement, loading, canUpload = true, generating,
  onGenerate, onUpload, onRemove, onView, onSign,
}: AgreementCardProps) {
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
    )) return;
    onRemove?.();
  };

  const handleGenerateClick = () => {
    if (agreement && !window.confirm(
      agreement.hasSigned
        ? 'Regenerating will create a new agreement and CLEAR all existing signatures. Both parties will need to sign again. Continue?'
        : 'Regenerate the service agreement? The current version will be replaced. Continue?',
    )) return;
    onGenerate?.();
  };

  const mySignature = role === 'agent' ? agreement?.agent : role === 'msme' ? agreement?.msme : null;
  const canSign = (role === 'agent' || role === 'msme') && agreement && !mySignature;

  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2 flex-wrap">
        <FileSignature className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-bold text-foreground flex-1">Service Agreement</h3>
        {role === 'admin' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {agreement && (
              <>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFilePicked} />
                <button
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!generating}
                >
                  <Upload className="h-3.5 w-3.5" />Upload PDF
                </button>
                <button
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 border border-border text-muted-foreground bg-muted/20 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  onClick={handleRemoveClick}
                  disabled={!!generating}
                >
                  <Trash2 className="h-3.5 w-3.5" />Remove
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : !agreement ? (
          role === 'admin' ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <p className="text-sm text-muted-foreground/60 italic">No agreement yet</p>
              {canUpload ? (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Button
                    size="sm"
                    onClick={handleGenerateClick}
                    disabled={!!generating}
                    className="gap-1.5"
                  >
                    {generating
                      ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />Generating…</span>
                      : <><Sparkles className="h-3.5 w-3.5" />Generate Agreement</>
                    }
                  </Button>
                  <span className="text-[11px] text-muted-foreground">or</span>
                  <>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFilePicked} />
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />Upload PDF
                    </Button>
                  </>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50">Assign an agent before generating an agreement</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <p className="text-sm text-muted-foreground/60 italic">No agreement available yet</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* File header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{agreement.originalFileName || 'Service Agreement.pdf'}</p>
                  {agreement.isGenerated && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 px-1.5 py-0.5">
                      <Sparkles className="h-2.5 w-2.5" />AUTO
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {agreement.status === 'FULLY_SIGNED' ? 'Fully executed — showing the signed copy' : 'Awaiting signatures'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateClick}
                    disabled={!!generating}
                    className="gap-1.5"
                  >
                    {generating
                      ? <><span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />Generating…</>
                      : <><RefreshCw className="h-3.5 w-3.5" />Regenerate</>
                    }
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onView()} className="gap-1.5 shrink-0">
                  <Eye className="h-3.5 w-3.5" />View{agreement.status === 'FULLY_SIGNED' ? ' Signed' : ''}
                </Button>
              </div>
            </div>

            {/* Signature pills */}
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
              <p className="text-[11px] text-muted-foreground italic">
                You signed on {fmtDateTime(mySignature.signedAt)}
                {mySignature.method && ` ${methodLabel(mySignature.method)}`}
                {' '}— waiting for the other party.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
