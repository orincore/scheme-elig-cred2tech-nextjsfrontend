'use client';

import { useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

/**
 * Logout control for the onboarding flow. Confirms, then deletes the incomplete
 * account created during onboarding, clears all local/session storage, and
 * returns the user to the landing page. Pass into AuthShell's `headerSlot`.
 */
export function OnboardingLogoutButton({ className = '' }: { className?: string }) {
  const { abandonOnboarding } = useMsmeAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await abandonOnboarding();
    } catch {
      toast.error('Could not log out. Please try again.');
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#4a5d73] dark:text-[#94a3b8] hover:text-red-600 dark:hover:text-red-400 transition-colors ${className}`}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>

      <AlertDialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out and cancel onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Your in-progress account and any details entered so far will be permanently
              deleted. You&apos;ll need to start over from the beginning to sign up again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              disabled={busy}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log out & delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default OnboardingLogoutButton;
