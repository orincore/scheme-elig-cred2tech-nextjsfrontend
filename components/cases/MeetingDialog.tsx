'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const MEETING_PLATFORMS = [
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'MS_TEAMS', label: 'Microsoft Teams' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'IN_PERSON', label: 'In-Person' },
  { value: 'OTHER', label: 'Other' },
] as const;

const LINK_PLATFORMS = new Set(['GOOGLE_MEET', 'ZOOM', 'MS_TEAMS', 'OTHER']);

export interface MeetingFormValues {
  platform: string;
  scheduledAt: string; // ISO string
  durationMinutes?: number;
  meetingLink?: string;
  dialInInfo?: string;
  location?: string;
  notes?: string;
  reason?: string;
}

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'schedule' | 'reschedule';
  /** For reschedule mode, the meeting's current platform (shown read-only). */
  currentPlatform?: string;
  onSubmit: (values: MeetingFormValues) => Promise<{ success?: boolean; message?: string } | any>;
  onDone?: () => void | Promise<void>;
}

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MeetingDialog({
  open, onOpenChange, mode, currentPlatform, onSubmit, onDone,
}: MeetingDialogProps) {
  const [platform, setPlatform] = useState<string>('GOOGLE_MEET');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [meetingLink, setMeetingLink] = useState('');
  const [dialInInfo, setDialInInfo] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
      setDateTime(toDatetimeLocalValue(inOneHour));
      setPlatform(currentPlatform || 'GOOGLE_MEET');
    }
  }, [open, currentPlatform]);

  const reset = () => {
    setPlatform('GOOGLE_MEET');
    setDateTime('');
    setDuration('30');
    setMeetingLink('');
    setDialInInfo('');
    setLocation('');
    setNotes('');
    setReason('');
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const needsLink = LINK_PLATFORMS.has(platform);
  const needsDialIn = platform === 'PHONE_CALL';
  const needsLocation = platform === 'IN_PERSON';

  const isValid =
    !!dateTime &&
    (mode === 'reschedule' ||
      ((!needsLink || meetingLink.trim()) &&
        (!needsDialIn || dialInInfo.trim()) &&
        (!needsLocation || location.trim())));

  const handleSubmit = async () => {
    if (!dateTime) { toast.error('Please pick a date and time'); return; }
    const scheduledAt = new Date(dateTime);
    if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      toast.error('Meeting time must be in the future');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onSubmit({
        platform,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
        meetingLink: meetingLink.trim() || undefined,
        dialInInfo: dialInInfo.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      if (res && res.success === false) {
        toast.error(res.message || 'Failed to save meeting');
        setSubmitting(false);
        return;
      }
      toast.success(mode === 'schedule' ? 'Meeting scheduled' : 'Meeting rescheduled');
      await onDone?.();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save meeting');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {mode === 'schedule' ? 'Schedule Meeting' : 'Reschedule Meeting'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'schedule'
              ? 'Set up a meeting between the agent and the MSME applicant. Both will be notified by email.'
              : 'Pick a new date and time. Both parties will be notified of the change by email.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {mode === 'schedule' && (
            <div className="space-y-1.5">
              <Label htmlFor="meeting-platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform} disabled={submitting}>
                <SelectTrigger id="meeting-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="meeting-datetime">{mode === 'schedule' ? 'Date & Time' : 'New Date & Time'}</Label>
            <Input
              id="meeting-datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              disabled={submitting}
            />
          </div>

          {mode === 'schedule' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                <Input
                  id="meeting-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {needsLink && (
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-link">Meeting Link</Label>
                  <Input
                    id="meeting-link"
                    placeholder="https://meet.google.com/..."
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}

              {needsDialIn && (
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-dialin">Dial-in / Phone Number</Label>
                  <Input
                    id="meeting-dialin"
                    placeholder="+91 98765 43210"
                    value={dialInInfo}
                    onChange={(e) => setDialInInfo(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}

              {needsLocation && (
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-location">Location</Label>
                  <Input
                    id="meeting-location"
                    placeholder="Office address..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="meeting-notes">Notes (optional)</Label>
                <Textarea
                  id="meeting-notes"
                  placeholder="Agenda or anything to prepare..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={submitting}
                />
              </div>
            </>
          )}

          {mode === 'reschedule' && (
            <div className="space-y-1.5">
              <Label htmlFor="meeting-reason">Reason (optional)</Label>
              <Textarea
                id="meeting-reason"
                placeholder="Why is this being rescheduled..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                disabled={submitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'schedule' ? 'Schedule' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
