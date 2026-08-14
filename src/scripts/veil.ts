/**
 * The desktop page background — volumetric rays drifting across a
 * full-viewport canvas. Mobile never downloads this module and uses the static
 * gradient in `global.css` instead.
 *
 * The shader came from a React component that drove it through `ogl`. Neither
 * React nor `ogl` are dependencies here and neither is worth becoming one for
 * one fullscreen triangle, so the bootstrap is written against raw WebGL2 and
 * the GLSL is carried over unchanged.
 *
 * "Unchanged" means the maths, not the file. The original was an uber-shader
 * with ~40 uniforms and a preset that switched almost all of them off: no
 * dither, no LED, no pixelation, no glitch, no RGB split, no pixel sort, no
 * posterise, no edge glow, no duotone, no scanlines, no UV animation, and no
 * source texture. What survives below is every line that preset actually
 * reached, character for character. The rest was dead code that still cost
 * 14KB to ship and a compile to skip.
 *
 * This is the site's second runtime file, and the only reason it isn't folded
 * into `motion.ts` is lifecycle: a GL context has to size itself, stand down
 * when the tab hides, and survive being lost, none of which is the kind of
 * small DOM job that file is for. It is also not deferred behind it — the
 * background is the first thing on screen.
 */

/* -- The shader ------------------------------------------------------------ */

/**
 * No attributes, no buffers, no VAO. Three vertices with no data still get a
 * `gl_VertexID`, which is enough to derive (0,0), (2,0), (0,2) and map it onto
 * a triangle large enough to cover the clip volume. One triangle rather than
 * two: a quad's diagonal makes the GPU shade the seam twice.
 */
const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uGlow;
uniform float uGrain;
uniform float uVignette;

out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

