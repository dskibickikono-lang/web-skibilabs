/**
 * Formularz kontaktowy bez serwera: z danych powstaje gotowa wiadomość e-mail,
 * którą otwiera program pocztowy odwiedzającego. Czyste funkcje, bez DOM.
 */

export interface ContactData {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactData, string>>;

export const TOPICS = ['Agenci AI', 'Automatyzacja', 'Bezpieczeństwo', 'Jeszcze nie wiem'] as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function validate(d: ContactData): ContactErrors {
  const e: ContactErrors = {};
  if (d.name.trim().length < 2) e.name = 'Podaj imię i nazwisko.';
  if (!EMAIL.test(d.email.trim())) e.email = 'Podaj adres e-mail, na który mamy odpowiedzieć.';
  if (d.message.trim().length < 10) e.message = 'Napisz w kilku zdaniach, czego dotyczy sprawa.';
  return e;
}

export function composeSubject(d: ContactData): string {
  const who = d.company.trim() || d.name.trim();
  return `Zapytanie: ${d.topic || 'Skibi Labs'} — ${who}`;
}

export function composeBody(d: ContactData): string {
  const lines = [
    d.message.trim(),
    '',
    '—',
    `Imię i nazwisko: ${d.name.trim()}`,
    `E-mail do odpowiedzi: ${d.email.trim()}`,
  ];
  if (d.company.trim()) lines.push(`Firma: ${d.company.trim()}`);
  if (d.topic) lines.push(`Temat: ${d.topic}`);
  return lines.join('\n');
}

/** Adres `mailto:` z tematem i treścią. Bez adresata pole „Do” zostaje puste. */
export function buildMailto(to: string | null, d: ContactData): string {
  const q = `subject=${encodeURIComponent(composeSubject(d))}&body=${encodeURIComponent(composeBody(d))}`;
  return `mailto:${to ? encodeURIComponent(to).replace(/%40/g, '@') : ''}?${q}`;
}
