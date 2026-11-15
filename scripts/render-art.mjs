// Renderuje statyczne kadry smug (plakat hero i grafiki sekcji) tym samym shaderem,
// którego strona używa na żywo. Wynik: public/art/*.webp. Uruchomienie: `npm run art`.
// Opcja `--out <katalog>` zapisuje gdzie indziej (podglądy robocze poza repozytorium).
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { BG, FRAGMENT, PRESETS, VERTEX } from '../src/lib/streaks/shader.ts';

/** nazwa pliku → [zestaw parametrów, szerokość, wysokość, jednostka (px na 1.0), jakość webp] */
const JOBS = {
  'hero-1200': ['hero', 1200, 895, 895, 0.62],
  'hero-780': ['heroMobile', 780, 1120, 1120, 0.6],
  'card-wide': ['cardWide', 1200, 432, 895, 0.66],
  'card-tall': ['cardTall', 720, 900, 895, 0.66],
  'footer': ['footer', 1200, 420, 895, 0.62],
};

const argOut = process.argv.indexOf('--out');
const outDir = resolve(argOut > -1 ? process.argv[argOut + 1] : 'public/art');
const only = process.argv.indexOf('--only') > -1 ? process.argv[process.argv.indexOf('--only') + 1] : null;
const png = process.argv.includes('--png');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

for (const [name, [presetName, w, h, unit, quality]] of Object.entries(JOBS)) {
  if (only && only !== name) continue;
  const preset = PRESETS[presetName];
  const dataUrl = await page.evaluate(
    ({ VERTEX, FRAGMENT, BG, preset, w, h, unit, quality, png }) => {
      const canvas = document.getElementById('c');
      canvas.width = w;
      canvas.height = h;
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('WebGL niedostępny');
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = (n) => gl.getUniformLocation(prog, n);
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u('uRes'), w, h);
      gl.uniform1f(u('uUnit'), unit);
      gl.uniform1f(u('uTime'), preset.time);
      gl.uniform1f(u('uSeed'), preset.seed);
      gl.uniform1f(u('uAngle'), preset.angle);
      gl.uniform1f(u('uZoom'), preset.zoom);
      gl.uniform2f(u('uShift'), preset.shift[0], preset.shift[1]);
      gl.uniform3f(u('uDeep'), ...preset.deep);
      gl.uniform3f(u('uCore'), ...preset.core);
      gl.uniform3f(u('uHi'), ...preset.hi);
      gl.uniform3f(u('uFringe'), ...preset.fringe);
      gl.uniform3f(u('uBg'), ...BG);
      gl.uniform1f(u('uGrain'), preset.grain);
      gl.uniform1f(u('uVignette'), preset.vignette);
      gl.uniform1f(u('uGain'), preset.gain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/webp', quality);
    },
    { VERTEX, FRAGMENT, BG, preset, w, h, unit, quality, png },
  );
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const file = join(outDir, `${name}.${png ? 'png' : 'webp'}`);
  await writeFile(file, buf);
  console.log(`${file}  ${w}x${h}  ${(buf.length / 1024).toFixed(1)} kB`);
}
await browser.close();
