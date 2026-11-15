// Audyt zbudowanej strony w headless Chromium (Playwright + axe-core).
// Uruchomienie: `npm run build && npm run audit`. Kończy się kodem 1, jeśli cokolwiek nie przejdzie.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const PAGES = ['/', '/agenci/', '/automatyzacja/', '/bezpieczenstwo/', '/konsola/', '/jak-pracujemy/', '/kontakt/', '/polityka-prywatnosci/', '/nie-ma-takiej-strony/'];
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, touch: false },
  { name: '834', width: 834, height: 1112, touch: true },
  { name: '390', width: 390, height: 844, touch: true },
];
/** Dozwolone stopnie (px) i grubości pisma — muszą odpowiadać src/styles/tokens.css. */
const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20, 24, 32, 36, 56, 64];
const FONT_WEIGHTS = [400, 500, 600];
const FONT_FAMILIES = ['Inter', 'Geist Mono'];
const TAP = 40;
/** Budżet wagi pierwszego załadowania (bajty nieskompresowane). */
const BUDGET = { home: 300_000, page: 220_000, js: 70_000, fonts: 60_000, html: 150_000 };
/** Warstwy czysto ozdobne: animowane tła i grafiki bez treści. Wyłączone z pomiaru axe. */
const DECORATIVE = ['.hero-art', '.stage-art', '.footer-art', '.bento-art-wide', '.cta-keys', '.page-hero::before'];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = join(DIST, p);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(DIST, '404.html');
    res.statusCode = 404;
  }
  res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const failures = [];
let checks = 0;
const fail = (where, what) => failures.push(`${where}: ${what}`);
const check = (cond, where, what) => {
  checks += 1;
  if (!cond) fail(where, what);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** Przewija do faktycznego końca strony (wysokość może rosnąć w trakcie) i wraca na górę. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7);
    for (let guard = 0; guard < 400; guard++) {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (scrollY >= max - 1) break;
      scrollTo(0, Math.min(scrollY + step, max));
      await new Promise((r) => setTimeout(r, 60));
    }
    await new Promise((r) => setTimeout(r, 250));
  });
  const atEnd = await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 1);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(150);
  return atEnd;
}

