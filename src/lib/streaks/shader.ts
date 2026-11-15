/**
 * Rodzina grafik Skibi Labs: ukośne smugi światła z ziarnem.
 *
 * Jedno źródło prawdy dla wyglądu — ten sam shader rysuje żywe tło hero (WebGL)
 * i statyczne kadry sekcji (scripts/render-art.mjs zapisuje je do public/art/).
 * Plik zawiera wyłącznie dane (GLSL i zestawy parametrów), bez dostępu do DOM.
 */

export const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uUnit;
uniform float uTime;
uniform float uSeed;
uniform float uAngle;
uniform float uZoom;
uniform vec2 uShift;
uniform vec3 uDeep;
uniform vec3 uCore;
uniform vec3 uHi;
uniform vec3 uFringe;
uniform vec3 uBg;
uniform float uGrain;
uniform float uVignette;
uniform float uGain;

float h11(float n) { return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453); }
float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

const int N = 15;

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / uUnit;
  uv = uv / uZoom - uShift;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  float u = uv.x * ca + uv.y * sa;
  float v = -uv.x * sa + uv.y * ca;
  float n = h21(frag);
  float n2 = h21(frag + 71.3);

  vec3 col = vec3(0.0);
  float cover = 0.0;
  float haze = 0.0;
  float grainy = 0.0;
  float pitch = 0.118;

  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float k = fi - float(N - 1) * 0.5;
    float ak = abs(k);
    float r1 = h11(fi + 1.0);
    float r2 = h11(fi + 17.0);
    float r3 = h11(fi + 41.0);
    // Środkowe pasy są szerokie i długie, skrajne przechodzą w cienkie linie.
    float wide = 1.0 - smoothstep(2.8, 3.7, ak);
    float c = k * pitch + (r1 - 0.5) * 0.012 * (1.0 - wide);
    float w = pitch * mix(0.03 + 0.04 * r1, 0.92, wide);
    float L = mix(0.3 + 0.25 * r2, mix(0.3, 0.44, 1.0 - ak / 3.0) * (0.86 + 0.28 * r2), wide);
    float m = (r3 - 0.5) * mix(0.5, 0.2, wide) - k * 0.018
      + 0.06 * sin(uTime * (0.21 + 0.13 * r1) + r2 * 6.2831)
      + 0.025 * sin(uTime * 0.37 + fi * 1.7);
    float d = (u - m) / L;
    // Ostrość: środek pasa jest ostry, oba końce rozmywają się (jeden mocniej).
    float side = d < 0.0 ? 1.0 : 0.62;
    float soft = smoothstep(0.5, 1.12, abs(d)) * side;
    float blur = mix(0.0016, 0.004, 1.0 - wide) * 0.6 + 0.075 * soft * soft * mix(0.35, 1.0, wide);
    float x = v - c + (n - 0.5) * blur * 0.55;
    float edgeA = smoothstep(-w * 0.5 - blur, -w * 0.5 + blur, x);
    float edgeB = 1.0 - smoothstep(w * 0.5 - blur * 0.5, w * 0.5 + blur * 0.5, x);
    float env = 1.0 - smoothstep(0.74, 1.24, abs(d) + (n2 - 0.5) * 0.08 * soft);
    float I = edgeA * edgeB * env;
    float g = clamp((x + w * 0.5) / max(w, 0.0001), 0.0, 1.0);
    // Cieniowanie w poprzek: ciemniej przy sąsiednim pasie, jaśniej przy ostrej krawędzi.
    vec3 bc = mix(uDeep, uCore, smoothstep(0.0, 0.42, g));
    // …i wzdłuż: pas jaśnieje ku końcowi, który zostaje ostrzejszy.
    float along = smoothstep(-0.9, 0.9, d);
    bc = mix(bc, uHi, (smoothstep(0.35, 1.0, g) * 0.3 + along * 0.3) * wide);
    bc = mix(bc * 0.7, bc, wide);
    bc *= mix(1.0, 0.8, soft);
    col = mix(col, bc, I);
    cover = max(cover, I);
    float hz = env * (1.0 - smoothstep(0.0, w * 0.5 + 0.03 + 0.2 * soft, abs(x))) * wide;
    haze = max(haze, hz * soft);
    grainy = max(grainy, soft * env);
  }

  col += uFringe * haze * (1.0 - cover) * (0.8 + 0.4 * n);
  col *= uGain;
  col *= 1.0 + (n - 0.5) * uGrain * mix(0.08, 1.0, grainy * grainy);
  col += (n2 - 0.5) * uGrain * 0.04 * haze;

  vec2 q = frag / uRes;
  float vig = smoothstep(0.0, uVignette, q.x) * smoothstep(0.0, uVignette, 1.0 - q.x)
    * smoothstep(0.0, uVignette, q.y) * smoothstep(0.0, uVignette * 0.6, 1.0 - q.y);
  gl_FragColor = vec4(uBg + max(col, 0.0) * vig, 1.0);
}
`;

export type Rgb = readonly [number, number, number];

export interface StreakPreset {
  /** Kąt smug w radianach (0 = poziomo). */
  angle: number;
  /** Skala kompozycji; 1 = pełny kadr hero. */
  zoom: number;
  /** Przesunięcie środka kompozycji w jednostkach wysokości kadru. */
  shift: readonly [number, number];
  seed: number;
  /** Chwila, w której kadr jest zatrzymany (plakat, kadry statyczne). */
  time: number;
  grain: number;
  vignette: number;
  gain: number;
  deep: Rgb;
  core: Rgb;
  hi: Rgb;
  fringe: Rgb;
}

const hex = (h: string): Rgb => {
  const v = Number.parseInt(h.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** Tło strony — musi zgadzać się z tokenem --bg. */
export const BG: Rgb = hex('#07080a');

const palette = {
  deep: hex('#1b0e8a'),
  core: hex('#2947ff'),
  hi: hex('#4f96ff'),
  fringe: hex('#34106a'),
} as const;

export const PRESETS = {
  hero: { angle: -0.86, zoom: 0.76, shift: [0, 0.03], seed: 3.1, time: 14, grain: 0.13, vignette: 0.14, gain: 1, ...palette },
  heroMobile: { angle: -0.88, zoom: 0.7, shift: [0, 0.07], seed: 3.1, time: 14, grain: 0.13, vignette: 0.1, gain: 1, ...palette },
  cardWide: { angle: -0.84, zoom: 2.3, shift: [-0.04, 0.02], seed: 8.4, time: 3, grain: 0.1, vignette: 0.02, gain: 0.8, ...palette },
  cardTall: { angle: -0.84, zoom: 2.6, shift: [0.05, -0.05], seed: 12.7, time: 9, grain: 0.14, vignette: 0.02, gain: 0.95, ...palette },
  footer: { angle: -0.84, zoom: 1.5, shift: [0, -0.16], seed: 5.2, time: 6, grain: 0.14, vignette: 0.1, gain: 0.85, ...palette },
} as const satisfies Record<string, StreakPreset>;

export type PresetName = keyof typeof PRESETS;
