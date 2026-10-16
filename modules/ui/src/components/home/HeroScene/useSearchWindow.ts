import { useEffect } from 'react';
import type { MotionValue } from 'framer-motion';
import { createSearchWindowController } from './sceneLogic';

interface Options {
  progress: MotionValue<number>;
  enabled: boolean;
  focus: () => void;
  blur: () => void;
  canBlur: () => boolean;
}

/** Focuses/blurs the search field when scroll progress enters/leaves the SEARCH phase (no React state). */
export function useSearchWindow({ progress, enabled, focus, blur, canBlur }: Options) {
  useEffect(() => {
    if (!enabled) return;
    const controller = createSearchWindowController({ focus, blur, canBlur });
    controller.update(progress.get());
    return progress.on('change', (v) => controller.update(v));
  }, [progress, enabled, focus, blur, canBlur]);
}
