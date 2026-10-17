// Pure logic for the typing light wave — no three, no React, testable in jsdom.

export const WAVE_MAX = 4;
export const WAVE_MIN_GAP_MS = 70;
export const WAVE_DURATION_MS = 1200;

export const WAVE_STRENGTH = {
  normal: 1,
  delete: 0.5,
  paste: 1.5,
} as const;

/** Imperative handle exposed by the scene; a no-op when the scene is not active. */
export interface HeroSceneHandle {
  pulse: (options: { strength: number }) => void;
}

/**
 * Strength of the wave for a change of the search value, or null when nothing changed.
 * Deleting sends a weaker wave; a jump of several characters (paste, accepted suggestion)
 * sends one stronger wave.
 */
export function pulseStrengthForChange(prev: string, next: string): number | null {
  if (prev === next) return null;
  if (next.length < prev.length) return WAVE_STRENGTH.delete;
  if (next.length - prev.length >= 2) return WAVE_STRENGTH.paste;
  return WAVE_STRENGTH.normal;
}

export interface Wave {
  /** Source in scene (world) coordinates. */
  x: number;
  y: number;
  strength: number;
  startMs: number;
}

export interface ActiveWave {
  x: number;
  y: number;
  strength: number;
  /** Seconds since the wave started. */
  age: number;
  /** 0→1 over the wave lifetime. */
  progress: number;
}

export interface WaveQueueOptions {
  max?: number;
  minGapMs?: number;
  durationMs?: number;
}

export function createWaveQueue({
  max = WAVE_MAX,
  minGapMs = WAVE_MIN_GAP_MS,
  durationMs = WAVE_DURATION_MS,
}: WaveQueueOptions = {}) {
  let waves: Wave[] = [];

  const prune = (nowMs: number) => {
    waves = waves.filter((w) => nowMs - w.startMs < durationMs);
  };

  return {
    /** Adds a wave. Within `minGapMs` of the newest wave it merges into it (keeps the stronger). */
    add(wave: Omit<Wave, 'startMs'>, nowMs: number) {
      prune(nowMs);
      const newest = waves[waves.length - 1];
      if (newest && nowMs - newest.startMs < minGapMs) {
        newest.strength = Math.max(newest.strength, wave.strength);
        return;
      }
      if (waves.length >= max) waves.shift(); // replace the oldest
      waves.push({ ...wave, startMs: nowMs });
    },
    /** Live waves (oldest first); expired ones are dropped. */
    active(nowMs: number): ActiveWave[] {
      prune(nowMs);
      return waves.map((w) => ({
        x: w.x,
        y: w.y,
        strength: w.strength,
        age: (nowMs - w.startMs) / 1000,
        progress: (nowMs - w.startMs) / durationMs,
      }));
    },
    size: () => waves.length,
  };
}
