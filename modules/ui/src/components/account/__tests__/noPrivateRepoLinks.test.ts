import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = join(__dirname, '..', '..', '..');
const FORBIDDEN = 'github.com/bojanb89pa/reservation-';

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : collect(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('UI source', () => {
  it('does not link to private repositories', () => {
    const offenders = collect(SRC_ROOT).filter((f) => readFileSync(f, 'utf8').includes(FORBIDDEN));
    expect(offenders).toEqual([]);
  });
});
