'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FilePlus, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface DocRow {
  name: string;
  description: string;
}

interface RequestDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Create ONE document request. Resolves with the API result; a falsy
   * `success` (or a throw) is treated as a failure for that row.
   */
  onCreate: (name: string, description?: string) => Promise<{ success?: boolean } | any>;
  /** Called once after the batch is sent, so the caller can refresh its list. */
  onDone?: () => void | Promise<void>;
}

/**
 * Shared "Request Documents" dialog for the admin + agent case pages. Lets the
 * user request MULTIPLE documents in one go: add as many rows as needed, then
 * submit — each row is sent via `onCreate` (the API takes one at a time).
 */
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
    if (submitting) return;            // don't close mid-send
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
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5" />
            Request Documents
          </DialogTitle>
          <DialogDescription>
            Request one or more documents — the MSME sees them on their application tracking page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[55vh] overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Document {i + 1}</Label>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={submitting}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Document name e.g. GST Certificate, Aadhaar…"
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="h-9 text-sm"
                disabled={submitting}
              />
              <Textarea
                placeholder="Instructions (optional)…"
                value={row.description}
                onChange={(e) => update(i, { description: e.target.value })}
                rows={2}
                disabled={submitting}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={submitting}
            className="w-full gap-1.5 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add another document
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={validRows.length === 0 || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send {validRows.length > 0 ? `${validRows.length} ` : ''}Request{validRows.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
