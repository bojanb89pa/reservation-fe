import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BusinessService, Resource } from '@fe/domain';
import { BookingWidget } from '../BookingWidget';
import { businessToday } from '../businessToday';

vi.mock('../../../hooks/useResourceSlots', () => ({
  useResourceSlots: () => ({
    data: [
      { startTime: '2026-03-10T10:00:00', endTime: '2026-03-10T10:30:00', status: 'FREE' },
      { startTime: '2026-03-11T10:00:00', endTime: '2026-03-11T10:30:00', status: 'FREE' },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
  }),
}));
vi.mock('../../../hooks/useAvailabilityBlocks', () => ({
  useAvailabilityBlocks: () => ({ data: [] }),
}));

const service = {
  id: 's1',
  name: 'Cut',
  durationUnit: 'MINUTES',
  fixedDuration: true,
  minDuration: 30,
  maxDuration: 30,
  durationStep: 30,
} as unknown as BusinessService;
const resource = { id: 'r1', businessId: 'b1', type: 'CHAIR', name: 'Chair' } as unknown as Resource;

describe('business-zone "today"', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 23:30 UTC on 10 Mar = 00:30 on 11 Mar in Belgrade (CET, UTC+1)
    vi.setSystemTime(new Date('2026-03-10T23:30:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('businessToday returns the Belgrade date', () => {
    const d = businessToday('Europe/Belgrade');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 11]);
  });

  it('falls back to Europe/Belgrade for unknown or missing zones', () => {
    for (const tz of [null, undefined, '', 'Not/AZone']) {
      expect(businessToday(tz).getDate()).toBe(11);
    }
  });

  it('calendar treats the Belgrade date as today and the 10th as past', () => {
    render(
      <BookingWidget
        services={[service]}
        resources={[resource]}
        selectedResource={resource}
        onResourceChange={vi.fn()}
        onConfirm={vi.fn()}
        timezone="Europe/Belgrade"
      />,
    );
    expect(screen.getByRole('button', { name: '10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '11' })).toBeEnabled();
  });
});
