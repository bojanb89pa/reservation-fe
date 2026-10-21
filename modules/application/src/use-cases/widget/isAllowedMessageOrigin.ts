/**
 * Exact match of the whole origin (`scheme://host[:port]`) against the allow-list: no prefixes,
 * no wildcards. The opaque origin "null" and an empty string are always rejected.
 */
export function isAllowedMessageOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  if (!origin || origin === 'null') {
    return false;
  }
  return allowedOrigins.includes(origin);
}
