import { env } from '../config/environment';

/**
 * Turns a root-relative path returned by the API (e.g. `/api/businesses/1/image`) into an
 * absolute URL on the API origin. Absolute URLs and null pass through unchanged.
 */
export function resolveApiUrl(
  url: string | null,
  baseUrl: string = env.resourceBaseUrl,
): string | null {
  if (url === null || !url.startsWith('/') || url.startsWith('//')) {
    return url;
  }
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    // WARNING: resourceBaseUrl is not an absolute URL, imageUrl returned unchanged — verify before merging
    return url;
  }
}

export function withResolvedImageUrl<T extends { imageUrl: string | null }>(item: T): T {
  return { ...item, imageUrl: resolveApiUrl(item.imageUrl) };
}
