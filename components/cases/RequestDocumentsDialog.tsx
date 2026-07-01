'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import {
  fieldLabelClass,
  fieldWrapperClass,
  fieldInputClass,
} from '@/components/ui/underline-field';
import { FilePlus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocRow {
  name: string;
  description: string;
}

interface RequestDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string) => Promise<{ success?: boolean } | any>;
  onDone?: () => void | Promise<void>;
}

export function RequestDocumentsDialog({
  open, onOpenChange, onCreate, onDone,
}: RequestDocumentsDialogProps) {
  const [rows, setRows] = useState<DocRow[]>([{ name: '', description: '' }]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setRows([{ name: '', description: '' }]); setSubmitting(false); };

  const update = (i: number, patch: Partial<DocRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { name: '', description: '' }]);
  const removeRow = (i: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const validRows = rows.filter((r) => r.name.trim());

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) { toast.error('Please enter at least one document name'); return; }
    setSubmitting(true);
    let ok = 0;
    let fail = 0;
    for (const r of validRows) {
      try {
        const res = await onCreate(r.name.trim(), r.description.trim() || undefined);
        if (res && res.success === false) fail++; else ok++;
      } catch {
        fail++;
      }
    }
    setSubmitting(false);
    if (ok === 0) { toast.error('Could not send the document requests. Please try again.'); return; }
    toast.success(
      `${ok} document request${ok > 1 ? 's' : ''} sent to MSME${fail ? ` · ${fail} failed` : ''}`,
    );
    await onDone?.();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-[#0a1628] dark:text-[#e6edf7]">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
              <FilePlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            Request Documents
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
            Request one or more documents — the MSME sees them on their application tracking page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1 max-h-[55vh] overflow-y-auto pr-0.5">
          {rows.map((row, i) => (
            <div
              key={i}
              className="border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4a5d73] dark:text-[#94a3b8]">
                  Document {i + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={submitting}
                    className="p-1 text-[#4a5d73] dark:text-[#94a3b8] hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div>
                <label className={fieldLabelClass}>Document Name *</label>
                <div className={fieldWrapperClass(false, submitting)}>
                  <input
                    type="text"
                    placeholder="e.g. GST Certificate, Aadhaar…"
                    value={row.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    disabled={submitting}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              <div>
                <label className={fieldLabelClass}>Instructions (optional)</label>
                <div className={cn(
                  'pb-2 border-b transition-colors',
                  'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400',
                  submitting && 'opacity-60',
                )}>
                  <textarea
                    placeholder="Any specific instructions for the MSME…"
                    value={row.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    disabled={submitting}
                    rows={2}
                    className="w-full bg-transparent border-0 outline-none resize-none text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold p-0 focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-border text-[13px] font-semibold text-[#4a5d73] dark:text-[#94a3b8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another document
          </button>
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="text-[13px] font-semibold text-[#4a5d73] dark:text-[#94a3b8] hover:text-[#0a1628] dark:hover:text-white transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <TravelingBorderButton
            onClick={handleSubmit}
            disabled={validRows.length === 0 || submitting}
            size="sm"
            solid
            showIcon={!submitting}
            className="rounded-[10px] min-w-[140px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
                Sending…
              </span>
            ) : (
              <span>
                Send {validRows.length > 0 ? `${validRows.length} ` : ''}
                Request{validRows.length === 1 ? '' : 's'}
              </span>
            )}
          </TravelingBorderButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
