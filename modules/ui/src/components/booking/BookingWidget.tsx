import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AvailabilityBlock, BusinessService, Resource } from '@domain';
import { useResourceSlots } from '../../hooks/useResourceSlots';
import { useAvailabilityBlocks } from '../../hooks/useAvailabilityBlocks';
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

function fmtDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function unitSuffix(unit: BusinessService['durationUnit']): string {
  if (unit === 'HOURS') return 'h';
  if (unit === 'DAYS') return 'd';
  return 'min';
}

function fmtServiceMeta(svc: BusinessService): string {
  const s = unitSuffix(svc.durationUnit);
  return svc.fixedDuration
    ? `${svc.minDuration}${s}`
    : `${svc.minDuration}–${svc.maxDuration}${s}`;
}

/** Inclusive→exclusive day count between two ISO dates (yyyy-mm-dd). */
function daysBetween(fromStr: string, toExclusiveStr: string): number {
  return Math.round((Date.parse(toExclusiveStr) - Date.parse(fromStr)) / 86_400_000);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function rangeValues(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = min; v <= max; v += step) out.push(v);
  return out;
}

/** Availability block covering a given day (block end is exclusive). */
function blockForDay(dateStr: string, blocks: AvailabilityBlock[]): AvailabilityBlock | null {
  return (
    blocks.find((b) => dateStr >= b.startTime.slice(0, 10) && dateStr < b.endTime.slice(0, 10)) ??
    null
  );
}

