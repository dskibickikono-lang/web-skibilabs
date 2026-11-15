# T-WEB-SKIBILABS-001 — Strona B2B Skibi Labs

- channel: pm-local
- requested_by: owner
- status: do odbioru przez właściciela (PR #2 otwarty, odblokowana publikacja; merge robi właściciel)
- branch: skibiai/dane-firmy-publikacja (poprzednio PR #1: skibiai/great-maxwell-p2v6l2, zmergowany w `e4935a3`)
- pr: https://github.com/dskibickikono-lang/web-skibilabs/pull/2 (poprzednio: https://github.com/dskibickikono-lang/web-skibilabs/pull/1)
- sha (kod): 92b7f29 (poprzednio PR #1: b0e1e4b / 26ff5b8)
- wdrożenia: brak
- koszty generowania (Higgsfield): 0 — klucz nie był pobierany, budżet nie został podany

## Zakres

Kompletna strona B2B Skibi Labs po polsku, wzorzec jakości: raycast.com. Astro (statyczny HTML),
konsola demo sterowana klawiaturą i dotykiem, audyt Playwright + axe-core w CI.

## Wyniki testów

| Co | Gdzie | Wynik |
| --- | --- | --- |
| `npm run gate` | lokalnie, Linux (Node v22.23.5 izolowany) | przechodzi (`Dawid Skibicki (2026-11-15)`) |
| `npm test` (22 testy jednostkowe) | lokalnie, Linux (Node v22.23.5 izolowany) | 22/22 |
| `npm run build:publish` (`gate && astro check && SITE_PUBLISH=1 astro build`) | lokalnie, Linux (Node v22.23.5 izolowany) | 0 błędów, 0 ostrzeżeń, 9 stron (`https://skibilabs.pl`) |
| `npm run audit` (Playwright + axe-core) | GitHub Actions / wcześniej na `b0e1e4b` | 915 sprawdzeń, 0 niepowodzeń na `b0e1e4b`; dla PR #2 w toku w CI (brak lokalnej binarki Chromium) |
| Lighthouse 13.6 mobile, strona główna | lokalnie, headless (dla PR #1) | 100 / 100 / 100, LCP 0,8 s, CLS 0; SEO 100 w buildzie publikacyjnym |
| Workflow `CI` (testy, build, audyt) | GitHub Actions, PR #2 | sprawdź zakładkę Checks w PR #2 (PR #1 był zielony dla `b0e1e4b`) |

## Dane od właściciela — stan

| Pole | Stan |
| --- | --- |
| Nazwa podmiotu | Skibi Labs (potwierdzona 2026-11-15) |
| NIP, REGON | NIP 7441749535, REGON 389229155 — potwierdzone |
| Adres | ul. Złota 75A/7, 00-817 Warszawa — potwierdzony |
| E-mail kontaktowy | kontakt@skibilabs.pl — potwierdzony |
| Domena | skibilabs.pl — potwierdzona |
| Potwierdzenie właściciela | Dawid Skibicki, 2026-11-15 (`ownerConfirmation.confirmed: true`, `pending: []`) |
| Deklaracje | odpowiedź w 1 dzień roboczy; stała cena za uzgodniony zakres |
| Referencje | właściciel nie podał treści; usunięto pozycję z `pending`, strona zostaje przy zamiennikach opartych na faktach |
| Higgsfield | zaznaczono „mam klucz i budżet”, budżetu nie podano — nie użyto |

Bramka publikacji (`npm run gate`) przechodzi; `npm run build:publish` buduje wersję produkcyjną dla `https://skibilabs.pl`.

## Odbiór właściciela (15.11.2026)

- odbiór wizualny względem raycast.com: przyjęty,
- płynność na laptopie właściciela: płynnie.

## Czego nie sprawdzono

- Safari i Firefoksa (audyt działa w Chromium),
- otwierania wiadomości w programie pocztowym odwiedzającego,
- treści prawnych: polityka prywatności i zasady autoryzacji testów wymagają przeczytania przez właściciela.

## Uwagi

- Rejestr decyzji `kono-state/decisions/REJESTR_DECYZJI_BIZNESOWYCH.md` nie istnieje w tym
  repozytorium (repozytorium było puste) — nie było czego stosować.
- Numeracja karty nadana lokalnie zgodnie z poleceniem.
- Gałąź `main` założona pustym commitem, zgodnie z poleceniem.
- Dokumentacja i zestawienia: `docs/art-direction.md`.
