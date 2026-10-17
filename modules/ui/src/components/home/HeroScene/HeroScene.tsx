import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { RefObject } from 'react';
import type { MotionValue } from 'framer-motion';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
import { generateSceneData } from './sceneData';
import { clamp01 } from './sceneLogic';
import { WAVE_MAX, createWaveQueue } from './pulseQueue';
import type { HeroSceneHandle } from './pulseQueue';
import styles from './HeroScene.module.css';

interface Props {
  /** Normalised scroll progress (0→1) through the hero section. */
  progress: MotionValue<number>;
  /** Called when initialisation or the GL context fails, so the page can show the static backdrop. */
  onError: () => void;
  /** Element (the search bar) the typing waves originate from. */
  originRef?: RefObject<HTMLElement>;
}

const FOV = 50;
const CAMERA_Z = 14;
const MAX_TILT = (2.5 * Math.PI) / 180;
const CURSOR_RADIUS = 3.2;
const WAVE_BAND = 1.8; // world units, half-width of the ring
const THEME_TAU = 0.1; // seconds; ≈300ms to settle

interface ThemeParams {
  size: number;
  alpha: number;
  lineAlpha: number;
  lineDensity: number;
  lineHover: number;
  fog: number;
  cursorGain: number;
}

const DARK: ThemeParams = {
  size: 1.1,
  alpha: 0.9,
  lineAlpha: 0.42,
  lineDensity: 1,
  lineHover: 1.8,
  fog: 0.8,
  cursorGain: 1,
};
const LIGHT: ThemeParams = {
  size: 0.85,
  alpha: 0.85,
  lineAlpha: 0.25,
  lineDensity: 0.6,
  lineHover: 1.2,
  fog: 0.45,
  cursorGain: 1.15,
};

const TOKENS = ['--primary', '--secondary', '--accent', '--cyan'] as const;

/** The four dot tones followed by the line colour (last index). */
function readColors(light: boolean): Color[] {
  const style = getComputedStyle(document.documentElement);
  const colors = TOKENS.map((token) => {
    const color = new Color(style.getPropertyValue(token).trim());
    // Light theme: deeper, more saturated dots so they hold contrast on a bright background.
    if (light) color.offsetHSL(0, 0.1, -0.1);
    return color;
  });
  // Light theme: lines are a lighter, softer --primary instead of sharing the dot colour.
  const line = new Color(style.getPropertyValue('--primary').trim());
  if (light) line.offsetHSL(0, -0.05, 0.1);
  return [...colors, line];
}

const COMMON_GLSL = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uMouse;
  uniform float uCursorOn;
  uniform float uCursorRadius;
  uniform float uCursorGain;
  uniform float uFog;
  uniform vec4 uWave[${WAVE_MAX}]; // xy source, z strength, w progress (<0 = inactive)
  uniform float uWaveMaxR;

  vec3 statePos(vec3 a, vec3 b, vec3 c, float seed) {
    float s1 = smoothstep(0.25, 0.55, uProgress);
    float s2 = smoothstep(0.5, 0.8, uProgress);
    vec3 p = mix(mix(a, b, s1), c, s2);
    // Tiny ambient drift (a few pixels).
    p.xy += 0.035 * vec2(sin(uTime * 0.6 + seed * 40.0), cos(uTime * 0.5 + seed * 31.0));
    return p;
  }

  float cursorInfluence(vec3 p) {
    return (1.0 - smoothstep(0.0, uCursorRadius, distance(p.xy, uMouse.xy))) * uCursorOn * uCursorGain;
  }

  float depthFog(float depth) {
    return 1.0 - uFog * smoothstep(9.0, 30.0, depth);
  }

  // Light ring spreading from each typing wave source.
  float waveInfluence(vec3 p) {
    float sum = 0.0;
    for (int i = 0; i < ${WAVE_MAX}; i++) {
      vec4 w = uWave[i];
      if (w.w < 0.0) continue;
      float r = w.w * uWaveMaxR;
      float d = (distance(p.xy, w.xy) - r) / ${WAVE_BAND.toFixed(1)};
      float fade = pow(1.0 - w.w, 1.3) * smoothstep(0.0, 0.08, w.w);
      sum += w.z * exp(-d * d) * fade;
    }
    return min(sum, 1.6);
  }

  // Quiet, fading network during the final TRANSITION phase.
  float tail() {
    return 1.0 - 0.9 * smoothstep(0.8, 1.0, uProgress);
  }
