'use client';

import { useState } from 'react';
import { Caveat } from 'next/font/google';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PenLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const caveat = Caveat({ subsets: ['latin'], weight: '600' });

interface SignAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (fullName: string) => Promise<{ success?: boolean; message?: string } | any>;
  onDone?: () => void | Promise<void>;
}

/**
 * Shared "Sign Agreement" dialog for the agent + MSME case pages. Capture is a
 * typed full name (live-previewed in a signature-style font) plus a required
 * agree-to-terms checkbox — no canvas drawing pad.
 */
export function SignAgreementDialog({ open, onOpenChange, onSign, onDone }: SignAgreementDialogProps) {
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setFullName(''); setAgreed(false); setSubmitting(false); };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) { toast.error('Please type your full name'); return; }
    if (!agreed) { toast.error('Please confirm you agree to the terms of this agreement'); return; }

    setSubmitting(true);
    try {
      const res = await onSign(fullName.trim());
      if (res && res.success === false) {
        toast.error(res.message || 'Failed to sign the agreement');
        return;
      }
      toast.success('Agreement signed');
      await onDone?.();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sign the agreement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Sign Agreement
          </DialogTitle>
          <DialogDescription>
            Type your full legal name to sign this service agreement. Your name, the time, and your IP address will be recorded as part of the signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="signer-full-name">Full Name</Label>
            <Input
              id="signer-full-name"
              placeholder="Type your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              autoComplete="name"
            />
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 min-h-[72px] flex items-center justify-center">
            {fullName.trim() ? (
              <p className={`${caveat.className} text-3xl text-foreground`}>{fullName}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50 italic">Your signature preview will appear here</p>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="agree-terms"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              disabled={submitting}
              className="mt-0.5"
            />
            <Label htmlFor="agree-terms" className="text-xs font-normal leading-snug text-muted-foreground cursor-pointer">
              I have read and agree to the terms of this agreement, and I am authorized to sign it.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!fullName.trim() || !agreed || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Agreement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
