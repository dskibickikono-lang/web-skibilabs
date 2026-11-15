import assert from 'node:assert/strict';
import { test } from 'node:test';
import { company, publishBlockers, type CompanyConfig } from '../src/config/company.ts';
import { buildMailto, composeBody, validate } from '../src/lib/contact.ts';
import { typo, typoHtml } from '../src/lib/typography.ts';

const NB = ' ';

test('typografia: twarda spacja po jednoliterowych spójnikach i przyimkach', () => {
  assert.equal(typo('Agent i przepływ w kodzie'), `Agent i${NB}przepływ w${NB}kodzie`);
  assert.equal(typo('Stawiamy to u Ciebie, a potem z Tobą'), `Stawiamy to u${NB}Ciebie, a${NB}potem z${NB}Tobą`);
  assert.equal(typo('i w domu'), `i${NB}w${NB}domu`);
  assert.equal(typo('W Make'), `W${NB}Make`);
});

test('typografia: myślnik nie zaczyna wiersza', () => {
  assert.equal(typo('Zamiast opinii — zasady'), `Zamiast opinii${NB}— zasady`);
  assert.equal(typo('test – wynik'), `test${NB}– wynik`);
});

test('typografia: funkcja jest idempotentna', () => {
  const once = typo('Wdrożenie, przepływ i test — z klawiatury');
  assert.equal(typo(once), once);
});

test('typografia w HTML: omija atrybuty, skrypty, kod i elementy data-no-typo', () => {
  const html = '<p title="a i b">a i b <a href="/x">w domu</a></p><script>var a = "i w";</script><pre>i w</pre><p data-no-typo>i w</p>';
  const out = typoHtml(html);
  assert.ok(out.includes(`<p title="a i b">a${NB}i${NB}b <a href="/x">w${NB}domu</a></p>`));
  assert.ok(out.includes('<script>var a = "i w";</script>'));
  assert.ok(out.includes('<pre>i w</pre>'));
  assert.ok(out.includes('<p data-no-typo>i w</p>'));
});

test('typografia w HTML: spójnik przed znacznikiem w linii', () => {
  assert.equal(typoHtml('<p>scenariusze w <a href="/k">konsoli</a></p>'), `<p>scenariusze w${NB}<a href="/k">konsoli</a></p>`);
});

test('kontakt: walidacja wymaga imienia, adresu i treści', () => {
  const e = validate({ name: '', email: 'zly', company: '', topic: '', message: 'krótko' });
  assert.deepEqual(Object.keys(e).sort(), ['email', 'message', 'name']);
  assert.deepEqual(validate({ name: 'Jan Kowalski', email: 'jan@example.com', company: '', topic: 'Automatyzacja', message: 'Chcę przenieść trzy scenariusze.' }), {});
});

test('kontakt: wiadomość e-mail ma temat i treść, także bez adresata', () => {
  const d = { name: 'Jan Kowalski', email: 'jan@example.com', company: 'ACME', topic: 'Bezpieczeństwo', message: 'Proszę o audyt agenta.' };
  const withTo = buildMailto('kontakt@example.com', d);
  assert.ok(withTo.startsWith('mailto:kontakt@example.com?subject='));
  assert.ok(decodeURIComponent(withTo).includes('Proszę o audyt agenta.'));
  assert.ok(buildMailto(null, d).startsWith('mailto:?subject='));
  assert.ok(composeBody(d).includes('E-mail do odpowiedzi: jan@example.com'));
});

test('bramka publikacji: bez potwierdzenia właściciela blokuje', () => {
  assert.ok(publishBlockers(company).length > 0 || company.ownerConfirmation.confirmed);
  const ok: CompanyConfig = {
    ...company,
    legalName: 'Przykład sp. z o.o.',
    domain: 'example.com',
    email: 'kontakt@example.com',
    pending: [],
    ownerConfirmation: { confirmed: true, confirmedBy: 'Właściciel', confirmedAt: '2026-11-15' },
  };
  assert.deepEqual(publishBlockers(ok), []);
  assert.ok(publishBlockers({ ...ok, ownerConfirmation: { confirmed: false, confirmedBy: null, confirmedAt: null } }).length > 0);
  assert.ok(publishBlockers({ ...ok, email: null }).some((b) => b.startsWith('email')));
});
