'use client';

import { useEffect, useState, useMemo } from 'react';
import { agentAuthApi } from '@/lib/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  status: string;
  changedAt: string; // ISO
}

// ── Config ───────────────────────────────────────────────────────────────────

const AVAIL_CFG: Record<string, { label: string; color: string; bg: string; dot: string; textColor: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-green-500',  bg: 'bg-green-100 dark:bg-green-900/30',  dot: 'bg-green-500',  textColor: 'text-green-700 dark:text-green-300' },
  BUSY:      { label: 'Busy',      color: 'bg-amber-500',  bg: 'bg-amber-100 dark:bg-amber-900/30',  dot: 'bg-amber-500',  textColor: 'text-amber-700 dark:text-amber-300' },
  OFFLINE:   { label: 'Offline',   color: 'bg-slate-400',  bg: 'bg-muted',                           dot: 'bg-slate-400',  textColor: 'text-muted-foreground' },
  ON_LEAVE:  { label: 'On Leave',  color: 'bg-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30',    dot: 'bg-blue-500',   textColor: 'text-blue-700 dark:text-blue-300' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Given a sorted log, compute duration of each entry up to `endTime`. */
function computePeriods(log: LogEntry[], rangeStart: Date, rangeEnd: Date) {
  if (!log.length) return [];
  const periods: { status: string; start: Date; end: Date; durationMs: number }[] = [];
  for (let i = 0; i < log.length; i++) {
    const start = new Date(Math.max(new Date(log[i].changedAt).getTime(), rangeStart.getTime()));
    const end   = i + 1 < log.length
      ? new Date(Math.min(new Date(log[i + 1].changedAt).getTime(), rangeEnd.getTime()))
      : rangeEnd;
    if (end > start) {
      periods.push({ status: log[i].status, start, end, durationMs: end.getTime() - start.getTime() });
    }
  }
  return periods;
}

/** Compute per-day totals for the month. Returns a map of yyyy-mm-dd → { status → ms }. */
function computeDayMap(log: LogEntry[], year: number, month: number) {
  const map: Record<string, Record<string, number>> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(year, month, d, 0, 0, 0, 0);
    const dayEnd   = new Date(year, month, d, 23, 59, 59, 999);
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // Find the active log entry at the start of this day (most recent entry before dayStart)
    const relevantLog: LogEntry[] = [];
    let priorEntry: LogEntry | null = null;
    for (const e of log) {
      const t = new Date(e.changedAt);
      if (t <= dayStart) priorEntry = e;
      else if (t <= dayEnd) relevantLog.push(e);
    }

    const dayLog: LogEntry[] = priorEntry
      ? [{ ...priorEntry, changedAt: dayStart.toISOString() }, ...relevantLog]
      : relevantLog;

    if (!dayLog.length) { map[key] = {}; continue; }

    const periods = computePeriods(dayLog, dayStart, dayEnd);
    const totals: Record<string, number> = {};
    for (const p of periods) {
      totals[p.status] = (totals[p.status] || 0) + p.durationMs;
    }
    map[key] = totals;
  }
  return map;
}

/** Returns the dominant status for a day. */
function dominant(totals: Record<string, number>): string | null {
  if (!Object.keys(totals).length) return null;
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Day Detail Panel ─────────────────────────────────────────────────────────

function DayDetail({ date, log }: { date: Date; log: LogEntry[] }) {
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  let priorEntry: LogEntry | null = null;
  const relevantLog: LogEntry[] = [];
  for (const e of log) {
    const t = new Date(e.changedAt);
    if (t <= dayStart) priorEntry = e;
    else if (t <= dayEnd) relevantLog.push(e);
  }
  const dayLog: LogEntry[] = priorEntry
    ? [{ ...priorEntry, changedAt: dayStart.toISOString() }, ...relevantLog]
    : relevantLog;

  const periods = computePeriods(dayLog, dayStart, dayEnd);

  const totals: Record<string, number> = {};
  for (const p of periods) totals[p.status] = (totals[p.status] || 0) + p.durationMs;

  const totalTracked = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(AVAIL_CFG).map(([status, cfg]) => (
          <div key={status} className={`${cfg.bg} rounded-md px-3 py-2.5`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</span>
            </div>
            <p className={`text-lg font-extrabold ${cfg.textColor}`}>{totals[status] ? fmt(totals[status]) : '—'}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {periods.length > 0 && (
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Timeline</p>
          </div>
          <div className="divide-y divide-border/50">
            {periods.map((p, i) => {
              const cfg = AVAIL_CFG[p.status] ?? AVAIL_CFG.OFFLINE;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold ${cfg.textColor}`}>{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      {' → '}
                      {p.end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{fmt(p.durationMs)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!periods.length && (
        <p className="text-xs text-muted-foreground/50 italic text-center py-4">No availability data for this day</p>
      )}

      {totalTracked > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          Total tracked: {fmt(totalTracked)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Fetch log for ±1 month around current view so prev/next entry before month start is captured
  useEffect(() => {
    setLoading(true);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month + 2, 0, 23, 59, 59).toISOString();
    agentAuthApi.getAvailabilityLog({ from, to })
      .then((res) => { if (res.success) setLog(res.log); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load calendar'))
      .finally(() => setLoading(false));
  }, [year, month]);

  // Compute day map for the current month
  const dayMap = useMemo(() => computeDayMap(log, year, month), [log, year, month]);

  // Month stats
  const monthStats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of Object.values(dayMap)) {
      for (const [s, ms] of Object.entries(day)) {
        totals[s] = (totals[s] || 0) + ms;
      }
    }
    return totals;
  }, [dayMap]);

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDay(null); };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Availability</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">AUX Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">Your availability history — click any day for a detailed report</p>

        {/* Monthly stats strip */}
        <div className="flex items-center gap-5 mt-5 flex-wrap">
          {Object.entries(AVAIL_CFG).map(([status, cfg]) => (
            <div key={status}>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
              </p>
              <p className={`text-xl font-bold ${cfg.textColor}`}>{monthStats[status] ? fmt(monthStats[status]) : '—'}</p>
            </div>
          )).reduce<React.ReactNode[]>((acc, el, i) => {
            if (i > 0) acc.push(<div key={`div-${i}`} className="w-px h-8 bg-border" />);
            acc.push(el);
            return acc;
          }, [])}
        </div>
      </div>

      <div className={`grid gap-5 ${selectedDay ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        {/* Calendar */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-background">
            <button onClick={prevMonth} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[14px] font-bold text-foreground">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider bg-background">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-border/40 min-h-[72px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const d = idx + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const totals  = dayMap[dateKey] ?? {};
              const dom     = dominant(totals);
              const cfg     = dom ? AVAIL_CFG[dom] : null;
              const totalMs = Object.values(totals).reduce((a, b) => a + b, 0);
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selectedDay?.getDate() === d && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              const col = (firstWeekday + idx) % 7;

              return (
                <div
                  key={d}
                  onClick={() => setSelectedDay(isSelected ? null : new Date(year, month, d))}
                  className={`border-b border-border/40 min-h-[72px] p-2 cursor-pointer transition-colors ${
                    col < 6 ? 'border-r' : ''
                  } ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : 'hover:bg-muted/30'}`}
                >
                  {/* Date number */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className={`text-[12px] font-bold leading-none ${
                      isToday
                        ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                        : 'text-foreground'
                    }`}>{d}</span>
                  </div>

                  {/* Status bars */}
                  {totalMs > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {/* Proportional bar */}
                      <div className="flex h-2 rounded-full overflow-hidden gap-px">
                        {Object.entries(totals)
                          .sort((a, b) => b[1] - a[1])
                          .map(([s, ms]) => {
                            const pct = Math.round((ms / totalMs) * 100);
                            return (
                              <div
                                key={s}
                                className={`${AVAIL_CFG[s]?.color ?? 'bg-muted'} rounded-full`}
                                style={{ width: `${pct}%` }}
                              />
                            );
                          })}
                      </div>
                      {/* Dominant label */}
                      {cfg && (
                        <p className={`text-[9px] font-semibold ${cfg.textColor}`}>{cfg.label}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] text-muted-foreground/40">No data</p>
                  )}
                </div>
              );
            })}

            {/* Trailing empty cells */}
            {(() => {
              const used = firstWeekday + daysInMonth;
              const trailing = used % 7 === 0 ? 0 : 7 - (used % 7);
              return Array.from({ length: trailing }).map((_, i) => (
                <div key={`trail-${i}`} className={`border-b border-border/40 min-h-[72px] ${i < trailing - 1 ? 'border-r' : ''}`} />
              ));
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-t border-border bg-background">
            {Object.entries(AVAIL_CFG).map(([s, cfg]) => (
              <span key={s} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />{cfg.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground ml-auto">
              Bar shows proportion of day in each status
            </span>
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="bg-card border border-border rounded-none overflow-hidden self-start">
            <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-[13px] font-bold text-foreground">
                  {selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4">
              <DayDetail date={selectedDay} log={log} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
