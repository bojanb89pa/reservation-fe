import { describe, it, expect } from 'vitest';
import { DAYS_ORDERED, DAY_LABELS } from '../ResourceAvailabilityRule';

describe('ResourceAvailabilityRule constants', () => {
  it('DAYS_ORDERED has 7 days starting with Monday', () => {
    expect(DAYS_ORDERED).toHaveLength(7);
    expect(DAYS_ORDERED[0]).toBe('MONDAY');
    expect(DAYS_ORDERED[6]).toBe('SUNDAY');
  });

  it('DAY_LABELS maps all days', () => {
    for (const day of DAYS_ORDERED) {
      expect(DAY_LABELS[day]).toBeTruthy();
    }
  });
});
