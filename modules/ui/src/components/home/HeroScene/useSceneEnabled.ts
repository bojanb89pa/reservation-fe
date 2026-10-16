import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { SCENE_MEDIA_QUERY, detectWebGL, shouldShowScene } from './sceneLogic';

/** True when the 3D hero scene may be shown (desktop, WebGL, no reduced motion, capable CPU). */
export function useSceneEnabled(): boolean {
  const reducedMotion = useReducedMotion() ?? false;
  const [desktop, setDesktop] = useState(false);
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(SCENE_MEDIA_QUERY);
    const sync = () => setDesktop(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (desktop) setWebgl(detectWebGL());
  }, [desktop]);

  return shouldShowScene({
    matchesDesktop: desktop,
    prefersReducedMotion: reducedMotion,
    webglAvailable: webgl,
    hardwareConcurrency:
      typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency,
  });
}
