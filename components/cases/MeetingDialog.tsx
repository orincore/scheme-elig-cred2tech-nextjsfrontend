'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import {
  fieldLabelClass,
  fieldWrapperClass,
  fieldInputClass,
} from '@/components/ui/underline-field';
import { CalendarClock, ChevronDown, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const MEETING_PLATFORMS = [
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'MS_TEAMS', label: 'Microsoft Teams' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'IN_PERSON', label: 'In-Person' },
  { value: 'OTHER', label: 'Other' },
] as const;

const AUTO_LINK_PLATFORMS = new Set(['GOOGLE_MEET']);
const LINK_PLATFORMS = new Set(['ZOOM', 'MS_TEAMS', 'OTHER']);

export interface MeetingFormValues {
  platform: string;
  scheduledAt: string;
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
  currentPlatform?: string;
  onSubmit: (values: MeetingFormValues) => Promise<{ success?: boolean; message?: string } | any>;
  onDone?: () => void | Promise<void>;
}

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function UnderlineSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      <div className={fieldWrapperClass(false, disabled)}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(fieldInputClass, 'appearance-none cursor-pointer')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 pointer-events-none" />
      </div>
    </div>
  );
}

function UnderlineTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      <div className={cn(
        'pb-2 border-b transition-colors',
        'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400',
        disabled && 'opacity-60',
      )}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full bg-transparent border-0 outline-none resize-none text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold p-0 focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600"
        />
      </div>
    </div>
  );
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

  const isAutoLink = AUTO_LINK_PLATFORMS.has(platform);
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
          <DialogTitle className="flex items-center gap-2.5 text-[#0a1628] dark:text-[#e6edf7]">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
              <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            {mode === 'schedule' ? 'Schedule Meeting' : 'Reschedule Meeting'}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
            {mode === 'schedule'
              ? 'Both the agent and the MSME applicant will receive an email and calendar invite.'
              : 'Pick a new time — both parties will be notified of the change.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {mode === 'schedule' && (
            <UnderlineSelect
              label="Platform"
              value={platform}
              onChange={setPlatform}
              options={MEETING_PLATFORMS}
              disabled={submitting}
            />
          )}

          <div>
            <label className={fieldLabelClass}>
              {mode === 'schedule' ? 'Date & Time' : 'New Date & Time'}
            </label>
            <div className={fieldWrapperClass(false, submitting)}>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                disabled={submitting}
                className={cn(fieldInputClass, '[color-scheme:light] dark:[color-scheme:dark]')}
              />
            </div>
          </div>

          {mode === 'schedule' && (
            <>
              <div>
                <label className={fieldLabelClass}>Duration (minutes)</label>
                <div className={fieldWrapperClass(false, submitting)}>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={submitting}
                    className={fieldInputClass}
                  />
                </div>
              </div>

              {isAutoLink && (
                <div className="flex items-start gap-2.5 border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/70 dark:bg-indigo-900/20 px-3.5 py-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    Google Meet link will be <span className="font-semibold">auto-generated</span> — calendar invites sent directly to both parties.
                  </p>
                </div>
              )}

              {needsLink && (
                <div>
                  <label className={fieldLabelClass}>Meeting Link</label>
                  <div className={fieldWrapperClass(false, submitting)}>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      disabled={submitting}
                      className={fieldInputClass}
                    />
                    <Video className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                </div>
              )}

              {needsDialIn && (
                <div>
                  <label className={fieldLabelClass}>Dial-in / Phone Number</label>
                  <div className={fieldWrapperClass(false, submitting)}>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={dialInInfo}
                      onChange={(e) => setDialInInfo(e.target.value)}
                      disabled={submitting}
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              )}

              {needsLocation && (
                <div>
                  <label className={fieldLabelClass}>Location</label>
                  <div className={fieldWrapperClass(false, submitting)}>
                    <input
                      type="text"
                      placeholder="Office address..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={submitting}
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              )}

              <UnderlineTextarea
                label="Notes (optional)"
                value={notes}
                onChange={setNotes}
                placeholder="Agenda or anything to prepare..."
                rows={2}
                disabled={submitting}
              />
            </>
          )}

          {mode === 'reschedule' && (
            <UnderlineTextarea
              label="Reason (optional)"
              value={reason}
              onChange={setReason}
              placeholder="Why is this being rescheduled..."
              rows={2}
              disabled={submitting}
            />
          )}
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
            className="rounded-[10px] min-w-[148px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
                Saving…
              </span>
            ) : (
              <span>{mode === 'schedule' ? 'Schedule Meeting' : 'Reschedule'}</span>
            )}
          </TravelingBorderButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
