# Skibi Labs — strona

Statyczna strona B2B (Astro, TypeScript `strictest`, bez frameworka w przeglądarce).
Kierunek artystyczny i zestawienia ze wzorcem: [`docs/art-direction.md`](docs/art-direction.md).

## Polecenia

| Polecenie | Co robi |
| --- | --- |
| `npm run dev` | serwer deweloperski |
| `npm run build` | `astro check && astro build` → `dist/` (wersja robocza: `noindex`) |
| `npm test` | testy jednostkowe: konsola, typografia, formularz, bramka |
| `npm run audit` | audyt `dist/` w headless Chromium (Playwright + axe-core) |
| `npm run art` | ponowne wyrenderowanie grafik w `public/art/` |
| `npm run gate` | bramka publikacji — sprawdza `src/config/company.ts` |
| `npm run build:publish` | bramka + build do publikacji (`index, follow`, pełny `robots.txt`) |

Wymagania: Node ≥ 22.18. Audyt lokalnie wymaga Chromium dla Playwrighta
(`npx playwright install chromium`).

## Dane firmy i bramka publikacji

Wszystko, co strona mówi o firmie, jest w `src/config/company.ts`. Wartość `null` oznacza „nie
podano” — strona pokazuje wtedy żółty znacznik „do uzupełnienia”, a nie zmyśloną treść.
Publikacja wymaga uzupełnienia pól, opróżnienia listy `pending` i ustawienia
`ownerConfirmation` (`confirmed: true`, kto i kiedy). Bez tego `npm run build:publish` kończy
się błędem, a zwykły build oznacza wszystkie strony jako `noindex`.

## Struktura

- `src/pages/` — strony, `robots.txt`, `sitemap.xml`
- `src/lib/console/` — konsola demo: dane, model stanu, szablony HTML, warstwa DOM
- `src/lib/streaks/` — shader tła hero i jego uruchamianie
- `src/lib/typography.ts`, `integrations/typography.ts` — twarde spacje wstawiane w buildzie
- `src/styles/tokens.css` — tokeny (kolor, pismo, odstępy, ruch)
- `tests/` — testy jednostkowe i audyt
- `assets-src/` — źródła i licencje krojów oraz grafik
- `kono-state/tasks/` — karta zadania

Strona nie ustawia cookies, nie zapisuje niczego w pamięci przeglądarki i nie ładuje zasobów
z zewnętrznych serwerów. Formularz kontaktowy otwiera przygotowaną wiadomość e-mail.
