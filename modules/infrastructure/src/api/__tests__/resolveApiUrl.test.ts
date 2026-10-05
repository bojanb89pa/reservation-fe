import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from '../resolveApiUrl';

describe('resolveApiUrl', () => {
  it('resolves a relative path against the API origin (local)', () => {
    expect(resolveApiUrl('/api/businesses/abc/image', 'http://localhost:8080/api')).toBe(
      'http://localhost:8080/api/businesses/abc/image',
    );
  });

  it('resolves a relative path against the API origin (staging)', () => {
    expect(resolveApiUrl('/api/businesses/abc/image', 'https://reserva.bojanlab.com/api')).toBe(
      'https://reserva.bojanlab.com/api/businesses/abc/image',
    );
  });

  it('keeps absolute URLs unchanged', () => {
    expect(resolveApiUrl('https://cdn.example.com/a.png', 'http://localhost:8080/api')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('keeps null as null', () => {
    expect(resolveApiUrl(null, 'http://localhost:8080/api')).toBeNull();
  });
});
