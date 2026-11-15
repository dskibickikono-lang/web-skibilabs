/** Struktura serwisu: nawigacja, stopka i lista stron do mapy witryny. */

export interface NavItem {
  href: string;
  label: string;
}

export const NAV: readonly NavItem[] = [
  { href: '/agenci/', label: 'Agenci AI' },
  { href: '/automatyzacja/', label: 'Automatyzacja' },
  { href: '/bezpieczenstwo/', label: 'Bezpieczeństwo' },
  { href: '/konsola/', label: 'Konsola' },
  { href: '/jak-pracujemy/', label: 'Jak pracujemy' },
];

export const CONTACT: NavItem = { href: '/kontakt/', label: 'Napisz do nas' };

export const FOOTER: readonly { title: string; links: readonly NavItem[] }[] = [
  {
    title: 'Co robimy',
    links: [
      { href: '/agenci/', label: 'Infrastruktura dla agentów AI' },
      { href: '/automatyzacja/', label: 'Automatyzacja na własnym serwerze' },
      { href: '/bezpieczenstwo/', label: 'Audyty bezpieczeństwa i red team' },
    ],
  },
  {
    title: 'Poznaj',
    links: [
      { href: '/konsola/', label: 'Konsola demo' },
      { href: '/jak-pracujemy/', label: 'Jak pracujemy' },
      { href: '/jak-pracujemy/#autoryzacja', label: 'Zasady autoryzacji testów' },
    ],
  },
  {
    title: 'Firma',
    links: [
      { href: '/kontakt/', label: 'Kontakt' },
      { href: '/polityka-prywatnosci/', label: 'Polityka prywatności' },
    ],
  },
];

/** Strony w mapie witryny (bez 404). */
export const PAGES: readonly string[] = [
  '/',
  '/agenci/',
  '/automatyzacja/',
  '/bezpieczenstwo/',
  '/konsola/',
  '/jak-pracujemy/',
  '/kontakt/',
  '/polityka-prywatnosci/',
];