async function auditPage(path, vp) {
  const where = `${path} @${vp.name}`;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.touch, hasTouch: vp.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  const bad = [];
  const sizes = { total: 0, js: 0, fonts: 0, html: 0 };
  page.on('console', (m) => {
    // Odpowiedź 404 samej strony błędu jest oczekiwana.
    if (m.type() === 'error' && !(path === '/nie-ma-takiej-strony/' && /404/.test(m.text()))) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  });
  page.on('response', async (r) => {
    const u = r.url();
    if (!u.startsWith(ORIGIN)) return;
    if (r.status() >= 400 && !(path === '/nie-ma-takiej-strony/' && u.endsWith(path))) bad.push(`${r.status()} ${u}`);
    try {
      const len = (await r.body()).length;
      sizes.total += len;
      if (u.endsWith('.js')) sizes.js += len;
      if (u.endsWith('.woff2')) sizes.fonts += len;
      if (r.request().resourceType() === 'document') sizes.html += len;
    } catch {
      /* przekierowania i odpowiedzi bez treści */
    }
  });
  const resp = await page.goto(ORIGIN + path, { waitUntil: 'load' });
  check(path === '/nie-ma-takiej-strony/' ? resp?.status() === 404 : resp?.status() === 200, where, `kod odpowiedzi ${resp?.status()}`);
  await page.waitForTimeout(400);
  const initial = { ...sizes };
  const atEnd = await scrollThrough(page);
  check(atEnd, where, 'audyt nie doszedł do końca strony');
  await page.waitForTimeout(900);

  check(errors.length === 0, where, `błędy konsoli: ${errors.join(' | ')}`);
  check(external.length === 0, where, `zasoby zewnętrzne: ${external.join(', ')}`);
  check(bad.length === 0, where, `nieudane żądania: ${bad.join(', ')}`);

  const dom = await page.evaluate(
    ({ FONT_SIZES, FONT_WEIGHTS, FONT_FAMILIES, TAP, touch }) => {
      const out = { overflow: null, h1: 0, headingSkips: [], fonts: [], taps: [], hidden: [], links: [], ids: [], storage: 0 };
      const doc = document.documentElement;
      if (doc.scrollWidth > innerWidth) out.overflow = `${doc.scrollWidth} > ${innerWidth}`;
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      };
      const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} „${(el.textContent ?? '').trim().slice(0, 30)}”`;
      // Elementy wystające poza ekran w poziomie (poza przewijanymi wierszami i maskowanymi grafikami).
      // Nagłówki
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
      out.h1 = hs.filter((h) => h.tagName === 'H1').length;
      let prev = 0;
      for (const h of hs) {
        const lvl = Number(h.tagName[1]);
        if (prev && lvl > prev + 1) out.headingSkips.push(`${label(h)} po h${prev}`);
        prev = lvl;
      }
      // Pismo
      const seen = new Set();
      for (const el of document.querySelectorAll('body *')) {
        if (!visible(el) || el.closest('svg')) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)) continue;
        const s = getComputedStyle(el);
        const size = Math.round(parseFloat(s.fontSize) * 100) / 100;
        const weight = Number(s.fontWeight);
        const family = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        const key = `${size}/${weight}/${family}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!FONT_SIZES.includes(size) || !FONT_WEIGHTS.includes(weight) || !FONT_FAMILIES.includes(family)) out.fonts.push(`${key} (${label(el)})`);
      }
      // Cele dotyku
      if (touch) {
        for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role="option"], label.choice, label.proof-pick')) {
          if (!visible(el) || el.disabled) continue;
          const s = getComputedStyle(el);
          if (el.tagName === 'A' && s.display === 'inline') continue; // odnośnik w zdaniu
          if (el.classList.contains('sr-only') || s.opacity === '0') continue; // sterowanie ukryte, klikalna jest etykieta
          const r = el.getBoundingClientRect();
          // Odnośnik rozciągnięty na całą kartę: liczy się obszar pseudo-elementu.
          const stretched = el.matches('.pillar-name a') ? el.closest('.pillar').getBoundingClientRect() : r;
          if (stretched.height < TAP - 0.5 || stretched.width < TAP - 0.5) out.taps.push(`${Math.round(stretched.width)}×${Math.round(stretched.height)} ${label(el)}`);
        }
      }
      // Elementy odsłaniane przy przewijaniu, które zostały niewidoczne
      for (const el of document.querySelectorAll('[data-reveal]')) {
        if (Number(getComputedStyle(el).opacity) < 0.99) out.hidden.push(label(el));
      }
      out.links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      out.ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
      out.storage = localStorage.length + sessionStorage.length;
      return out;
    },
    { FONT_SIZES, FONT_WEIGHTS, FONT_FAMILIES, TAP, touch: vp.touch },
  );
  check(dom.overflow === null, where, `poziome przewijanie: ${dom.overflow}`);
  check(dom.h1 === 1, where, `liczba nagłówków h1: ${dom.h1}`);
  check(dom.headingSkips.length === 0, where, `przeskok w strukturze nagłówków: ${dom.headingSkips.join('; ')}`);
  check(dom.fonts.length === 0, where, `pismo spoza tokenów: ${dom.fonts.join('; ')}`);
  check(dom.taps.length === 0, where, `cele dotyku < ${TAP}px: ${dom.taps.join('; ')}`);
  check(dom.hidden.length === 0, where, `nieodsłonięte elementy: ${dom.hidden.join('; ')}`);
  check(dom.storage === 0, where, 'zapis w localStorage albo sessionStorage');
  check((await ctx.cookies()).length === 0, where, 'strona ustawiła cookies');
  check(new Set(dom.ids).size === dom.ids.length, where, 'powtórzone identyfikatory');

  // Martwe odnośniki (wewnętrzne) i kotwice
  for (const href of new Set(dom.links)) {
    if (!href || /^(mailto:|tel:)/.test(href)) continue;
    if (/^https?:/.test(href)) {
      fail(where, `odnośnik zewnętrzny: ${href}`);
      continue;
    }
    const [p, hash] = href.split('#');
    const target = p === '' ? path : p;
    const file = join(DIST, target.endsWith('/') ? `${target}index.html` : target);
    checks += 1;
    if (!existsSync(file)) {
      if (!(path === '/nie-ma-takiej-strony/' && p === '')) fail(where, `martwy odnośnik: ${href}`);
      continue;
    }
    if (hash && !new RegExp(`id="${hash}"`).test(readFileSync(file, 'utf8'))) fail(where, `brak kotwicy: ${href}`);
  }

  // axe: WCAG 2.1 AA, bez warstw czysto ozdobnych
  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async (exclude) => {
    const ctxSpec = { exclude: exclude.filter((s) => !s.includes('::')).map((s) => [s]) };
    const r = await window.axe.run(ctxSpec, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }, DECORATIVE);
  check(axe.length === 0, where, `axe: ${axe.join(' ;; ')}`);

  // Budżet wagi pierwszego załadowania
  const budget = path === '/' ? BUDGET.home : BUDGET.page;
  check(initial.total <= budget, where, `waga ${initial.total} B > budżet ${budget} B`);
  check(sizes.js <= BUDGET.js, where, `JS ${sizes.js} B > ${BUDGET.js} B`);
  check(sizes.fonts <= BUDGET.fonts, where, `kroje ${sizes.fonts} B > ${BUDGET.fonts} B`);
  check(initial.html <= BUDGET.html, where, `HTML ${initial.html} B > ${BUDGET.html} B`);
  await ctx.close();
  return { where, weight: initial.total, js: sizes.js };
}