`;

const POINT_VERT = /* glsl */ `
  ${COMMON_GLSL}
  attribute vec3 aPos1;
  attribute vec3 aPos2;
  attribute float aSeed;
  attribute float aSize;
  attribute float aTone;
  uniform float uSize;
  uniform float uAlpha;
  varying float vAlpha;
  varying float vTone;
  varying float vLight;
  varying float vWave;

  void main() {
    vec3 p = statePos(position, aPos1, aPos2, aSeed);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float c = cursorInfluence(p);
    float w = waveInfluence(p);
    gl_PointSize = aSize * uSize * uPixelRatio * (14.0 / depth) * (1.0 + 0.8 * c + 0.6 * w);
    gl_Position = projectionMatrix * mv;
    vAlpha = uAlpha * depthFog(depth) * tail() * (0.75 + 0.7 * c + 1.0 * w);
    vTone = aTone;
    vLight = c;
    vWave = w;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uCw;
  varying float vAlpha;
  varying float vTone;
  varying float vLight;
  varying float vWave;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    // Soft circle: bright core, gentle falloff — no post-processing glow.
    float glow = min(pow(1.0 - d, 1.3) + 0.35 * pow(1.0 - d, 4.0), 1.0);
    vec3 col = vTone < 0.5 ? uC0 : vTone < 1.5 ? uC1 : vTone < 2.5 ? uC2 : uC3;
    col = mix(col, uCw, clamp(vWave, 0.0, 1.0) * 0.7);
    gl_FragColor = vec4(col, min(glow * vAlpha, 1.0));
  }
