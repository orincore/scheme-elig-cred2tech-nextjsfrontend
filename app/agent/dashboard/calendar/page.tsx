'use client';

import { useEffect, useState, useMemo } from 'react';
import { agentAuthApi } from '@/lib/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Timer } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

interface LogEntry { id: string; status: string; changedAt: string; }

// ── Config ───────────────────────────────────────────────────────────────────

const AVAIL_CFG: Record<string, { label: string; color: string; bg: string; dot: string; textColor: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30', dot: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
  BUSY:      { label: 'Busy',      color: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' },
  OFFLINE:   { label: 'Offline',   color: 'bg-slate-400', bg: 'bg-muted',                          dot: 'bg-slate-400', textColor: 'text-muted-foreground' },
  ON_LEAVE:  { label: 'On Leave',  color: 'bg-blue-500',  bg: 'bg-blue-100 dark:bg-blue-900/30',   dot: 'bg-blue-500',  textColor: 'text-blue-700 dark:text-blue-300' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── IST ──────────────────────────────────────────────────────────────────────

const IST_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30 in ms

function istDayStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_MS);
}
function istDayEnd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_MS);
}
function todayIST() {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}
function fmtTimeIST(date: Date): string {
  return date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Duration format ───────────────────────────────────────────────────────────

function fmt(ms: number) {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── Computation ───────────────────────────────────────────────────────────────

/**
 * Compute periods for a single day, treating availability as a STEP FUNCTION:
 * each punch sets a status that HOLDS until the next punch (or until now). The
 * status active at the start of the day is carried in from the most recent punch
 * before it — so a status set once continues across the following days until it
 * is explicitly changed, instead of disappearing the next day.
 */
function computeDayPeriods(log: LogEntry[], dayStart: Date, dayEnd: Date) {
  const now = new Date();
  if (dayStart.getTime() > now.getTime()) return [];
  const cap = new Date(Math.min(dayEnd.getTime(), now.getTime()));

  const sorted = log
    .map((e) => ({ status: e.status, t: new Date(e.changedAt).getTime() }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);
  if (!sorted.length) return [];

  // Status carried into this day = the latest punch at/before dayStart.
  let segStatus: string | null = null;
  for (const e of sorted) {
    if (e.t <= dayStart.getTime()) segStatus = e.status;
    else break;
  }

  // Punches within the day.
  const inDay = sorted.filter((e) => e.t > dayStart.getTime() && e.t <= cap.getTime());

  const periods: { status: string; start: Date; end: Date; durationMs: number }[] = [];
  let segStart = dayStart.getTime();
  for (const e of inDay) {
    if (segStatus != null && e.t > segStart) {
      periods.push({ status: segStatus, start: new Date(segStart), end: new Date(e.t), durationMs: e.t - segStart });
    }
    segStart = e.t;
    segStatus = e.status;
  }
  if (segStatus != null && cap.getTime() > segStart) {
    periods.push({ status: segStatus, start: new Date(segStart), end: cap, durationMs: cap.getTime() - segStart });
  }
  return periods;
}

/** Compute per-day totals for the visible month. Returns yyyy-mm-dd → { status → ms }. */
function computeDayMap(log: LogEntry[], year: number, month: number) {
  const map: Record<string, Record<string, number>> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = istDayStart(year, month, d);
    const dayEnd   = istDayEnd(year, month, d);
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dayStart > now) { map[key] = {}; continue; }

    const periods = computeDayPeriods(log, dayStart, dayEnd);
    const totals: Record<string, number> = {};
    for (const p of periods) totals[p.status] = (totals[p.status] || 0) + p.durationMs;
    map[key] = totals;
  }
  return map;
}

function dominant(totals: Record<string, number>): string | null {
  if (!Object.keys(totals).length) return null;
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Live Timer ────────────────────────────────────────────────────────────────

function fmtTimer(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function LiveTimer({ since, status }: { since: Date; status: string }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - since.getTime());
  const cfg = AVAIL_CFG[status] ?? AVAIL_CFG.OFFLINE;

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - since.getTime()), 1000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <div className={`inline-flex items-center gap-3 rounded-md border px-4 py-2.5 ${cfg.bg}`}>
      <span className={`h-2.5 w-2.5 rounded-full animate-pulse shrink-0 ${cfg.dot}`} />
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.textColor}`}>
          Current · {cfg.label}
        </p>
        <p className={`text-2xl font-mono font-extrabold leading-tight tabular-nums ${cfg.textColor}`}>
          {fmtTimer(elapsed)}
        </p>
      </div>
      <Timer className={`h-5 w-5 ml-1 opacity-60 ${cfg.textColor}`} />
    </div>
  );
}

// ── Day detail ────────────────────────────────────────────────────────────────

function DayDetail({ date, log }: { date: Date; log: LogEntry[] }) {
  const y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
  const dayStart = istDayStart(y, mo, d);
  const dayEnd   = istDayEnd(y, mo, d);
  const periods  = computeDayPeriods(log, dayStart, dayEnd);

  const totals: Record<string, number> = {};
  for (const p of periods) totals[p.status] = (totals[p.status] || 0) + p.durationMs;
  const totalMs = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Status totals */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(AVAIL_CFG).map(([status, cfg]) => (
          <div key={status} className={`${cfg.bg} rounded-md px-3 py-2`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</span>
            </div>
            <p className={`text-base font-extrabold ${cfg.textColor}`}>{totals[status] ? fmt(totals[status]) : '—'}</p>
          </div>
        ))}
      </div>

      {/* Punch timeline */}
      {periods.length > 0 ? (
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Punch Timeline (IST)</p>
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
                      {fmtTimeIST(p.start)} → {fmtTimeIST(p.end)}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-foreground shrink-0">{fmt(p.durationMs)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/50 italic text-center py-6">No status changes recorded for this day</p>
      )}

      {totalMs > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />Total tracked: {fmt(totalMs)}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentCalendarPage() {
  const todayIst = todayIST();
  const [year, setYear]   = useState(todayIst.year);
  const [month, setMonth] = useState(todayIst.month);
  const [log, setLog]     = useState<LogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const loadLog = () => {
    setLoading(true);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month + 2, 0, 23, 59, 59).toISOString();
    agentAuthApi.getAvailabilityLog({ from, to })
      .then((res) => { if (res.success) setLog(res.log); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load calendar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLog(); }, [year, month]);

  // Instantly reflect AUX changes made from the header dropdown
  useEffect(() => {
    const handler = (e: Event) => {
      const { status, changedAt } = (e as CustomEvent).detail as { status: string; changedAt: string };
      setLog((prev) => [...prev, { id: `live-${Date.now()}`, status, changedAt }]);
    };
    window.addEventListener('aux-changed', handler);
    return () => window.removeEventListener('aux-changed', handler);
  }, []);

  // Current status = most recent log entry globally
  const currentEntry = useMemo(() => {
    if (!log.length) return null;
    return [...log].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())[0];
  }, [log]);

  const dayMap = useMemo(() => computeDayMap(log, year, month), [log, year, month]);

  const monthStats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of Object.values(dayMap)) {
      for (const [s, ms] of Object.entries(day)) totals[s] = (totals[s] || 0) + ms;
    }
    return totals;
  }, [dayMap]);

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const prevMonth = () => { setSelectedDay(null); if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { setSelectedDay(null); if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

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
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">AUX Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Time is calculated between each explicit status punch (IST)</p>
          </div>
          {currentEntry && (
            <LiveTimer
              since={new Date(currentEntry.changedAt)}
              status={currentEntry.status}
            />
          )}
        </div>

        {/* Monthly stats */}
        <div className="flex items-center gap-5 mt-5 flex-wrap">
          {(Object.entries(AVAIL_CFG) as [string, typeof AVAIL_CFG[string]][]).reduce<React.ReactNode[]>((acc, [status, cfg], i) => {
            if (i > 0) acc.push(<div key={`div-${i}`} className="w-px h-8 bg-border" />);
            acc.push(
              <div key={status}>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                </p>
                <p className={`text-xl font-bold ${cfg.textColor}`}>{monthStats[status] ? fmt(monthStats[status]) : '—'}</p>
              </div>
            );
            return acc;
          }, [])}
        </div>
      </div>

      <div className={`grid gap-5 ${selectedDay ? 'lg:grid-cols-[1fr_300px]' : ''}`}>
        {/* Calendar grid */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-background">
            <button onClick={prevMonth} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[14px] font-bold text-foreground">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week row */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider bg-background">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`e-${i}`} className="border-b border-r border-border/40 min-h-[72px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const d    = idx + 1;
              const key  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const totals  = dayMap[key] ?? {};
              const dom     = dominant(totals);
              const cfg     = dom ? AVAIL_CFG[dom] : null;
              const totalMs = Object.values(totals).reduce((a, b) => a + b, 0);
              const isToday    = d === todayIst.day && month === todayIst.month && year === todayIst.year;
              const isSelected = selectedDay?.getDate() === d && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              const col = (firstWeekday + idx) % 7;
              const isFuture = istDayStart(year, month, d) > new Date();

              return (
                <div
                  key={d}
                  onClick={() => !isFuture && setSelectedDay(isSelected ? null : new Date(year, month, d))}
                  className={`border-b border-border/40 min-h-[72px] p-2 transition-colors ${col < 6 ? 'border-r' : ''} ${
                    isFuture  ? 'opacity-30 cursor-default' :
                    isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/40 cursor-pointer' :
                    'hover:bg-muted/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className={`text-[12px] font-bold leading-none ${
                      isToday ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground' : 'text-foreground'
                    }`}>{d}</span>
                  </div>

                  {totalMs > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {/* Proportional bar */}
                      <div className="flex h-2 rounded-full overflow-hidden gap-px">
                        {Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([s, ms]) => (
                          <div key={s} className={`${AVAIL_CFG[s]?.color ?? 'bg-muted'} rounded-full`}
                            style={{ width: `${Math.round((ms / totalMs) * 100)}%` }} />
                        ))}
                      </div>
                      {cfg && <p className={`text-[9px] font-semibold ${cfg.textColor}`}>{cfg.label} · {fmt(totalMs)}</p>}
                    </div>
                  ) : (
                    !isFuture && <p className="text-[9px] text-muted-foreground/40">No punches</p>
                  )}
                </div>
              );
            })}

            {(() => {
              const used = firstWeekday + daysInMonth;
              const trail = used % 7 === 0 ? 0 : 7 - (used % 7);
              return Array.from({ length: trail }).map((_, i) => (
                <div key={`t-${i}`} className={`border-b border-border/40 min-h-[72px] ${i < trail - 1 ? 'border-r' : ''}`} />
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
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="bg-card border border-border rounded-none overflow-hidden self-start">
            <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-[13px] font-bold text-foreground">
                  {selectedDay.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </h3>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">✕</button>
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
