import { useEffect, useState } from 'react';

export type GeolocationErrorReason =
  | 'unsupported'
  | 'permissionDenied'
  | 'positionUnavailable'
  | 'timeout';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: GeolocationErrorReason | null;
}

function toErrorReason(error: GeolocationPositionError): GeolocationErrorReason {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'permissionDenied';
    case error.TIMEOUT:
      return 'timeout';
    default:
      return 'positionUnavailable';
  }
}

/** Wraps navigator.geolocation.getCurrentPosition; requests the position once on mount. */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ latitude: null, longitude: null, error: 'unsupported' });
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        });
      },
      (error) => {
        if (cancelled) return;
        setState({ latitude: null, longitude: null, error: toErrorReason(error) });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
