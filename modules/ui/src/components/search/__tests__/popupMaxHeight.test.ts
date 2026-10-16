import { describe, it, expect } from 'vitest';
import { computePopupMaxHeight } from '../popupMaxHeight';

describe('computePopupMaxHeight', () => {
  it('caps at 420px when there is plenty of room', () => {
    expect(computePopupMaxHeight(200, 1200)).toBe(420);
  });

  it('shrinks to the space below the popup minus a 16px gap', () => {
    // 720 viewport, popup top at 450 -> 720 - 450 - 16
    expect(computePopupMaxHeight(450, 720)).toBe(254);
  });

  it('never goes below 160px', () => {
    expect(computePopupMaxHeight(700, 720)).toBe(160);
  });
});
