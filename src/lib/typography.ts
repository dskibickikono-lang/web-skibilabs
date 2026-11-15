/**
 * Polska mikrotypografia: twarda spacja po jednoliterowych spójnikach i przyimkach
 * oraz przed półpauzą i pauzą, żeby myślnik nigdy nie zaczynał wiersza.
 *
 * Funkcje są czyste i idempotentne — ta sama logika działa w buildzie (integracja
 * `integrations/typography.ts` przetwarza gotowy HTML) i w szablonach konsoli demo
 * renderowanych w przeglądarce.
 */

const NBSP = ' ';

const ORPHAN = /(?<=^|[\s („"‚'>/])([aiouwzAIOUWZ])[ \t\r\n]+(?=\S)/g;
const DASH = /[ \t\r\n]+([–—])(?=[\s ]|$)/g;

/** Poprawia czysty tekst (bez znaczników HTML). */
export function typo(text: string): string {
  return text.replace(ORPHAN, `$1${NBSP}`).replace(DASH, `${NBSP}$1`);
}

const SKIP_TAGS = new Set(['script', 'style', 'pre', 'code', 'textarea', 'title', 'svg', 'noscript']);
const INLINE_TAGS = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'kbd', 'abbr', 'mark', 'small']);
const TOKEN = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:"[^"]*"|'[^']*'|[^'">])*>/g;
const SENTINEL = '\u0001';

/**
 * Poprawia tekst w dokumencie HTML. Nie dotyka atrybutów, skryptów, stylów, kodu
 * ani elementów z atrybutem `data-no-typo`.
 */
export function typoHtml(html: string): string {
  let out = '';
  let last = 0;
  /** Stos nazw znaczników, wewnątrz których tekst zostaje bez zmian. */
  const skip: string[] = [];
  const flush = (end: number, nextInline: boolean): void => {
    if (end <= last) return;
    const chunk = html.slice(last, end);
    if (skip.length > 0) {
      out += chunk;
    } else if (nextInline) {
      // Spójnik na końcu fragmentu, po którym zaczyna się znacznik w linii („w <a>…”).
      out += typo(chunk + SENTINEL).replace(SENTINEL, '');
    } else {
      out += typo(chunk);
    }
  };
  for (const m of html.matchAll(TOKEN)) {
    const tag = m[0];
    const name = m[1]?.toLowerCase();
    const closing = tag.startsWith('</');
    flush(m.index, name !== undefined && !closing && INLINE_TAGS.has(name));
    out += tag;
    last = m.index + tag.length;
    if (name === undefined) continue;
    if (closing) {
      if (skip.length > 0 && skip[skip.length - 1] === name) skip.pop();
    } else if (!tag.endsWith('/>')) {
      if (SKIP_TAGS.has(name) || (/\sdata-no-typo[\s=>]/.test(tag) && skip.length === 0)) skip.push(name);
      else if (skip.length > 0 && skip[skip.length - 1] === name) skip.push(name);
    }
  }
  flush(html.length, false);
  return out;
}
