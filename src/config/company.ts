/**
 * Jedyne źródło danych firmy. Wszystko, co strona mówi o Skibi Labs jako podmiocie
 * (stopka, kontakt, polityka prywatności, deklaracje), pochodzi z tego pliku.
 *
 * Zasada: wartość `null` = właściciel jej nie podał. Niczego nie dopisujemy „na oko”.
 * Publikację blokuje bramka `npm run gate` (scripts/publish-gate.mjs), dopóki
 * `ownerConfirmation.confirmed` nie ma wartości `true` i nie znikną pozycje z `pending`.
 */

export interface Reference {
  /** Nazwa klienta albo osoby — tylko za zgodą i tylko podana przez właściciela. */
  name: string;
  role: string | null;
  quote: string | null;
}

export interface CompanyConfig {
  brand: string;
  /** Pełna nazwa podmiotu z formą prawną, tak jak w rejestrze. */
  legalName: string | null;
  nip: string | null;
  regon: string | null;
  address: {
    street: string | null;
    postalCode: string | null;
    city: string | null;
  };
  /** Sama domena, bez protokołu, np. „przyklad.pl”. */
  domain: string | null;
  email: string | null;
  /** Deklaracje, które właściciel pozwolił podać w treści. */
  declarations: {
    /** Czas odpowiedzi na zapytanie. */
    responseTime: string | null;
    /** Model rozliczeń (bez kwot). */
    billing: string | null;
    /** Czas pierwszego wdrożenia. */
    firstDeployment: string | null;
    /** Zakres i forma raportu z audytu, wykraczające poza opis filaru. */
    auditReport: string | null;
  };
  references: readonly Reference[];
  /** Pola wymagające decyzji właściciela przed publikacją. */
  pending: readonly string[];
  ownerConfirmation: {
    confirmed: boolean;
    confirmedBy: string | null;
    /** Data w formacie RRRR-MM-DD. */
    confirmedAt: string | null;
  };
}

export const company: CompanyConfig = {
  brand: 'Skibi Labs',
  legalName: 'Skibi Labs',
  nip: '7441749535',
  regon: '389229155',
  address: {
    street: 'ul. Złota 75A/7',
    postalCode: '00-817',
    city: 'Warszawa',
  },
  domain: 'skibilabs.pl',
  email: 'kontakt@skibilabs.pl',
  declarations: {
    responseTime: '1 dzień roboczy',
    billing: 'stała cena za uzgodniony zakres',
    firstDeployment: null,
    auditReport: null,
  },
  references: [],
  pending: [],
  ownerConfirmation: {
    confirmed: true,
    confirmedBy: 'Dawid Skibicki',
    confirmedAt: '2026-11-15',
  },
};

/** Domena zastępcza: TLD `.invalid` nigdy nie istnieje w DNS (RFC 2606). */
export const PLACEHOLDER_ORIGIN = 'https://skibilabs.invalid';

export const siteOrigin: string = company.domain ? `https://${company.domain}` : PLACEHOLDER_ORIGIN;

/** Czy build jest wersją do publikacji (ustawiane wyłącznie przez `npm run build:publish`). */
export function isPublishBuild(env: Record<string, string | undefined>): boolean {
  return env['SITE_PUBLISH'] === '1';
}

/** Lista powodów, dla których strony nie wolno opublikować. Pusta = wolno. */
export function publishBlockers(c: CompanyConfig = company): string[] {
  const out: string[] = [];
  if (!c.ownerConfirmation.confirmed) out.push('ownerConfirmation.confirmed ma wartość false');
  if (c.ownerConfirmation.confirmed && (!c.ownerConfirmation.confirmedBy || !c.ownerConfirmation.confirmedAt)) {
    out.push('ownerConfirmation: brak confirmedBy albo confirmedAt');
  }
  if (!c.legalName) out.push('legalName: brak pełnej nazwy podmiotu');
  if (!c.nip || !/^\d{10}$/.test(c.nip)) out.push('nip: brak albo zły format (10 cyfr)');
  if (!c.address.street || !c.address.postalCode || !c.address.city) out.push('address: niepełny adres');
  if (!c.domain) out.push('domain: brak domeny');
  if (!c.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) out.push('email: brak adresu kontaktowego');
  for (const p of c.pending) out.push(`pending: ${p}`);
  return out;
}

export function addressLine(c: CompanyConfig = company): string | null {
  const { street, postalCode, city } = c.address;
  if (!street || !postalCode || !city) return null;
  return `${street}, ${postalCode} ${city}`;
}
