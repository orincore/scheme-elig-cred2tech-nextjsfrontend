'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  Info,
  Eye,
  PlusCircle,
  Check,
} from 'lucide-react';
import { DocumentViewer } from '@/components/ui/document-viewer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentFile {
  id: string;
  name: string;
  file: File;
  size: number;
  type: string;
  /** label of the required-doc slot this file was attached to (or 'extra') */
  slotLabel: string;
  previewUrl?: string;
}

interface DocSlot {
  label: string;
  file: DocumentFile | null;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredDocuments: string[];
  onComplete: (documents: DocumentFile[]) => void;
  schemeName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function makeDocFile(file: File, slotLabel: string): DocumentFile {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    file,
    size: file.size,
    type: file.type,
    slotLabel,
    previewUrl: file.type.startsWith('image/') || file.type === 'application/pdf'
      ? URL.createObjectURL(file)
      : undefined,
  };
}

// ── Sub-component: one document slot row ──────────────────────────────────────

function SlotRow({
  label,
  attached,
  onAttach,
  onRemove,
  onPreview,
}: {
  label: string;
  attached: DocumentFile | null;
  onAttach: (file: File) => void;
  onRemove: () => void;
  onPreview: (doc: DocumentFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAttach(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/20">
      {/* Status icon */}
      <div className="shrink-0">
        {attached ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
      </div>

      {/* Label / file name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
        {attached && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {attached.name} · {formatBytes(attached.size)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {attached ? (
          <>
            {attached.previewUrl && (
              <button
                type="button"
                onClick={() => onPreview(attached)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {/* Replace */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Replace file"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export function DocumentUploadDialog({
  open,
  onOpenChange,
  requiredDocuments,
  onComplete,
  schemeName,
}: DocumentUploadDialogProps) {
  // One slot per required document
  const [slots, setSlots] = useState<DocSlot[]>(() =>
    requiredDocuments.map((label) => ({ label, file: null }))
  );
  // Extra free-form files the user wants to include
  const [extras, setExtras] = useState<DocumentFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const extraInputRef = useRef<HTMLInputElement>(null);

  // The scheme's required documents are fetched ASYNC by the parent, so they're
  // usually empty when this dialog first mounts. Re-sync the per-document slots
  // whenever the dialog opens OR the required-docs list changes — otherwise the
  // dialog keeps the stale (empty) slots and shows only "Additional documents".
  // Existing uploads are preserved by matching on label.
  useEffect(() => {
    if (!open) return;
    setSlots((prev) =>
      requiredDocuments.map((label) => {
        const existing = prev.find((s) => s.label === label && s.file);
        return existing ? existing : { label, file: null };
      })
    );
  }, [open, requiredDocuments]);

  // Re-initialise slots when requiredDocuments changes (e.g. dialog is re-opened)
  const resetState = () => {
    setSlots(requiredDocuments.map((label) => ({ label, file: null })));
    setExtras([]);
    setIsSubmitting(false);
    setPreviewDoc(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!isSubmitting) {
      if (!next) resetState();
      onOpenChange(next);
    }
  };

  // Attach file to a specific slot
  const attachToSlot = (idx: number, file: File) => {
    setSlots((prev) => {
      const next = [...prev];
      // Revoke old object URL if any
      if (next[idx].file?.previewUrl) URL.revokeObjectURL(next[idx].file!.previewUrl!);
      next[idx] = { ...next[idx], file: makeDocFile(file, next[idx].label) };
      return next;
    });
  };

  const removeFromSlot = (idx: number) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[idx].file?.previewUrl) URL.revokeObjectURL(next[idx].file!.previewUrl!);
      next[idx] = { ...next[idx], file: null };
      return next;
    });
  };

  // Extra uploads
  const handleExtraSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newExtras = files.map((f) => makeDocFile(f, 'extra'));
    setExtras((prev) => [...prev, ...newExtras]);
    if (extraInputRef.current) extraInputRef.current.value = '';
  };

  const removeExtra = (id: string) => {
    setExtras((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  const handleSubmit = async () => {
    const allDocs: DocumentFile[] = [
      ...slots.filter((s) => s.file !== null).map((s) => s.file!),
      ...extras,
    ];
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600)); // brief visual feedback
    onComplete(allDocs);
    setIsSubmitting(false);
    resetState();
  };

  const handleSkip = () => {
    onComplete([]);
    resetState();
    onOpenChange(false);
  };

  const uploadedCount =
    slots.filter((s) => s.file !== null).length + extras.length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* ── Header ── */}
          <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Upload className="h-5 w-5" />
                Upload Supporting Documents
                <span className="ml-1 text-xs font-normal text-muted-foreground">(Optional)</span>
              </DialogTitle>
              <DialogDescription className="mt-2 space-y-2 text-sm">
                <span className="block">
                  Applying for: <strong>{schemeName}</strong>
                </span>
                <span className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-blue-900 dark:text-blue-200">
                    <strong>Note:</strong> Uploading documents is optional but helps us
                    process your application faster. You can also provide them later when
                    requested by your assigned agent.
                  </span>
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Per-document upload slots */}
            {slots.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em]">
                  Documents required for this scheme
                </p>
                <div className="space-y-2">
                  {slots.map((slot, idx) => (
                    <SlotRow
                      key={idx}
                      label={slot.label}
                      attached={slot.file}
                      onAttach={(file) => attachToSlot(idx, file)}
                      onRemove={() => removeFromSlot(idx)}
                      onPreview={setPreviewDoc}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Extra / additional documents */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em]">
                Additional documents{' '}
                <span className="normal-case font-normal">(any other supporting files)</span>
              </p>

              {extras.length > 0 && (
                <div className="space-y-2">
                  {extras.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(doc.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.previewUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExtra(doc.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => extraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-muted/20 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Add another document
              </button>
              <input
                ref={extraInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                multiple
                className="hidden"
                onChange={handleExtraSelect}
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-border shrink-0">
            {/* Upload progress summary */}
            {uploadedCount > 0 && (
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {uploadedCount} document{uploadedCount > 1 ? 's' : ''} ready to submit
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-2 flex-row">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial"
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2 flex-1 sm:flex-initial"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : uploadedCount > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit with {uploadedCount} Document{uploadedCount > 1 ? 's' : ''}
                  </>
                ) : (
                  <>Continue Without Documents</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen document preview */}
      {previewDoc?.previewUrl && (
        <DocumentViewer
          fileUrl={previewDoc.previewUrl}
          fileName={previewDoc.name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}
