'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ────────────────────────────────────────────────────────────────────
export interface AvailabilityLogEntry { id: string; status: string; changedAt: string; }

export const AVAIL_STATUSES = ['AVAILABLE', 'BUSY', 'OFFLINE', 'ON_LEAVE'] as const;

const AVAIL_CFG: Record<string, { label: string; color: string; bg: string; dot: string; textColor: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30', dot: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
  BUSY:      { label: 'Busy',      color: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' },
  OFFLINE:   { label: 'Offline',   color: 'bg-slate-400', bg: 'bg-muted',                          dot: 'bg-slate-400', textColor: 'text-muted-foreground' },
  ON_LEAVE:  { label: 'On Leave',  color: 'bg-blue-500',  bg: 'bg-blue-100 dark:bg-blue-900/30',   dot: 'bg-blue-500',  textColor: 'text-blue-700 dark:text-blue-300' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── IST helpers ────────────────────────────────────────────────────────────────
const IST_MS = 5.5 * 60 * 60 * 1000;
function istDayStart(y: number, m: number, d: number) { return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_MS); }
function istDayEnd(y: number, m: number, d: number)   { return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_MS); }
function todayIST() {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}
function fmtTimeIST(date: Date) { return date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }); }

function fmt(ms: number) {
  if (ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}

// ── Computation (step function WITH carryover) ─────────────────────────────────
// A punch sets a status that HOLDS until the next punch (or until now). So a
// status set on one day continues across following days until it's changed —
// carry the status active at the start of each day forward.
function computeDayPeriods(log: AvailabilityLogEntry[], dayStart: Date, dayEnd: Date) {
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

  // Punches that occur within the day.
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
  // The active status runs to the end of the day (capped at now).
  if (segStatus != null && cap.getTime() > segStart) {
    periods.push({ status: segStatus, start: new Date(segStart), end: cap, durationMs: cap.getTime() - segStart });
  }
  return periods;
}

function computeDayMap(log: AvailabilityLogEntry[], year: number, month: number) {
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

function dominant(totals: Record<string, number>) {
  if (!Object.keys(totals).length) return null;
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Day detail ─────────────────────────────────────────────────────────────────
function DayDetail({ date, log }: { date: Date; log: AvailabilityLogEntry[] }) {
  const periods = computeDayPeriods(log, istDayStart(date.getFullYear(), date.getMonth(), date.getDate()), istDayEnd(date.getFullYear(), date.getMonth(), date.getDate()));
  const totals: Record<string, number> = {};
  for (const p of periods) totals[p.status] = (totals[p.status] || 0) + p.durationMs;
  const totalMs = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
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

      {periods.length > 0 ? (
        <div className="bg-card border border-border overflow-hidden">
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
                    <p className="text-[10px] text-muted-foreground">{fmtTimeIST(p.start)} → {fmtTimeIST(p.end)}</p>
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

// ── Main component ───────────────────────────────────────────────────────────────
interface Props {
  log: AvailabilityLogEntry[];
  loading?: boolean;
  /** Tell the parent which month range is visible so it can (re)fetch the log. */
  onRangeChange?: (fromISO: string, toISO: string) => void;
  /** Admin-only: current availability + a setter to update it from this view. */
  currentAvailability?: string;
  onSetAvailability?: (status: string) => Promise<void> | void;
}

export function AvailabilityCalendar({ log, loading, onRangeChange, currentAvailability, onSetAvailability }: Props) {
  const t = todayIST();
  const [year, setYear]   = useState(t.year);
  const [month, setMonth] = useState(t.month);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  // Notify the parent of the visible range (current month ± 1) so it can fetch.
  useEffect(() => {
    if (!onRangeChange) return;
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month + 2, 0, 23, 59, 59).toISOString();
    onRangeChange(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const dayMap = useMemo(() => computeDayMap(log, year, month), [log, year, month]);
  const monthStats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of Object.values(dayMap)) for (const [s, ms] of Object.entries(day)) totals[s] = (totals[s] || 0) + ms;
    return totals;
  }, [dayMap]);

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const prevMonth = () => { setSelectedDay(null); if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); };
  const nextMonth = () => { setSelectedDay(null); if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); };

  const handleSet = async (status: string) => {
    if (!onSetAvailability || status === currentAvailability) return;
    setSaving(true);
    try { await onSetAvailability(status); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Admin update control */}
      {onSetAvailability && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mr-1">Set availability:</span>
          {AVAIL_STATUSES.map((s) => {
            const cfg = AVAIL_CFG[s];
            const active = currentAvailability === s;
            return (
              <button
                key={s}
                type="button"
                disabled={saving}
                onClick={() => handleSet(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
                  active ? `${cfg.bg} ${cfg.textColor} border-transparent ring-1 ring-inset ring-current`
                         : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
                {saving && active && <Loader2 className="h-3 w-3 animate-spin" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Month stats */}
      <div className="flex items-center gap-5 flex-wrap">
        {Object.entries(AVAIL_CFG).map(([status, cfg], i) => (
          <div key={status} className="flex items-center gap-5">
            {i > 0 && <div className="w-px h-7 bg-border" />}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
              </p>
              <p className={`text-lg font-bold ${cfg.textColor}`}>{monthStats[status] ? fmt(monthStats[status]) : '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`grid gap-5 ${selectedDay ? 'lg:grid-cols-[1fr_280px]' : ''}`}>
        {/* Calendar */}
        <div className="bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background">
            <button onClick={prevMonth} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[14px] font-bold text-foreground flex items-center gap-2">
              {MONTHS[month]} {year}
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </h2>
            <button onClick={nextMonth} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider bg-background">{d}</div>
            ))}
          </div>

          {loading && log.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`e-${i}`} className="border-b border-r border-border/40 min-h-[68px]" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const d   = idx + 1;
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const totals  = dayMap[key] ?? {};
                const dom     = dominant(totals);
                const cfg     = dom ? AVAIL_CFG[dom] : null;
                const totalMs = Object.values(totals).reduce((a, b) => a + b, 0);
                const isToday    = d === t.day && month === t.month && year === t.year;
                const isSelected = selectedDay?.getDate() === d && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
                const col = (firstWeekday + idx) % 7;
                const isFuture = istDayStart(year, month, d) > new Date();
                return (
                  <div
                    key={d}
                    onClick={() => !isFuture && setSelectedDay(isSelected ? null : new Date(year, month, d))}
                    className={`border-b border-border/40 min-h-[68px] p-2 transition-colors ${col < 6 ? 'border-r' : ''} ${
                      isFuture ? 'opacity-30 cursor-default'
                      : isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/40 cursor-pointer'
                      : 'hover:bg-muted/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className={`text-[12px] font-bold leading-none ${isToday ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground' : 'text-foreground'}`}>{d}</span>
                    </div>
                    {totalMs > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex h-2 rounded-full overflow-hidden gap-px">
                          {Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([s, ms]) => (
                            <div key={s} className={`${AVAIL_CFG[s]?.color ?? 'bg-muted'} rounded-full`} style={{ width: `${Math.round((ms / totalMs) * 100)}%` }} />
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
                  <div key={`tr-${i}`} className={`border-b border-border/40 min-h-[68px] ${i < trail - 1 ? 'border-r' : ''}`} />
                ));
              })()}
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-t border-border bg-background">
            {Object.entries(AVAIL_CFG).map(([s, cfg]) => (
              <span key={s} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />{cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Day detail */}
        {selectedDay && (
          <div className="bg-card border border-border overflow-hidden self-start">
            <div className="px-5 py-3 border-b border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-[13px] font-bold text-foreground">
                  {selectedDay.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </h3>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">✕</button>
            </div>
            <div className="px-5 py-4"><DayDetail date={selectedDay} log={log} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
