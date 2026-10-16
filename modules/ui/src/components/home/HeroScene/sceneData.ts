import { createRng } from './sceneLogic';

// Deterministic geometry data for the hero scene: fixed seed, generated once, no three dependency.

export const POINT_COUNT = 800;
const SEED = 298;

export interface SceneData {
  count: number;
  /** DISCOVER state — wide, calm scatter. */
  pos0: Float32Array;
  /** CONNECT state — organic clusters. */
  pos1: Float32Array;
  /** SEARCH state — contracted toward the search bar, with an empty area around title and bar. */
  pos2: Float32Array;
  seed: Float32Array;
  size: Float32Array;
  /** 0 primary, 1 secondary, 2 accent, 3 cyan. */
  tone: Float32Array;
  /** Segment endpoints (pairs of point indices) with per-segment attributes. */
  segments: {
    a: number;
    b: number;
    /** Progress at which the segment starts to appear. */
    start: number;
    /** Random rank used to thin the lines out in the light theme. */
    rank: number;
    /** 0 network line, 1 hover-only candidate line. */
    kind: number;
  }[];
}

function gauss(rng: () => number): number {
  return (rng() + rng() + rng() - 1.5) * 0.9;
}

export function generateSceneData(count = POINT_COUNT): SceneData {
  const rng = createRng(SEED);
  const pos0 = new Float32Array(count * 3);
  const pos1 = new Float32Array(count * 3);
  const pos2 = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const size = new Float32Array(count);
  const tone = new Float32Array(count);

  const clusters = Array.from({ length: 9 }, () => [
    (rng() - 0.5) * 22,
    (rng() - 0.5) * 11,
    -6 + rng() * 8,
  ]);

  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 28;
    const y = (rng() - 0.5) * 16;
    const z = -10 + rng() * 14;
    pos0.set([x, y, z], i * 3);

    // Pull toward the nearest cluster centre, with some organic spread.
    let best = clusters[0];
    let bestD = Infinity;
    for (const c of clusters) {
      const d = (c[0] - x) ** 2 + (c[1] - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    const pull = 0.55;
    pos1.set(
      [
        x + (best[0] - x) * pull + gauss(rng) * 0.6,
        y + (best[1] - y) * pull + gauss(rng) * 0.6,
        z + (best[2] - z) * pull,
      ],
      i * 3,
    );

    // Contract toward the search bar; keep an elliptical hole around title + bar.
    let sx = x * 0.5;
    let sy = y * 0.5 - 0.6;
    const hx = 6.2;
    const hy = 2.4;
    const e = (sx / hx) ** 2 + ((sy + 0.6) / hy) ** 2;
    if (e < 1) {
      const k = 1 / Math.max(Math.sqrt(e), 0.2);
      sx *= k;
      sy = (sy + 0.6) * k - 0.6;
    }
    pos2.set([sx, sy, z * 0.5], i * 3);

    seed[i] = rng();
    size[i] = 3 + rng() * 3.5;
    const r = rng();
    tone[i] = r < 0.88 ? 0 : r < 0.92 ? 1 : r < 0.96 ? 2 : 3;
    // Accents are a bit larger so they read as highlights.
    if (tone[i] !== 0) size[i] += 1.5;
  }

  const segments: SceneData['segments'] = [];
  const dist = (arr: Float32Array, i: number, j: number) =>
    Math.hypot(
      arr[i * 3] - arr[j * 3],
      arr[i * 3 + 1] - arr[j * 3 + 1],
      arr[i * 3 + 2] - arr[j * 3 + 2],
    );
  const seen = new Set<number>();
  const push = (a: number, b: number, kind: number) => {
    const key = Math.min(a, b) * count + Math.max(a, b);
    if (seen.has(key + kind * count * count)) return;
    seen.add(key + kind * count * count);
    segments.push({ a, b, start: 0.3 + rng() * 0.2, rank: rng(), kind });
  };

  for (let i = 0; i < count; i++) {
    // Nearest two neighbours in the CONNECT layout.
    const near: { j: number; d: number }[] = [];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      near.push({ j, d: dist(pos1, i, j) });
    }
    near.sort((p, q) => p.d - q.d);
    if (i % 3 === 0) {
      for (const n of near.slice(0, 2)) if (n.d < 2.2) push(i, n.j, 0);
    }
    // Hover-only candidates: close in the DISCOVER layout too.
    const near0 = near
      .map((n) => ({ j: n.j, d: dist(pos0, i, n.j) }))
      .filter((n) => n.d < 3.2)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3);
    for (const n of near0) push(i, n.j, 1);
  }

  return { count, pos0, pos1, pos2, seed, size, tone, segments };
}
