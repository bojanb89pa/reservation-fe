import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessService, Resource } from '@domain';
import { useResourceSlots } from '../../hooks/useResourceSlots';
import styles from './BookingWidget.module.css';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

function slotTime(isoStr: string): string {
  return isoStr.slice(11, 16);
}

function fmtMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function fmtSlotSummary(isoStartTime: string): string {
  const dateStr = isoStartTime.slice(0, 10);
  const d = new Date(dateStr + 'T00:00:00');
  const datePart = d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${datePart} · ${slotTime(isoStartTime)}`;
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
  selectedResource: Resource | null;
  onResourceChange: (resource: Resource | null) => void;
  onConfirm: (selection: BookingSelection) => Promise<void>;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PENDING_TOOLTIP =
  "Someone has requested this slot — yours will be considered if theirs is rejected";

export function BookingWidget({
  services,
  resources,
  selectedResource,
  onResourceChange,
  onConfirm,
  isLoading,
}: BookingWidgetProps) {
  const { t } = useTranslation();
  const now = new Date();

  const [selectedService, setSelectedService] = useState<BusinessService | null>(
    services.length === 1 ? services[0]! : null,
  );
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  // selectedSlot is the full ISO startTime of the chosen slot
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const isDays = selectedService?.durationUnit === 'DAYS';
  const canPickDateTime = !!selectedService && !!selectedResource;

  const calendarDays = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthFrom = toDateStr(new Date(viewYear, viewMonth, 1));
  const monthTo = toDateStr(new Date(viewYear, viewMonth + 1, 0));

  const { data: slots = [] } = useResourceSlots(
    selectedResource?.id ?? '',
    selectedService?.id ?? '',
    monthFrom,
    monthTo,
    canPickDateTime && !isDays,
  );

  const daySlots = useMemo(
    () => (selectedDate ? slots.filter((s) => s.startTime.startsWith(selectedDate)) : []),
    [slots, selectedDate],
  );

  const availableCount = daySlots.filter((s) => s.status !== 'CONFIRMED').length;

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
    if (!canPickDateTime || isDays) return false;
    const ds = toDateStr(d);
    return !slots.some((s) => s.startTime.startsWith(ds) && s.status !== 'CONFIRMED');
  }

  const canGoPrev =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const summaryWhen = (() => {
    if (!selectedService) return null;
    if (isDays) {
      if (selectedDate && selectedEndDate)
        return fmtDateRangeSummary(selectedDate, selectedEndDate);
      return null;
    }
    if (selectedSlot) return fmtSlotSummary(selectedSlot);
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
      if (!selectedSlot) return;
      const slot = slots.find((s) => s.startTime === selectedSlot);
      if (!slot) return;
      startTime = slot.startTime;
      endTime = slot.endTime;
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
                className={[styles.tab, selectedService?.id === svc.id ? styles.tabActive : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleServiceSelect(svc)}
              >
                {svc.name}
                <span className={styles.tabMeta}>
                  &nbsp;· {fmtDuration(svc.duration, svc.durationUnit)}
                </span>
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
                className={[styles.tab, selectedResource?.id === res.id ? styles.tabActive : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleResourceSelect(res)}
              >
                {res.name}
                <span className={styles.tabMeta}>&nbsp;· {t(`resourceType.${res.type}`)}</span>
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
            {availableCount > 0 && (
              <span className={styles.slotCount}>&nbsp;· {availableCount} available</span>
            )}
          </p>
          {daySlots.length === 0 ? (
            <p className={styles.noSlots}>No available slots for this date.</p>
          ) : (
            <div className={styles.slots}>
              {daySlots.map((slot) => {
                const isConfirmed = slot.status === 'CONFIRMED';
                const isPending = slot.status === 'PENDING';
                const isSelected = selectedSlot === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    aria-pressed={isSelected}
                    disabled={isConfirmed}
                    title={isPending ? PENDING_TOOLTIP : undefined}
                    className={[
                      styles.slot,
                      isConfirmed ? styles.slotConfirmed : '',
                      isPending ? styles.slotPending : '',
                      isSelected ? styles.slotSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => !isConfirmed && setSelectedSlot(slot.startTime)}
                  >
                    {slotTime(slot.startTime)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Summary + Confirm ── */}
      {selectedService && selectedResource && (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryText}>
              <span className={styles.summaryWhen}>{summaryWhen ?? '— pick a date & time —'}</span>
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
