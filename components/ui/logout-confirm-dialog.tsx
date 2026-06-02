'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

/**
 * Shared logout confirmation dialog (matches the app's dialog UI). Controlled by
 * the parent so any logout button can open it and run its own logout on confirm.
 */
export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Log out?',
  description = "You'll need to sign in again to get back in.",
  confirmLabel = 'Log out',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
              <LogOut className="h-4.5 w-4.5" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => { onOpenChange(false); onConfirm(); }}
          >
            <LogOut className="h-4 w-4" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LogoutConfirmDialog;
