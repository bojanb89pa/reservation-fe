// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MARKER = 'DEMO_TEST_IDENTITY_MARKER';
const TEST_ONLY_STRING = 'Prijava (test)';

async function bundleText(identity: string): Promise<string> {
  process.env.VITE_DEMO_IDENTITY = identity;
  const result = await build({
    root: ROOT,
    configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
    mode: 'production',
    logLevel: 'silent',
    build: { write: false, minify: false },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as {
    output: { type: string; code?: string }[];
  }[];
  return outputs
    .flatMap((o) => o.output)
    .map((chunk) => chunk.code ?? '')
    .join('\n');
}

describe('produkcijski bundle', () => {
  afterEach(() => {
    delete process.env.VITE_DEMO_IDENTITY;
  });

  it('ne sadrži test identitet kad VITE_DEMO_IDENTITY nije "test"', async () => {
    const code = await bundleText('');
    expect(code).toContain('gsi/client');
    expect(code).not.toContain(TEST_ONLY_STRING);
    expect(code).not.toContain('__DEMO_ID_TOKEN__');
    expect(code).not.toContain(MARKER);
  }, 120_000);

  it('sadrži test identitet kad je VITE_DEMO_IDENTITY=test (provera da test hvata kod)', async () => {
    const code = await bundleText('test');
    expect(code).toContain('__DEMO_ID_TOKEN__');
  }, 120_000);
});