`;

const LINE_VERT = /* glsl */ `
  ${COMMON_GLSL}
  attribute vec3 aPos1;
  attribute vec3 aPos2;
  attribute float aSeed;
  attribute float aStart;
  attribute float aRank;
  attribute float aKind;
  uniform float uLineAlpha;
  uniform float uLineDensity;
  uniform float uLineHover;
  varying float vAlpha;
  varying float vWave;

  void main() {
    vec3 p = statePos(position, aPos1, aPos2, aSeed);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float c = cursorInfluence(p);
    float shown = aKind < 0.5
      ? smoothstep(aStart, aStart + 0.1, uProgress) * (1.0 - smoothstep(0.55, 0.8, uProgress) * 0.08)
          * step(aRank, uLineDensity)
      : 0.0;
    float hover = c * c;
    float w = waveInfluence(p);
    float base = max(shown, hover * uLineHover);
    float kindNet = aKind < 0.5 ? 1.0 : 0.0;
    vAlpha = uLineAlpha * depthFog(-mv.z) * tail() * (base * (1.0 + 0.8 * w) + 0.5 * w * kindNet);
    vWave = w;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uLineColor;
  uniform vec3 uCw;
  varying float vAlpha;
  varying float vWave;
  void main() {
    vec3 col = mix(uLineColor, uCw, clamp(vWave, 0.0, 1.0) * 0.7);
    gl_FragColor = vec4(col, min(vAlpha, 1.0));
  }
`;

function buildScene(canvas: HTMLCanvasElement) {
  const data = generateSceneData();
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 80);
  camera.position.set(0, 0, CAMERA_Z);

  const sharedUniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uMouse: { value: new Vector3() },
    uCursorOn: { value: 0 },
    uCursorRadius: { value: CURSOR_RADIUS },
    uCursorGain: { value: 1 },
    uFog: { value: 0.8 },
    uWave: { value: Array.from({ length: WAVE_MAX }, () => new Vector4(0, 0, 0, -1)) },
    uWaveMaxR: { value: 30 },
    uCw: { value: new Color() },
    uC0: { value: new Color() },
    uC1: { value: new Color() },
    uC2: { value: new Color() },
    uC3: { value: new Color() },
    uLineColor: { value: new Color() },
  };

  // Points
  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute('position', new BufferAttribute(data.pos0, 3));
  pointGeometry.setAttribute('aPos1', new BufferAttribute(data.pos1, 3));
  pointGeometry.setAttribute('aPos2', new BufferAttribute(data.pos2, 3));
  pointGeometry.setAttribute('aSeed', new BufferAttribute(data.seed, 1));
  pointGeometry.setAttribute('aSize', new BufferAttribute(data.size, 1));
  pointGeometry.setAttribute('aTone', new BufferAttribute(data.tone, 1));
  const pointMaterial = new ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: { ...sharedUniforms, uSize: { value: 1 }, uAlpha: { value: 1 } },
    transparent: true,
    depthWrite: false,
  });
  const points = new Points(pointGeometry, pointMaterial);
  points.frustumCulled = false;

  // Lines (network + hover-only candidates), alpha per vertex in the shader.
  const n = data.segments.length * 2;
  const lp0 = new Float32Array(n * 3);
  const lp1 = new Float32Array(n * 3);
  const lp2 = new Float32Array(n * 3);
  const lSeed = new Float32Array(n);
  const lStart = new Float32Array(n);
  const lRank = new Float32Array(n);
  const lKind = new Float32Array(n);
  data.segments.forEach((s, k) => {
    [s.a, s.b].forEach((idx, end) => {
      const v = k * 2 + end;
      lp0.set(data.pos0.subarray(idx * 3, idx * 3 + 3), v * 3);
      lp1.set(data.pos1.subarray(idx * 3, idx * 3 + 3), v * 3);
      lp2.set(data.pos2.subarray(idx * 3, idx * 3 + 3), v * 3);
      lSeed[v] = data.seed[idx];
      lStart[v] = s.start;
      lRank[v] = s.rank;
      lKind[v] = s.kind;
    });
  });
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new BufferAttribute(lp0, 3));
  lineGeometry.setAttribute('aPos1', new BufferAttribute(lp1, 3));
  lineGeometry.setAttribute('aPos2', new BufferAttribute(lp2, 3));
  lineGeometry.setAttribute('aSeed', new BufferAttribute(lSeed, 1));
  lineGeometry.setAttribute('aStart', new BufferAttribute(lStart, 1));
  lineGeometry.setAttribute('aRank', new BufferAttribute(lRank, 1));
  lineGeometry.setAttribute('aKind', new BufferAttribute(lKind, 1));
  const lineMaterial = new ShaderMaterial({
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: {
      ...sharedUniforms,
      uLineAlpha: { value: 1 },
      uLineDensity: { value: 1 },
      uLineHover: { value: 1.8 },
    },
    transparent: true,
    depthWrite: false,
  });
  const lines = new LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;

  scene.add(lines, points);

  return {
    renderer,
    scene,
    camera,
    sharedUniforms,
    pointMaterial,
    lineMaterial,
    dispose() {
      pointGeometry.dispose();
      lineGeometry.dispose();
      pointMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

const HeroScene = forwardRef<HeroSceneHandle, Props>(function HeroScene(
  { progress, onError, originRef },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef<HeroSceneHandle['pulse'] | null>(null);

  useImperativeHandle(ref, () => ({ pulse: (options) => pulseRef.current?.(options) }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let built: ReturnType<typeof buildScene>;
    try {
      built = buildScene(canvas);
    } catch {
      onError();
      return;
    }
    const { renderer, scene, camera, sharedUniforms, pointMaterial, lineMaterial } = built;

    // ── Theme: colours from CSS tokens, smooth transition through uniforms ──
    const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
    const current: ThemeParams = { ...(isLight() ? LIGHT : DARK) };
    let target: ThemeParams = { ...current };
    const targetColors = readColors(isLight());
    const currentColors = targetColors.map((c) => c.clone());
    const uniformColors = [
      sharedUniforms.uC0,
      sharedUniforms.uC1,
      sharedUniforms.uC2,
      sharedUniforms.uC3,
      sharedUniforms.uLineColor,
    ];
    const applyBlending = () => {
      const blending = isLight() ? NormalBlending : AdditiveBlending;
      pointMaterial.blending = blending;
      // Additive lines would wash out on the light background.
      lineMaterial.blending = blending;
    };
    applyBlending();

    const onTheme = () => {
      const light = isLight();
      target = { ...(light ? LIGHT : DARK) };
      readColors(light).forEach((c, i) => targetColors[i].copy(c));
      applyBlending();
    };
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // ── Scroll progress → uniform (no React state) ──
    let progressValue = clamp01(progress.get());
    const offProgress = progress.on('change', (v) => {
      progressValue = clamp01(v);
    });

    // ── Cursor: camera tilt + one projected uniform ──
    const mouse = { x: 0, y: 0, inside: false };
    const tilt = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.inside = Math.abs(mouse.x) <= 1 && Math.abs(mouse.y) <= 1;
    };
    const onPointerLeave = () => {
      mouse.inside = false;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    // ── Resize ──
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // ── Render loop: only while visible and the tab is shown ──
    let onScreen = true;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const halfH = Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
    const waves = createWaveQueue();

    // Typing wave: the source is the centre of the search bar, unprojected onto the scene plane.
    pulseRef.current = ({ strength }) => {
      if (!onScreen || document.hidden) return;
      const origin = originRef?.current?.getBoundingClientRect();
      const rect = canvas.getBoundingClientRect();
      if (!origin || rect.width === 0 || rect.height === 0) return;
      const nx = ((origin.left + origin.width / 2 - rect.left) / rect.width) * 2 - 1;
      const ny = -(((origin.top + origin.height / 2 - rect.top) / rect.height) * 2 - 1);
      waves.add({ x: nx * halfH * camera.aspect, y: ny * halfH, strength }, performance.now());
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Motion slows down in the TRANSITION phase.
      const slow = 1 - 0.7 * clamp01((progressValue - 0.8) / 0.2);
      time += dt * slow;
      sharedUniforms.uTime.value = time;
      sharedUniforms.uProgress.value = progressValue;

      const k = 1 - Math.exp(-dt / THEME_TAU);
      (Object.keys(current) as (keyof ThemeParams)[]).forEach((key) => {
        current[key] += (target[key] - current[key]) * k;
      });
      currentColors.forEach((c, i) => {
        c.lerp(targetColors[i], k);
        uniformColors[i].value.copy(c);
      });
      sharedUniforms.uFog.value = current.fog;
      sharedUniforms.uCursorGain.value = current.cursorGain;
      pointMaterial.uniforms.uSize.value = current.size;
      pointMaterial.uniforms.uAlpha.value = current.alpha;
      lineMaterial.uniforms.uLineAlpha.value = current.lineAlpha;
      lineMaterial.uniforms.uLineDensity.value = current.lineDensity;
      lineMaterial.uniforms.uLineHover.value = current.lineHover;

      // Damped camera tilt (≤2.5°) towards the cursor.
      const tk = 1 - Math.exp(-dt * 4);
      tilt.x += ((mouse.inside ? mouse.x : 0) - tilt.x) * tk;
      tilt.y += ((mouse.inside ? mouse.y : 0) - tilt.y) * tk;
      camera.position.set(
        Math.sin(tilt.x * MAX_TILT) * CAMERA_Z,
        Math.sin(tilt.y * MAX_TILT) * CAMERA_Z,
        Math.cos(tilt.x * MAX_TILT) * CAMERA_Z,
      );
      camera.lookAt(0, 0, 0);

      sharedUniforms.uMouse.value.set(mouse.x * halfH * camera.aspect, mouse.y * halfH, 0);
      sharedUniforms.uCursorOn.value +=
        ((mouse.inside ? 1 : 0) - sharedUniforms.uCursorOn.value) * tk;

      // Typing waves: a darker tone than --primary on light, a lighter one on dark.
      sharedUniforms.uCw.value
        .copy(uniformColors[0].value)
        .offsetHSL(0, 0.05, isLight() ? -0.15 : 0.12);
      sharedUniforms.uWaveMaxR.value = halfH * camera.aspect * 2.2;
      const active = waves.active(performance.now());
      for (let i = 0; i < WAVE_MAX; i++) {
        const w = active[i];
        if (w) sharedUniforms.uWave.value[i].set(w.x, w.y, w.strength, w.progress);
        else sharedUniforms.uWave.value[i].set(0, 0, 0, -1);
      }

      renderer.render(scene, camera);
    };

    const sync = () => {
      const shouldRun = onScreen && !document.hidden;
      if (shouldRun && raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!shouldRun && raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const intersection = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
      sync();
    });
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    sync();

    return () => {
      pulseRef.current = null;
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      onScreen = false;
      themeObserver.disconnect();
      resizeObserver.disconnect();
      intersection.disconnect();
      offProgress();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      built.dispose();
    };
  }, [progress, onError, originRef]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
});

export default HeroScene;
