// Pure logic for the scroll-driven hero scene — no three, no React, testable in jsdom.

export const SCENE_MEDIA_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
export const MIN_HARDWARE_CONCURRENCY = 4;

export interface SceneEnvironment {
  /** Result of matching SCENE_MEDIA_QUERY. */
  matchesDesktop: boolean;
  prefersReducedMotion: boolean;
  webglAvailable: boolean;
  /** `navigator.hardwareConcurrency`; undefined when the browser does not expose it. */
  hardwareConcurrency?: number;
}

export function shouldShowScene(env: SceneEnvironment): boolean {
  if (!env.matchesDesktop || env.prefersReducedMotion || !env.webglAvailable) return false;
  const cores = env.hardwareConcurrency;
  return cores === undefined || cores === 0 || cores >= MIN_HARDWARE_CONCURRENCY;
}

export type ScenePhase = 'discover' | 'connect' | 'search' | 'transition';

export const PHASE_BOUNDS = {
  connectStart: 0.3,
  searchStart: 0.55,
  searchEnd: 0.8,
} as const;

/** Scroll progress the type-to-focus shortcut scrolls to (inside the SEARCH window). */
export const SEARCH_SCROLL_PROGRESS = 0.6;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function getPhase(progress: number): ScenePhase {
  if (progress < PHASE_BOUNDS.connectStart) return 'discover';
  if (progress < PHASE_BOUNDS.searchStart) return 'connect';
  if (progress < PHASE_BOUNDS.searchEnd) return 'search';
  return 'transition';
}

export function isInSearchWindow(progress: number): boolean {
  return getPhase(progress) === 'search';
}

/**
 * Absolute scrollY for a given hero progress. The scroll range of the hero is
 * `sectionHeight - viewportHeight` (the sticky stage is one viewport tall).
 */
export function scrollTargetForProgress(
  progress: number,
  sectionTop: number,
  sectionHeight: number,
  viewportHeight: number,
): number {
  const range = Math.max(sectionHeight - viewportHeight, 0);
  return sectionTop + clamp01(progress) * range;
}

export interface SearchWindowHandlers {
  /** Focus the field without scrolling and without opening the list. */
  focus: () => void;
  blur: () => void;
  /** True when the field is empty and the suggestion list is not open. */
  canBlur: () => boolean;
}

/**
 * Tracks entering/leaving the SEARCH window. Entering focuses the field, but only after a real
 * user scroll (`markScrolled`); `sync` adopts the current state silently (mount, `enabled` change,
 * hero resize). Leaving blurs the field, but only if it is empty and the suggestion list is closed.
 */
export function createSearchWindowController(handlers: SearchWindowHandlers) {
  let inside = false;
  let scrolled = false;
  return {
    /** Adopts the state for `progress` without calling focus or blur. */
    sync(progress: number) {
      inside = isInSearchWindow(progress);
    },
    markScrolled() {
      scrolled = true;
    },
    update(progress: number) {
      const now = isInSearchWindow(progress);
      if (now === inside) return;
      inside = now;
      if (now) {
        if (scrolled) handlers.focus();
      } else if (handlers.canBlur()) handlers.blur();
    },
    isInside: () => inside,
  };
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Smoothstep between two edges. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Deterministic PRNG (mulberry32). */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