/* ——— Konsola demo ——— */

const waitView = (page, view) => page.waitForFunction((v) => document.querySelector('[data-console]')?.dataset.view === v, view, { timeout: 5000 });
const waitDone = (page) => page.waitForFunction(() => /Uruchom ponownie/.test(document.querySelector('[data-console] [data-slot="foot"]')?.textContent ?? ''), null, { timeout: 20000 });
const DONE_TEXT = { deploy: 'Pierwsze zadanie wykonane', flow: '1 ponowienie', redteam: '5 z 7' };

async function demoKeyboard(path) {
  const where = `${path} konsola: klawiatura`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(ORIGIN + path, { waitUntil: 'load' });
  // Skrót otwierający: przewija do okna i ustawia fokus w polu palety.
  await page.keyboard.press('/');
  await page.waitForFunction(() => document.activeElement?.classList.contains('cs-input'), null, { timeout: 8000 }).catch(() => {});
  check(await page.evaluate(() => document.activeElement?.classList.contains('cs-input')), where, 'skrót „/” nie ustawił fokusu w palecie');
  const inView = () => page.evaluate(() => { const r = document.querySelector('[data-console]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  const queries = { deploy: 'wdr', flow: 'przepl', redteam: 'test red' };
  for (const [id, q] of Object.entries(queries)) {
    // Piszemy od razu, jeszcze w trakcie płynnego przewijania do okna.
    await page.keyboard.type(q, { delay: 20 });
    check(await inView(), where, `${id}: okno nie jest w całości na ekranie podczas pisania`);
    check((await page.locator('[data-console] .cs-item').count()) === 1, where, `filtr „${q}” nie zawęził listy do jednego polecenia`);
    await page.keyboard.press('Enter');
    await waitView(page, id).catch(() => {});
    check((await page.locator('[data-console]').getAttribute('data-view')) === id, where, `Enter nie otworzył widoku ${id}`);
    await waitDone(page).catch(() => {});
    const foot = (await page.locator('[data-console] [data-slot="foot"]').textContent()) ?? '';
    check(foot.replace(/ /g, ' ').includes(DONE_TEXT[id]), where, `${id}: brak wyniku w stopce („${foot.trim().slice(0, 60)}”)`);
    // Strzałki zmieniają wiersz wyniku.
    const before = await page.locator('[data-console] .is-focus').first().textContent({ timeout: 3000 });
    await page.keyboard.press('ArrowUp');
    const after = await page.locator('[data-console] .is-focus').first().textContent({ timeout: 3000 });
    check(before !== after, where, `${id}: strzałka nie zmieniła wiersza wyniku`);
    // Enter uruchamia ponownie, drugi Enter pokazuje wynik od razu.
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /Pokaż wynik/.test(document.querySelector('[data-console] [data-slot="foot"]').textContent), null, { timeout: 3000 }).catch(() => {});
    await page.keyboard.press('Enter');
    await waitDone(page).catch(() => {});
    await page.keyboard.press('Escape');
    await waitView(page, 'palette').catch(() => {});
    check((await page.locator('[data-console]').getAttribute('data-view')) === 'palette', where, `${id}: Esc nie wrócił do palety`);
    check(await page.evaluate(() => document.activeElement?.classList.contains('cs-input')), where, `${id}: po powrocie fokus nie jest w polu palety`);
  }
  // Strzałki w palecie i polecenie-odnośnik.
  await page.keyboard.press('ArrowDown');
  check((await page.locator('[data-console] .cs-item.is-sel').getAttribute('data-index')) === '1', where, 'strzałka w dół nie przesunęła zaznaczenia');
  await page.keyboard.type('kontakt');
  await Promise.all([page.waitForURL('**/kontakt/', { timeout: 5000 }).catch(() => {}), page.keyboard.press('Enter')]);
  check(page.url().endsWith('/kontakt/'), where, 'polecenie „Napisz do nas” nie otworzyło strony kontaktu');
  check(errors.length === 0, where, `błędy: ${errors.join(' | ')}`);
  await ctx.close();
}

async function demoTouch(path) {
  const where = `${path} konsola: dotyk`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(ORIGIN + path, { waitUntil: 'load' });
  await page.locator('[data-console]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-console]')?.dataset.ready === 'true', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900); // koniec animacji wejścia sekcji
  const ids = ['deploy', 'flow', 'redteam'];
  for (const [i, id] of ids.entries()) {
    // Raz przez listę palety, raz przez przełącznik pod oknem.
    if (i % 2 === 0) await page.locator('[data-console] .cs-item').nth(i).tap();
    else await page.locator(`[data-dock="${id}"]`).tap();
    await waitView(page, id).catch(() => {});
    check((await page.locator('[data-console]').getAttribute('data-view')) === id, where, `dotknięcie nie otworzyło widoku ${id}`);
    await waitDone(page).catch(() => {});
    const foot = ((await page.locator('[data-console] [data-slot="foot"]').textContent()) ?? '').replace(/ /g, ' ');
    check(foot.includes(DONE_TEXT[id]), where, `${id}: brak wyniku w stopce`);
    const rows = page.locator('[data-console] [data-act="focus"]');
    await rows.nth(0).tap();
    check(await rows.nth(0).evaluate((el) => el.classList.contains('is-focus')), where, `${id}: dotknięcie wiersza nie pokazało szczegółów`);
    check(await page.evaluate(() => !document.activeElement?.classList.contains('cs-input')), where, `${id}: dotyk otworzył klawiaturę ekranową`);
    await page.locator('[data-console] [data-act="back"]').last().tap();
    await waitView(page, 'palette').catch(() => {});
    check((await page.locator('[data-console]').getAttribute('data-view')) === 'palette', where, `${id}: przycisk „Paleta” nie wrócił do palety`);
  }
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), where, 'poziome przewijanie po użyciu konsoli');
  check(errors.length === 0, where, `błędy: ${errors.join(' | ')}`);
  await ctx.close();
}

