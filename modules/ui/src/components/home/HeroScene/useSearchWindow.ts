import { useEffect, type RefObject } from 'react';
import type { MotionValue } from 'framer-motion';
import { createSearchWindowController } from './sceneLogic';

interface Options {
  progress: MotionValue<number>;
  enabled: boolean;
  /** Hero element; its resizes (e.g. switching to the 3D height) re-sync the controller without focus. */
  target?: RefObject<Element | null>;
  focus: () => void;
  blur: () => void;
  canBlur: () => boolean;
}

/**
 * Focuses/blurs the search field when scroll progress enters/leaves the SEARCH phase (no React state).
 * Never focuses on mount: the initial progress may be stale until the hero has its final height.
 */
export function useSearchWindow({ progress, enabled, target, focus, blur, canBlur }: Options) {
  useEffect(() => {
    if (!enabled) return;
    const controller = createSearchWindowController({ focus, blur, canBlur });
    controller.sync(progress.get());

    // Re-measure after the hero switched to its 3D height, silently.
    const raf = requestAnimationFrame(() => controller.sync(progress.get()));
    const hero = target?.current;
    const observer =
      hero && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => controller.sync(progress.get()))
        : null;
    if (hero) observer?.observe(hero);

    let lastScrollY = window.scrollY;
    const onScroll = () => {
      if (window.scrollY === lastScrollY) return;
      lastScrollY = window.scrollY;
      controller.markScrolled();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const unsubscribe = progress.on('change', (v) => controller.update(v));
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      unsubscribe();
    };
  }, [progress, enabled, target, focus, blur, canBlur]);
}
