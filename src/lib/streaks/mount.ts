/**
 * Żywe tło hero: ten sam shader co statyczny plakat, więc przejście jest niewidoczne.
 * Ładowane po zdarzeniu `load`, w czasie bezczynności. Pętla stoi, gdy hero jest poza
 * kadrem albo karta jest w tle; przy `prefers-reduced-motion` w ogóle się nie uruchamia.
 */
import { BG, FRAGMENT, PRESETS, VERTEX, type StreakPreset } from './shader.ts';

export function mountStreaks(canvas: HTMLCanvasElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Bez akceleracji sprzętowej (SwiftShader, llvmpipe) shader liczy procesor i blokuje
  // stronę na sekundy — wtedy zostaje statyczny kadr. Przeglądarka odmawia kontekstu
  // sama (`failIfMajorPerformanceCaveat`), a nazwę renderera sprawdzamy na wszelki wypadek.
  // `__forceStreaks` służy wyłącznie do nagrań w środowisku bez GPU.
  const forced = (window as Window & { __forceStreaks?: boolean }).__forceStreaks === true;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !forced });
  if (!gl) return;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (!forced && /swiftshader|llvmpipe|software|basic render/i.test(renderer)) return;

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(prog, name);
  const loc = {
    res: u('uRes'),
    unit: u('uUnit'),
    time: u('uTime'),
    seed: u('uSeed'),
    angle: u('uAngle'),
    zoom: u('uZoom'),
    shift: u('uShift'),
    deep: u('uDeep'),
    core: u('uCore'),
    hi: u('uHi'),
    fringe: u('uFringe'),
    bg: u('uBg'),
    grain: u('uGrain'),
    vignette: u('uVignette'),
    gain: u('uGain'),
  };

  const mobile = window.matchMedia('(max-width: 720px)');
  let preset: StreakPreset = PRESETS.hero;

  const resize = (): void => {
    preset = mobile.matches ? PRESETS.heroMobile : PRESETS.hero;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.5 : 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(loc.res, w, h);
    gl.uniform1f(loc.unit, h);
    gl.uniform1f(loc.seed, preset.seed);
    gl.uniform1f(loc.angle, preset.angle);
    gl.uniform1f(loc.zoom, preset.zoom);
    gl.uniform2f(loc.shift, preset.shift[0], preset.shift[1]);
    gl.uniform3f(loc.deep, ...preset.deep);
    gl.uniform3f(loc.core, ...preset.core);
    gl.uniform3f(loc.hi, ...preset.hi);
    gl.uniform3f(loc.fringe, ...preset.fringe);
    gl.uniform3f(loc.bg, ...BG);
    gl.uniform1f(loc.grain, preset.grain);
    gl.uniform1f(loc.vignette, preset.vignette);
    gl.uniform1f(loc.gain, preset.gain);
  };

  let elapsed = 0;
  let last = 0;
  let raf = 0;
  let visible = true;
  let frame = 0;

  const draw = (): void => {
    gl.uniform1f(loc.time, preset.time + elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now: number): void => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? Math.min(now - last, 100) / 1000 : 0;
    last = now;
    elapsed += dt;
    frame += 1;
    // Na ekranach dotykowych co druga klatka wystarcza przy tak wolnym ruchu.
    if (!mobile.matches || frame % 2 === 0) draw();
    raf = requestAnimationFrame(loop);
  };
  const play = (): void => {
    if (raf === 0 && visible && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  };

  resize();
  draw();
  canvas.classList.add('is-live');
  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? false;
    play();
  }).observe(canvas);
  document.addEventListener('visibilitychange', play);
  canvas.addEventListener('webglcontextlost', () => {
    visible = false;
    canvas.classList.remove('is-live');
  });
}
