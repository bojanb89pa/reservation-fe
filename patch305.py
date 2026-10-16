import os
root = os.getcwd()
p = root + '/modules/ui/src/components/home/HeroScene/HeroScene.tsx'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


rep("import { useEffect, useRef } from 'react';", "import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';\nimport type { RefObject } from 'react';")
rep("  Vector3,\n", "  Vector3,\n  Vector4,\n")
rep("import { clamp01 } from './sceneLogic';", "import { clamp01 } from './sceneLogic';\nimport { WAVE_MAX, createWaveQueue } from './pulseQueue';\nimport type { HeroSceneHandle } from './pulseQueue';")
rep("  onError: () => void;\n}", "  onError: () => void;\n  /** Element (the search bar) the typing waves originate from. */\n  originRef?: RefObject<HTMLElement>;\n}")
rep("const CURSOR_RADIUS = 2.6;", "const CURSOR_RADIUS = 3.2;\nconst WAVE_BAND = 1.8; // world units, half-width of the ring")
rep("  lineDensity: number;\n}", "  lineDensity: number;\n  fog: number;\n  cursorGain: number;\n}")
rep("const DARK: ThemeParams = { size: 1, alpha: 0.9, lineAlpha: 0.32, lineDensity: 1 };\nconst LIGHT: ThemeParams = { size: 0.72, alpha: 0.85, lineAlpha: 0.3, lineDensity: 0.5 };",
    """const DARK: ThemeParams = {
  size: 1.1,
  alpha: 0.9,
  lineAlpha: 0.42,
  lineDensity: 1,
  fog: 0.8,
  cursorGain: 1,
};
const LIGHT: ThemeParams = {
  size: 0.95,
  alpha: 0.9,
  lineAlpha: 0.45,
  lineDensity: 0.8,
  fog: 0.45,
  cursorGain: 1.35,
};""")
rep("color.offsetHSL(0, 0.08, -0.08)", "color.offsetHSL(0, 0.1, -0.15)")
rep("  uniform float uCursorRadius;\n", "  uniform float uCursorRadius;\n  uniform float uCursorGain;\n  uniform float uFog;\n  uniform vec4 uWave[${WAVE_MAX}]; // xy source, z strength, w progress (<0 = inactive)\n  uniform float uWaveMaxR;\n")
rep("* uCursorOn;\n  }", "* uCursorOn * uCursorGain;\n  }")
rep("return 1.0 - 0.8 * smoothstep", "return 1.0 - uFog * smoothstep")
rep("  // Quiet, fading", """  // Light ring spreading from each typing wave source.
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

  // Quiet, fading""")
rep("  varying float vLight;\n\n  void main() {\n    vec3 p", "  varying float vLight;\n  varying float vWave;\n\n  void main() {\n    vec3 p")
rep("    float c = cursorInfluence(p);\n    gl_PointSize = aSize * uSize * uPixelRatio * (14.0 / depth) * (1.0 + 0.6 * c);",
    "    float c = cursorInfluence(p);\n    float w = waveInfluence(p);\n    gl_PointSize = aSize * uSize * uPixelRatio * (14.0 / depth) * (1.0 + 0.8 * c + 0.6 * w);")
rep("tail() * (0.7 + 0.5 * c);", "tail() * (0.75 + 0.7 * c + 1.0 * w);")
rep("    vLight = c;\n", "    vLight = c;\n    vWave = w;\n")
rep("  varying float vLight;\n\n  void main() {\n    float d", "  varying float vLight;\n  varying float vWave;\n\n  void main() {\n    float d")
rep("  uniform vec3 uC3;\n  varying float vAlpha;", "  uniform vec3 uC3;\n  uniform vec3 uCw;\n  varying float vAlpha;")
rep("    float glow = pow(1.0 - d, 1.6);", "    float glow = min(pow(1.0 - d, 1.3) + 0.35 * pow(1.0 - d, 4.0), 1.0);")
rep("    gl_FragColor = vec4(col, glow * vAlpha);", "    col = mix(col, uCw, clamp(vWave, 0.0, 1.0) * 0.7);\n    gl_FragColor = vec4(col, min(glow * vAlpha, 1.0));")
rep("  uniform float uLineDensity;\n  varying float vAlpha;", "  uniform float uLineDensity;\n  varying float vAlpha;\n  varying float vWave;")
rep("(1.0 - smoothstep(0.55, 0.8, uProgress) * 0.25)", "(1.0 - smoothstep(0.55, 0.8, uProgress) * 0.08)")
rep("    float hover = c * c;\n    vAlpha = uLineAlpha * depthFog(-mv.z) * tail() * max(shown, hover * 1.4);",
    """    float hover = c * c;
    float w = waveInfluence(p);
    float base = max(shown, hover * 1.8);
    float kindNet = aKind < 0.5 ? 1.0 : 0.0;
    vAlpha = uLineAlpha * depthFog(-mv.z) * tail() * (base * (1.0 + 0.8 * w) + 0.5 * w * kindNet);
    vWave = w;""")
