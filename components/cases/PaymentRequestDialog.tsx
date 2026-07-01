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
import { IndianRupee, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const PAYMENT_REQUEST_CATEGORIES = [
  { value: 'DOCUMENT_FEE', label: 'Document Fee' },
  { value: 'SUCCESS_FEE', label: 'Success Fee' },
  { value: 'CUSTOM', label: 'Custom' },
];

interface PaymentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: { category: string; customTitle?: string; reason: string; amount: number }) => Promise<{ success?: boolean; message?: string } | any>;
  onDone?: () => void | Promise<void>;
}

export function PaymentRequestDialog({ open, onOpenChange, onSubmit, onDone }: PaymentRequestDialogProps) {
  const [category, setCategory] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory(''); setCustomTitle(''); setReason(''); setAmount(''); setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!category) { toast.error('Please select a category'); return; }
    if (category === 'CUSTOM' && !customTitle.trim()) { toast.error('Please enter a title for this custom fee'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason for this payment request'); return; }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) { toast.error('Please enter a valid amount'); return; }

    setSubmitting(true);
    try {
      const res = await onSubmit({
        category,
        customTitle: category === 'CUSTOM' ? customTitle.trim() : undefined,
        reason: reason.trim(),
        amount: amountNum,
      });
      if (res && res.success === false) {
        toast.error(res.message || 'Failed to submit payment request');
        return;
      }
      toast.success('Payment request submitted for admin approval');
      await onDone?.();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = !!category &&
    (category !== 'CUSTOM' || customTitle.trim().length > 0) &&
    reason.trim().length > 0 &&
    Number(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-[#0a1628] dark:text-[#e6edf7]">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
              <IndianRupee className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            Request Payment
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
            This will be sent to admin for approval before the MSME is asked to pay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Category select */}
          <div>
            <label className={fieldLabelClass}>Category</label>
            <div className={fieldWrapperClass(false, submitting)}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
                className={cn(fieldInputClass, 'appearance-none cursor-pointer')}
              >
                <option value="" disabled>Select a category…</option>
                {PAYMENT_REQUEST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 pointer-events-none" />
            </div>
          </div>

          {category === 'CUSTOM' && (
            <div>
              <label className={fieldLabelClass}>Title</label>
              <div className={fieldWrapperClass(false, submitting)}>
                <input
                  type="text"
                  placeholder="e.g. Inspection Charge"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  disabled={submitting}
                  maxLength={150}
                  className={fieldInputClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className={fieldLabelClass}>Reason</label>
            <div className={cn(
              'pb-2 border-b transition-colors',
              'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400',
              submitting && 'opacity-60',
            )}>
              <textarea
                placeholder="Why is this payment needed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                rows={3}
                className="w-full bg-transparent border-0 outline-none resize-none text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold p-0 focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className={fieldLabelClass}>Amount (₹)</label>
            <div className={fieldWrapperClass(false, submitting)}>
              <span className="text-[15px] font-semibold text-[#4a5d73] dark:text-[#94a3b8] mr-1.5">₹</span>
              <input
                type="number"
                min={1}
                step="0.01"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                className={fieldInputClass}
              />
            </div>
          </div>
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
            disabled={!isValid || submitting}
            size="sm"
            solid
            showIcon={!submitting}
            className="rounded-[10px] min-w-[140px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
                Submitting…
              </span>
            ) : (
              <span>Submit Request</span>
            )}
          </TravelingBorderButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
