export const MEETING_PLATFORM_LABELS: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  MS_TEAMS: 'Microsoft Teams',
  PHONE_CALL: 'Phone Call',
  IN_PERSON: 'In-Person',
  OTHER: 'Other',
};

export function meetingPlatformLabel(platform: string) {
  return MEETING_PLATFORM_LABELS[platform] || platform?.replace(/_/g, ' ') || '—';
}

/** Formats an ISO date string in IST, matching the rest of the app's date conventions. */
export function formatMeetingDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export interface CaseMeeting {
  id: string | number;
  caseId: string | number;
  platform: string;
  meetingLink?: string | null;
  dialInInfo?: string | null;
  location?: string | null;
  scheduledAt: string;
  durationMinutes?: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  notes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  completedAt?: string | null;
  rescheduleCount?: number;
}