/** Max stay length (in days) starting on `checkInStr`, bounded by service max and block end. */
function maxLengthFrom(checkInStr: string, block: AvailabilityBlock, svc: BusinessService): number {
  return Math.min(svc.maxDuration, daysBetween(checkInStr, block.endTime.slice(0, 10)));
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
  'Someone has requested this — yours will be considered if theirs is rejected.';

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
  // Chosen length (in the service's unit) for custom MINUTES/HOURS services.
  const [chosenDuration, setChosenDuration] = useState<number | null>(null);
  // Selected calendar day — the slot day for MIN/HR, or the check-in day for DAYS.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Stay length in days for DAYS services.
  const [selectedLength, setSelectedLength] = useState<number | null>(null);
  // Full ISO startTime of the chosen MIN/HR slot.
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const isDays = selectedService?.durationUnit === 'DAYS';
  const isCustomTime = !!selectedService && !isDays && !selectedService.fixedDuration;
  const canPick = !!selectedService && !!selectedResource;
  const slotDuration = isCustomTime
    ? (chosenDuration ?? selectedService!.minDuration)
    : undefined;

  const calendarDays = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthFrom = toDateStr(new Date(viewYear, viewMonth, 1));
  const monthTo = toDateStr(new Date(viewYear, viewMonth + 1, 0));

  const { data: slots = [] } = useResourceSlots(
    selectedResource?.id ?? '',
    selectedService?.id ?? '',
    monthFrom,
    monthTo,
    canPick && !isDays,
    slotDuration,
  );

  const { data: blocks = [] } = useAvailabilityBlocks(
    selectedResource?.id ?? '',
    selectedService?.id ?? '',
    monthFrom,
    monthTo,
    canPick && isDays,
  );

  const durationOptions = useMemo(
    () =>
      isCustomTime
        ? rangeValues(
            selectedService!.minDuration,
            selectedService!.maxDuration,
            selectedService!.durationStep,
          )
        : [],
    [isCustomTime, selectedService],
  );

  const lengthOptions = useMemo(() => {
    if (!isDays || !selectedDate || !selectedService) return [];
    const block = blockForDay(selectedDate, blocks);
    if (!block) return [];
    const maxLen = maxLengthFrom(selectedDate, block, selectedService);
    if (maxLen < selectedService.minDuration) return [];
    return rangeValues(selectedService.minDuration, maxLen, selectedService.durationStep);
  }, [isDays, selectedDate, selectedService, blocks]);

  const daySlots = useMemo(
    () => (selectedDate ? slots.filter((s) => s.startTime.startsWith(selectedDate)) : []),
    [slots, selectedDate],
  );

  const availableCount = daySlots.filter((s) => s.status !== 'CONFIRMED').length;

  function resetSelection() {
    setSelectedDate(null);
    setSelectedLength(null);
    setSelectedSlot(null);
  }

  function handleServiceSelect(svc: BusinessService) {
    setSelectedService(svc);
    resetSelection();
    const custom = svc.durationUnit !== 'DAYS' && !svc.fixedDuration;
    setChosenDuration(custom ? svc.minDuration : null);
  }

  function handleResourceSelect(resource: Resource) {
    onResourceChange(resource);
    resetSelection();
  }

  function handleDurationChange(value: number) {
    setChosenDuration(value);
    setSelectedSlot(null); // slot boundaries depend on the chosen length
  }

  function handleDaySelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    if (isDays && selectedService) {
      const block = blockForDay(dateStr, blocks);
      const maxLen = block ? maxLengthFrom(dateStr, block, selectedService) : 0;
      setSelectedLength(maxLen >= selectedService.minDuration ? selectedService.minDuration : null);
    }
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

  // ── Per-day calendar cell descriptor ──
  function describeDay(d: Date): {
    disabled: boolean;
    classes: string[];
    onClick?: () => void;
    title?: string;
  } {
    const dateStr = toDateStr(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = d < today;
    const isToday = sameDay(d, now);

    if (!canPick) {
      return { disabled: isPast, classes: isToday && !isPast ? [styles.dayToday!] : [] };
    }

    if (isDays) {
      const block = blockForDay(dateStr, blocks);
      const status = block?.status;
      const fits = block ? maxLengthFrom(dateStr, block, selectedService!) >= selectedService!.minDuration : false;
      const selectable = !isPast && !!block && status !== 'CONFIRMED' && fits;
      const inStay =
        !!selectedDate &&
        !!selectedLength &&
        dateStr >= selectedDate &&
        dateStr < addDays(selectedDate, selectedLength);
      const isCheckIn = selectedDate === dateStr;
      const classes = [
        status === 'PENDING' && !isCheckIn ? styles.dayPending! : '',
        status === 'CONFIRMED' ? styles.dayConfirmed! : '',
        !selectable ? styles.dayDisabled! : '',
        isToday && selectable ? styles.dayToday! : '',
        inStay && !isCheckIn ? styles.dayInRange! : '',
        isCheckIn ? styles.daySelected! : '',
      ].filter(Boolean);
      return {
        disabled: !selectable,
        classes,
        onClick: selectable ? () => handleDaySelect(dateStr) : undefined,
        title: status === 'PENDING' ? PENDING_TOOLTIP : undefined,
      };
    }

    // MINUTES / HOURS
    const hasSlot = slots.some((s) => s.startTime.startsWith(dateStr) && s.status !== 'CONFIRMED');
    const disabled = isPast || !hasSlot;
    const isSelected = selectedDate === dateStr;
    const classes = [
      disabled ? styles.dayDisabled! : '',
      isToday && !disabled ? styles.dayToday! : '',
      isSelected ? styles.daySelected! : '',
    ].filter(Boolean);
    return {
      disabled,
      classes,
      onClick: disabled ? undefined : () => handleDaySelect(dateStr),
    };
  }

  const canGoPrev =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const summaryWhen = (() => {
    if (!selectedService) return null;
    if (isDays) {
      if (selectedDate && selectedLength) {
        const checkOut = addDays(selectedDate, selectedLength);
        return `${fmtDay(selectedDate)} → ${fmtDay(checkOut)} · ${selectedLength}d`;
      }
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
      if (!selectedDate || !selectedLength) return;
      startTime = `${selectedDate}T00:00:00`;
      endTime = `${addDays(selectedDate, selectedLength)}T00:00:00`;
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
                <span className={styles.tabMeta}>&nbsp;· {fmtServiceMeta(svc)}</span>
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

      {/* ── Duration picker (custom MINUTES/HOURS) ── */}
      {canPick && isCustomTime && (
        <div>
          <p className={styles.sectionLabel}>Duration</p>
          <select
            className={styles.picker}
            value={slotDuration}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
          >
            {durationOptions.map((v) => (
              <option key={v} value={v}>
                {v} {unitSuffix(selectedService!.durationUnit)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Calendar ── */}
      {canPick && (
        <div>
          <p className={styles.sectionLabel}>{isDays ? 'Check-in date' : 'Date'}</p>
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
            <button className={styles.iconBtn} onClick={handleNextMonth} aria-label="Next month">
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
              const info = describeDay(d);
              return (
                <button
                  key={dateStr}
                  className={[styles.day, ...info.classes].join(' ')}
                  disabled={info.disabled}
                  title={info.title}
                  onClick={info.onClick}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Length picker (DAYS) ── */}
      {canPick && isDays && selectedDate && (
        <div>
          <p className={styles.sectionLabel}>Length</p>
          {lengthOptions.length === 0 ? (
            <p className={styles.noSlots}>No stay fits from this check-in date.</p>
          ) : (
            <select
              className={styles.picker}
              value={selectedLength ?? ''}
              onChange={(e) => setSelectedLength(Number(e.target.value))}
            >
              {lengthOptions.map((v) => (
                <option key={v} value={v}>
                  {v} {v === 1 ? 'day' : 'days'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── Time slots (MINUTES/HOURS) ── */}
      {canPick && selectedDate && !isDays && (
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