// Soft volumetric rays radiating from a light source that drifts off-canvas,
// below and to the left. Sampled five times per pixel (once flat, four times
// for the bloom), and each call runs fbm twice — this is the whole cost of the
// effect, and the reason the device pixel ratio is capped by the caller.
vec3 rays(vec2 uv) {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.12;

  vec2 origin = vec2(-0.22 + sin(t * 0.45) * 0.12, -0.82);
  vec2 ray = p - origin;
  float angle = atan(ray.y, ray.x);
  float radius = length(ray);
  float turbulence = fbm(vec2(angle * 2.2, radius * 0.75 - t * 0.25));
  float beams = pow(max(0.0, sin(angle * 13.0 + turbulence * 4.2 + t * 0.5)), 10.0);
  float cone = smoothstep(1.7, 0.12, radius) * smoothstep(-0.2, 0.55, ray.y);
  float ambient = fbm(p * 1.4 + vec2(0.0, -t * 0.08)) * 0.28;

  vec3 color = mix(uColorA, uColorB, ambient + beams * cone * 0.55);
  color = mix(color, uColorC, beams * cone * 0.88);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec3 color = rays(uv);

  color *= uBrightness;
  color = (color - 0.5) * uContrast + 0.5;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);

  if (uGlow > 0.001) {
    vec2 texel = 2.5 / uResolution;
    vec3 bloom = rays(uv + vec2(texel.x, 0.0));
    bloom += rays(uv - vec2(texel.x, 0.0));
    bloom += rays(uv + vec2(0.0, texel.y));
    bloom += rays(uv - vec2(0.0, texel.y));
    color = mix(color, bloom * 0.25 + color * 0.2, uGlow * 0.55);
  }

  if (uGrain > 0.001) {
    float grain = hash21(gl_FragCoord.xy + floor(uTime * 24.0)) - 0.5;
    color += grain * uGrain * 0.22;
  }

  if (uVignette > 0.001) {
    float edge = smoothstep(
      0.82,
      0.18,
      length((uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0))
    );
    color *= mix(1.0, edge, uVignette * 0.72);
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

/* -- Tuning ---------------------------------------------------------------- */

/**
 * The preset the shader was authored against. Two numbers differ from it, both
 * for the same reason — text has to stay legible over a moving image:
 *
 *   brightness  1.00 → 0.85   caps how bright a beam can peak. Together with
 *                             the scrim in `global.css` this is what holds the
 *                             contrast floor; see design.md §7.
 *   dpr cap     2.00 → 1.50   five fbm-heavy samples per pixel across a full
 *                             viewport is the cost driver, and it scales with
 *                             the square of this number.
 *
 * `colorA` is also `--color-bg`, so the static fallback and the first rendered
 * frame start from the same value.
 */
const VEIL = {
  colors: ['#120906', '#c9471e', '#ffe0a8'],
  brightness: 0.85,
  contrast: 1.04,
  saturation: 1.08,
  glow: 0.68,
  grain: 0.18,
  vignette: 0.34,
  maxDpr: 1.5,
} as const;

/* -- Bootstrap ------------------------------------------------------------- */

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initVeil(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-veil]');
  if (!canvas) return;

  const desktopBackground = window.matchMedia('(min-width: 62rem)');
  if (!desktopBackground.matches) return;

  // Every failure below leaves the canvas blank, which is survivable: the
  // static gradient painted on `body` is what the page is actually laid out
  // against, and the veil only ever adds to it.
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return;

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uResolution = uniform('uResolution');
  const uTime = uniform('uTime');

  // Everything but time and resolution is set once and never touched again.
  gl.uniform3fv(uniform('uColorA'), hexToRgb(VEIL.colors[0]));
  gl.uniform3fv(uniform('uColorB'), hexToRgb(VEIL.colors[1]));
  gl.uniform3fv(uniform('uColorC'), hexToRgb(VEIL.colors[2]));
  gl.uniform1f(uniform('uBrightness'), VEIL.brightness);
  gl.uniform1f(uniform('uContrast'), VEIL.contrast);
  gl.uniform1f(uniform('uSaturation'), VEIL.saturation);
  gl.uniform1f(uniform('uGlow'), VEIL.glow);
  gl.uniform1f(uniform('uGrain'), VEIL.grain);
  gl.uniform1f(uniform('uVignette'), VEIL.vignette);

  const draw = (seconds: number) => {
    gl.uniform1f(uTime, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, VEIL.maxDpr);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uResolution, width, height);
  };

  /* -- The loop ------------------------------------------------------------ */

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let frame = 0;
  let elapsed = 0;
  let previous = 0;

  const render = (now: number) => {
    if (!previous) previous = now;
    // Clamped, so a tab that was throttled or a frame that took a long time
    // resumes where it left off instead of jumping the animation forward.
    elapsed += Math.min(40, now - previous);
    previous = now;
    draw(elapsed / 1000);
    frame = requestAnimationFrame(render);
  };

  const start = () => {
    if (
      frame !== 0 ||
      reducedMotion.matches ||
      !desktopBackground.matches ||
      document.hidden
    ) {
      return;
    }
    previous = 0;
    frame = requestAnimationFrame(render);
  };

  const stop = () => {
    if (frame === 0) return;
    cancelAnimationFrame(frame);
    frame = 0;
  };

  // Reduced motion gets the image, not the movement: one frame, then nothing.
  // The original component had no notion of the query at all.
  const applyRenderingPreference = () => {
    if (!desktopBackground.matches) {
      stop();
    } else if (reducedMotion.matches) {
      stop();
      draw(elapsed / 1000);
    } else {
      start();
    }
  };

  /* -- Wiring -------------------------------------------------------------- */

  // One controller for every listener and the observer, so tearing the whole
  // thing down on context loss is a single call and cannot leak a handler that
  // still points at a dead context.
  const teardown = new AbortController();
  const { signal } = teardown;

  const observer = new ResizeObserver(() => {
    resize();
    // A resize while the loop is stopped (reduced motion, hidden tab) would
    // otherwise leave the previous frame stretched until something restarts it.
    if (frame === 0) draw(elapsed / 1000);
  });
  observer.observe(canvas);
  signal.addEventListener('abort', () => observer.disconnect());
  resize();

  reducedMotion.addEventListener('change', applyRenderingPreference, { signal });
  desktopBackground.addEventListener('change', applyRenderingPreference, { signal });

  // A background tab keeps rendering unless someone stops it, and five
  // fbm-heavy samples per pixel is enough to be felt on a laptop battery.
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
      else applyRenderingPreference();
    },
    { signal },
  );

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      // Without preventDefault the context can never be restored. Stopping the
      // loop is not for safety — GL calls on a lost context are silently
      // ignored, not thrown — it is to stop burning frames on a no-op.
      event.preventDefault();
      stop();
    },
    { signal },
  );

  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      // Every GL object above died with the old context, so the cheapest
      // correct move is to drop this whole closure and build a new one.
      teardown.abort();
      initVeil();
    },
    { signal },
  );

  applyRenderingPreference();
}

initVeil();

export {};
