import { useMemo } from 'react';
import { toWidgetLocale, toWidgetTheme } from '@fe/domain';
import type { WidgetLocale, WidgetTheme } from '@fe/domain';

export interface WidgetParams {
  clientId: string;
  locationId: string;
  theme: WidgetTheme;
  locale: WidgetLocale;
  /**
   * Origin of the page that embeds the iframe (the only `targetOrigin` the widget ever posts
   * to). `null` when it cannot be determined, in which case the widget stays silent.
   */
  parentOrigin: string | null;
}

function toOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Reads the iframe URL parameters written by the loader: `clientId`, `locationId`, `theme`,
 * `locale` and `origin` (the host page origin; falls back to the referrer origin, which the
 * loader's `referrerpolicy="strict-origin"` reduces to the origin).
 */
export function readWidgetParams(search: string, referrer: string): WidgetParams {
  const query = new URLSearchParams(search);
  return {
    clientId: query.get('clientId') ?? '',
    locationId: query.get('locationId') ?? '',
    theme: toWidgetTheme(query.get('theme')),
    locale: toWidgetLocale(query.get('locale')),
    parentOrigin: toOrigin(query.get('origin')) ?? toOrigin(referrer),
  };
}

export function useWidgetParams(): WidgetParams {
  return useMemo(() => readWidgetParams(window.location.search, document.referrer), []);
}