rep("  uniform vec3 uC0;\n  varying float vAlpha;\n  void main() {\n    gl_FragColor = vec4(uC0, vAlpha);",
    "  uniform vec3 uC0;\n  uniform vec3 uCw;\n  varying float vAlpha;\n  varying float vWave;\n  void main() {\n    vec3 col = mix(uC0, uCw, clamp(vWave, 0.0, 1.0) * 0.7);\n    gl_FragColor = vec4(col, min(vAlpha, 1.0));")
rep("    uCursorRadius: { value: CURSOR_RADIUS },", """    uCursorRadius: { value: CURSOR_RADIUS },
    uCursorGain: { value: 1 },
    uFog: { value: 0.8 },
    uWave: { value: Array.from({ length: WAVE_MAX }, () => new Vector4(0, 0, 0, -1)) },
    uWaveMaxR: { value: 30 },
    uCw: { value: new Color() },""")
rep("export default function HeroScene({ progress, onError }: Props) {\n  const canvasRef = useRef<HTMLCanvasElement>(null);\n",
    """const HeroScene = forwardRef<HeroSceneHandle, Props>(function HeroScene(
  { progress, onError, originRef },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef<HeroSceneHandle['pulse'] | null>(null);

  useImperativeHandle(ref, () => ({ pulse: (options) => pulseRef.current?.(options) }), []);
""")
rep("""    let time = 0;
    const halfH = Math.tan((FOV * Math.PI) / 360) * CAMERA_Z;
""", """    let time = 0;
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
""")
rep("      pointMaterial.uniforms.uSize.value = current.size;", """      sharedUniforms.uFog.value = current.fog;
      sharedUniforms.uCursorGain.value = current.cursorGain;
      pointMaterial.uniforms.uSize.value = current.size;""")
rep("      renderer.render(scene, camera);\n    };", """      // Typing waves: a darker tone than --primary on light, a lighter one on dark.
      sharedUniforms.uCw.value
        .copy(uniformColors[0].value)
        .offsetHSL(0, 0.05, isLight() ? -0.1 : 0.12);
      sharedUniforms.uWaveMaxR.value = halfH * camera.aspect * 2.2;
      const active = waves.active(performance.now());
      for (let i = 0; i < WAVE_MAX; i++) {
        const w = active[i];
        if (w) sharedUniforms.uWave.value[i].set(w.x, w.y, w.strength, w.progress);
        else sharedUniforms.uWave.value[i].set(0, 0, 0, -1);
      }

      renderer.render(scene, camera);
    };""")
rep("    return () => {\n      if (raf !== 0)", "    return () => {\n      pulseRef.current = null;\n      if (raf !== 0)")
rep("  }, [progress, onError]);\n\n  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden=\"true\" />;\n}",
    "  }, [progress, onError, originRef]);\n\n  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden=\"true\" />;\n});\n\nexport default HeroScene;")
open(p, 'w').write(s)

p = root + '/modules/ui/src/pages/HomePage.tsx'
s = open(p).read()
rep("} from '../components/home/HeroScene/sceneLogic';\n", "} from '../components/home/HeroScene/sceneLogic';\nimport { pulseStrengthForChange } from '../components/home/HeroScene/pulseQueue';\nimport type { HeroSceneHandle } from '../components/home/HeroScene/pulseQueue';\n")
rep("  const searchShellRef = useRef<HTMLDivElement>(null);\n", """  const searchShellRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HeroSceneHandle>(null);
  const prevWhatRef = useRef(what);

  // Every change of the search value (typing, deleting, pasting, suggestion pick) sends a light wave.
  // Imperative — no scene state; a no-op while the scene is not mounted.
  useEffect(() => {
    const strength = pulseStrengthForChange(prevWhatRef.current, what);
    prevWhatRef.current = what;
    if (strength !== null) sceneRef.current?.pulse({ strength });
  }, [what]);
""")
rep("<HeroScene progress={heroProgress} onError={handleSceneError} />", """<HeroScene
                  ref={sceneRef}
                  progress={heroProgress}
                  onError={handleSceneError}
                  originRef={searchShellRef}
                />""")
open(p, 'w').write(s)