/* ——— Formularz, menu, wersja bez ruchu, praca bez JS ——— */

async function form() {
  const where = '/kontakt/ formularz';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/kontakt/`, { waitUntil: 'load' });
  await page.locator('[data-contact] button[type="submit"]').click();
  check((await page.locator('[data-contact] .error:visible').count()) === 3, where, 'pusty formularz nie pokazał trzech błędów');
  check(await page.evaluate(() => document.activeElement?.id === 'f-name'), where, 'fokus nie trafił do pierwszego błędnego pola');
  check((await page.locator('#f-name').getAttribute('aria-invalid')) === 'true', where, 'brak aria-invalid na błędnym polu');
  await page.fill('#f-name', 'Jan Kowalski');
  await page.fill('#f-email', 'jan@example.com');
  await page.fill('#f-company', 'ACME');
  await page.locator('.choice', { hasText: 'Automatyzacja' }).click();
  await page.fill('#f-message', 'Chcemy przenieść trzy scenariusze na własny serwer.');
  await page.locator('[data-contact] button[type="submit"]').click();
  await page.waitForTimeout(300);
  check((await page.locator('[data-contact] .error:visible').count()) === 0, where, 'poprawny formularz pokazuje błędy');
  const copy = await page.locator('[data-copy-text]').inputValue();
  check(copy.includes('Zapytanie: Automatyzacja') && copy.includes('jan@example.com') && copy.includes('trzy scenariusze'), where, 'przygotowana wiadomość nie zawiera danych z formularza');
  check(((await page.locator('[data-status]').textContent()) ?? '').length > 0, where, 'brak komunikatu po przygotowaniu wiadomości');
  check((await ctx.cookies()).length === 0, where, 'formularz ustawił cookies');
  await ctx.close();
}

async function menu() {
  const where = 'menu @390';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  const toggle = page.locator('[data-nav-toggle]');
  check((await toggle.getAttribute('aria-expanded')) === 'false', where, 'menu nie jest zamknięte na starcie');
  await toggle.tap();
  check((await toggle.getAttribute('aria-expanded')) === 'true', where, 'przycisk nie otworzył menu');
  check((await page.locator('[data-nav-menu] a:visible').count()) === 6, where, 'w menu nie ma pięciu odnośników i przycisku kontaktu');
  await page.keyboard.press('Escape');
  check((await toggle.getAttribute('aria-expanded')) === 'false', where, 'Esc nie zamknął menu');
  await toggle.tap();
  await Promise.all([page.waitForURL('**/jak-pracujemy/', { timeout: 5000 }).catch(() => {}), page.locator('[data-nav-menu] a', { hasText: 'Jak pracujemy' }).tap()]);
  check(page.url().endsWith('/jak-pracujemy/'), where, 'odnośnik w menu nie działa');
  await ctx.close();
}

async function reducedMotion() {
  const where = 'wersja bez ruchu';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => !document.querySelector('.hero-canvas').classList.contains('is-live')), where, 'animowane tło uruchomiło się mimo prefers-reduced-motion');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.hero-art')).backgroundImage.includes('hero-1200')), where, 'brak statycznego kadru hero');
  check(await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].every((el) => Number(getComputedStyle(el).opacity) === 1)), where, 'treść czeka na animację wejścia');
  await page.locator('[data-console]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-console]')?.dataset.ready === 'true', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check((await page.locator('[data-console]').getAttribute('data-view')) === 'palette', where, 'autoodtwarzanie konsoli działa mimo prefers-reduced-motion');
  await page.locator('[data-dock="flow"]').click();
  await page.waitForTimeout(150);
  check(/Uruchom ponownie/.test((await page.locator('[data-console] [data-slot="foot"]').textContent()) ?? ''), where, 'scenariusz nie pokazał wyniku od razu');
  await ctx.close();
}

async function noJs() {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    const where = `bez JS @${vp.name}`;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const path of ['/', '/kontakt/', '/konsola/']) {
      await page.goto(ORIGIN + path, { waitUntil: 'load' });
      const r = await page.evaluate(() => ({
        h1: getComputedStyle(document.querySelector('h1')).opacity,
        hidden: [...document.querySelectorAll('[data-reveal]')].filter((el) => Number(getComputedStyle(el).opacity) < 1).length,
        navLinks: [...document.querySelectorAll('.nav-links a')].filter((a) => a.getBoundingClientRect().width > 0).length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        items: document.querySelectorAll('[data-console] .cs-item').length,
      }));
      check(r.h1 === '1', `${where} ${path}`, 'nagłówek niewidoczny');
      check(r.hidden === 0, `${where} ${path}`, `${r.hidden} elementów ukrytych bez JS`);
      check(r.navLinks === 5, `${where} ${path}`, 'nawigacja niedostępna bez JS');
      check(!r.overflow, `${where} ${path}`, 'poziome przewijanie bez JS');
      if (path !== '/kontakt/') check(r.items >= 7, `${where} ${path}`, 'okno konsoli puste bez JS');
    }
    await ctx.close();
  }
}

/** Scenariusz, który się wywrócił, jest niepowodzeniem audytu, a nie jego końcem. */
const guarded = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    fail(name, `scenariusz przerwany: ${String(e?.message ?? e).split('\n')[0]}`);
  }
};

const rows = [];
for (const path of PAGES) for (const vp of VIEWPORTS) await guarded(`${path} @${vp.name}`, async () => void rows.push(await auditPage(path, vp)));
for (const path of ['/', '/konsola/']) {
  await guarded(`${path} konsola: klawiatura`, () => demoKeyboard(path));
  await guarded(`${path} konsola: dotyk`, () => demoTouch(path));
}
await guarded('formularz', form);
await guarded('menu', menu);
await guarded('wersja bez ruchu', reducedMotion);
await guarded('bez JS', noJs);

await browser.close();
server.close();

console.log('\nWaga pierwszego załadowania (B, bez kompresji):');
for (const r of rows.filter((r) => r.where.endsWith('@1440'))) console.log(`  ${r.where.padEnd(34)} ${String(r.weight).padStart(7)}  (JS ${r.js})`);
console.log(`\nSprawdzenia: ${checks}, niepowodzenia: ${failures.length}`);
if (failures.length > 0) {
  for (const f of failures) console.error(`✘ ${f}`);
  process.exit(1);
}
console.log('✔ Audyt przeszedł.');
