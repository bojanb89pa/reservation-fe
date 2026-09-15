import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
});

describe('useGeolocation', () => {
  it('returns latitude and longitude on success', async () => {
    const getCurrentPosition = vi.fn(
      (success: PositionCallback) =>
        void success({ coords: { latitude: 44.8, longitude: 20.4 } } as GeolocationPosition),
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.latitude).toBe(44.8));
    expect(result.current.longitude).toBe(20.4);
    expect(result.current.error).toBeNull();
  });

  it('maps a permission-denied failure to the permissionDenied reason', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) =>
        void error({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.error).toBe('permissionDenied'));
    expect(result.current.latitude).toBeNull();
  });

  it('returns the unsupported reason when the browser has no geolocation API', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.error).toBe('unsupported');
  });
});
