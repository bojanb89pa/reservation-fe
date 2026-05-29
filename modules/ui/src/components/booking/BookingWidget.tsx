import { useState, useMemo } from 'react';
import type { BusinessService, Resource, ResourceAvailabilityRule, DayOfWeek } from '@domain';
import { RESOURCE_TYPE_LABELS } from '@domain';
import styles from './BookingWidget.module.css';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function toMinutes(duration: number, unit: BusinessService['durationUnit']): number {
  if (unit === 'HOURS') return duration * 60;
  if (unit === 'DAYS') return duration * 24 * 60;
  return duration;
}

/** GCD of all non-DAYS service durations — defines the slot grid step. */
function computeSlotStep(services: BusinessService[]): number {
  const mins = services
    .filter((s) => s.durationUnit !== 'DAYS')
    .map((s) => toMinutes(s.duration, s.durationUnit));
  if (mins.length === 0) return 15;
  return mins.reduce(gcd);
}

const JS_DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

function buildMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7; // Mon = 0
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getAvailableSlots(
  date: string,
  service: BusinessService,
  rules: ResourceAvailabilityRule[],
  slotStep: number,
): string[] {
  const d = new Date(date + 'T00:00:00');
  const domainDay = JS_DAY_MAP[d.getDay()];
  const dayRules = rules.filter((r) => r.dayOfWeek === domainDay);
  if (dayRules.length === 0) return [];

  const svcMins = toMinutes(service.duration, service.durationUnit);
  const now = new Date();
  const isToday = date === todayStr();

  const slots = new Set<string>();
  for (const rule of dayRules) {
    const [sh, sm] = rule.startTime.split(':').map(Number);
    const [eh, em] = rule.endTime.split(':').map(Number);
    const rStart = sh! * 60 + sm!;
    const rEnd = eh! * 60 + em!;
    let cur = rStart;
    while (cur + svcMins <= rEnd) {
      if (isToday) {
        const slotDt = new Date(date + 'T00:00:00');
        slotDt.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
        if (slotDt <= now) {
          cur += slotStep;
          continue;
        }
      }
      slots.add(`${Math.floor(cur / 60)}:${String(cur % 60).padStart(2, '0')}`);
      cur += slotStep;
    }
  }

  return [...slots].sort((a, b) => {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    return ah! * 60 + am! - (bh! * 60 + bm!);
  });
}

function dateHasSlots(
  date: string,
  service: BusinessService,
  rules: ResourceAvailabilityRule[],
  slotStep: number,
): boolean {
  return getAvailableSlots(date, service, rules, slotStep).length > 0;
}

function fmtMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function fmtSlotSummary(dateStr: string, slot: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const datePart = d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${datePart} · ${slot}`;
}

function fmtDateRangeSummary(start: string, end: string): string {
  const fmt = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function fmtDuration(duration: number, unit: BusinessService['durationUnit']): string {
  if (unit === 'HOURS') return `${duration}h`;
  if (unit === 'DAYS') return `${duration}d`;
  return `${duration}min`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingSelection {
  service: BusinessService;
  resource: Resource;
  startTime: string;
  endTime: string;
}

export interface BookingWidgetProps {
  services: BusinessService[];
  resources: Resource[];
  /** Controlled: the currently selected resource (owned by parent, e.g. for rule fetching). */
  selectedResource: Resource | null;
  onResourceChange: (resource: Resource | null) => void;
  /** Availability rules for the currently selected resource. */
  availabilityRules: ResourceAvailabilityRule[];
  onConfirm: (selection: BookingSelection) => Promise<void>;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BookingWidget({
  services,
  resources,
  selectedResource,
  onResourceChange,
  availabilityRules,
  onConfirm,
  isLoading,
}: BookingWidgetProps) {
  const now = new Date();

  const [selectedService, setSelectedService] = useState<BusinessService | null>(
    services.length === 1 ? services[0]! : null,
  );
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const slotStep = useMemo(() => computeSlotStep(services), [services]);
  const isDays = selectedService?.durationUnit === 'DAYS';
  const canPickDateTime = !!selectedService && !!selectedResource;

  const calendarDays = useMemo(
    () => buildMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate || isDays) return [];
    return getAvailableSlots(selectedDate, selectedService, availabilityRules, slotStep);
  }, [selectedService, selectedDate, isDays, availabilityRules, slotStep]);

  function handleServiceSelect(svc: BusinessService) {
    setSelectedService(svc);
    setSelectedDate(null);
    setSelectedEndDate(null);
    setSelectedSlot(null);
  }

  function handleResourceSelect(resource: Resource) {
    onResourceChange(resource);
    setSelectedDate(null);
    setSelectedEndDate(null);
    setSelectedSlot(null);
  }

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    if (selectedEndDate && selectedEndDate < dateStr) setSelectedEndDate(null);
  }

  function handlePrevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function handleNextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function isDayDisabled(d: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return true;
    if (!selectedService || !selectedResource || isDays) return false;
    return !dateHasSlots(toDateStr(d), selectedService, availabilityRules, slotStep);
  }

  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const summaryWhen = (() => {
    if (!selectedService) return null;
    if (isDays) {
      if (selectedDate && selectedEndDate) return fmtDateRangeSummary(selectedDate, selectedEndDate);
      return null;
    }
    if (selectedDate && selectedSlot) return fmtSlotSummary(selectedDate, selectedSlot);
    return null;
  })();

  const canConfirm = !!selectedService && !!selectedResource && !!summaryWhen;

  async function handleConfirm() {
    if (!canConfirm || !selectedService || !selectedResource) return;
    let startTime: string;
    let endTime: string;

    if (isDays) {
      if (!selectedDate || !selectedEndDate) return;
      const start = new Date(selectedDate + 'T00:00:00');
      const end = new Date(selectedEndDate + 'T00:00:00');
      end.setDate(end.getDate() + 1);
      startTime = start.toISOString().replace('Z', '');
      endTime = end.toISOString().replace('Z', '');
    } else {
      if (!selectedDate || !selectedSlot) return;
      const [h, m] = selectedSlot.split(':').map(Number);
      const start = new Date(selectedDate + 'T00:00:00');
      start.setHours(h!, m!, 0, 0);
      const end = new Date(start);
      end.setMinutes(
        end.getMinutes() + toMinutes(selectedService.duration, selectedService.durationUnit),
      );
      startTime = start.toISOString().replace('Z', '');
      endTime = end.toISOString().replace('Z', '');
    }

    await onConfirm({ service: selectedService, resource: selectedResource, startTime, endTime });
  }

  return (
    <div className={styles.widget}>
      {/* ── Header ── */}
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Book a slot</div>
          <h3 className={styles.title}>When works for you?</h3>
        </div>
      </div>

      {/* ── Services ── */}
      {services.length > 0 && (
        <div>
          <p className={styles.sectionLabel}>Service</p>
          <div className={styles.tabs} role="tablist">
            {services.map((svc) => (
              <button
                key={svc.id}
                role="tab"
                aria-pressed={selectedService?.id === svc.id}
                className={[
                  styles.tab,
                  selectedService?.id === svc.id ? styles.tabActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleServiceSelect(svc)}
              >
                {svc.name}
                <span className={styles.tabMeta}>&nbsp;· {fmtDuration(svc.duration, svc.durationUnit)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Resources ── */}
      {resources.length > 0 && (
        <div>
          <p className={styles.sectionLabel}>Resource</p>
          <div className={styles.tabs} role="tablist">
            {resources.map((res) => (
              <button
                key={res.id}
                role="tab"
                aria-pressed={selectedResource?.id === res.id}
                className={[
                  styles.tab,
                  selectedResource?.id === res.id ? styles.tabActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleResourceSelect(res)}
              >
                {res.name}
                <span className={styles.tabMeta}>&nbsp;· {RESOURCE_TYPE_LABELS[res.type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Date / Date-range ── */}
      {canPickDateTime && (
        <>
          {isDays ? (
            <div>
              <p className={styles.sectionLabel}>Date range</p>
              <div className={styles.dateRange}>
                <label className={styles.dateRangeField}>
                  <span className={styles.dateRangeLabel}>Start</span>
                  <input
                    type="date"
                    className={styles.dateInput}
                    min={todayStr()}
                    value={selectedDate ?? ''}
                    onChange={(e) => handleDateSelect(e.target.value)}
                  />
                </label>
                <label className={styles.dateRangeField}>
                  <span className={styles.dateRangeLabel}>End</span>
                  <input
                    type="date"
                    className={styles.dateInput}
                    min={selectedDate ?? todayStr()}
                    value={selectedEndDate ?? ''}
                    onChange={(e) => setSelectedEndDate(e.target.value)}
                    disabled={!selectedDate}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div>
              <p className={styles.sectionLabel}>Date</p>
              <div className={styles.calHead}>
                <button
                  className={styles.iconBtn}
                  onClick={handlePrevMonth}
                  disabled={!canGoPrev}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <span className={styles.calMonth}>{fmtMonthYear(viewYear, viewMonth)}</span>
                <button
                  className={styles.iconBtn}
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
              <div className={styles.dow}>
                {DOW_LABELS.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
              <div className={styles.days}>
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} className={styles.dayEmpty} />;
                  const dateStr = toDateStr(d);
                  const disabled = isDayDisabled(d);
                  const isToday = sameDay(d, now);
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      className={[
                        styles.day,
                        disabled ? styles.dayDisabled : '',
                        isToday && !disabled ? styles.dayToday : '',
                        isSelected ? styles.daySelected : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={disabled}
                      onClick={() => handleDateSelect(dateStr)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Time slots ── */}
      {canPickDateTime && selectedDate && !isDays && (
        <div>
          <p className={styles.sectionLabel}>
            Time
            {availableSlots.length > 0 && (
              <span className={styles.slotCount}>&nbsp;· {availableSlots.length} available</span>
            )}
          </p>
          {availableSlots.length === 0 ? (
            <p className={styles.noSlots}>No available slots for this date.</p>
          ) : (
            <div className={styles.slots}>
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  aria-pressed={selectedSlot === slot}
                  className={[styles.slot, selectedSlot === slot ? styles.slotSelected : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Summary + Confirm ── */}
      {selectedService && selectedResource && (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryText}>
              <span className={styles.summaryWhen}>
                {summaryWhen ?? '— pick a date & time —'}
              </span>
              <span className={styles.summaryMeta}>
                {selectedService.name}&nbsp;· {selectedResource.name}
              </span>
            </div>
          </div>
          <button
            className={styles.submit}
            disabled={!canConfirm || isLoading}
            onClick={handleConfirm}
          >
            <span>{isLoading ? 'Sending…' : 'Confirm reservation'}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
          <p className={styles.fineprint}>No charge until the provider confirms.</p>
        </>
      )}
    </div>
  );
}
