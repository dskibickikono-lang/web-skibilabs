# T-WEB-SKIBILABS-001 — Strona B2B Skibi Labs

- channel: pm-local
- requested_by: owner
- status: do odbioru przez właściciela (PR otwarty, merge robi właściciel)
- branch: skibiai/great-maxwell-p2v6l2
- pr: https://github.com/dskibickikono-lang/web-skibilabs/pull/1
- sha (kod): b0e1e4b
- wdrożenia: brak
- koszty generowania (Higgsfield): 0 — klucz nie był pobierany, budżet nie został podany

## Zakres

Kompletna strona B2B Skibi Labs po polsku, wzorzec jakości: raycast.com. Astro (statyczny HTML),
konsola demo sterowana klawiaturą i dotykiem, audyt Playwright + axe-core w CI.

## Wyniki testów

| Co | Gdzie | Wynik |
| --- | --- | --- |
| `npm test` (22 testy jednostkowe) | lokalnie, Linux | 22/22 |
| `npm run build` (`astro check && astro build`) | lokalnie, Linux | 0 błędów, 0 ostrzeżeń, 9 stron |
| `npm run audit` (Playwright + axe-core) | lokalnie, Linux | 915 sprawdzeń, 0 niepowodzeń |
| Lighthouse 13.6 mobile, strona główna | lokalnie, headless | 100 / 100 / 100, LCP 0,8 s, CLS 0; SEO 100 w buildzie publikacyjnym |
| Workflow `CI` (testy, build, audyt) | GitHub Actions, PR #1 | zielony dla `b0e1e4b` (przebieg 43742550975, 3 min 13 s) |

## Dane od właściciela — stan

| Pole | Stan |
| --- | --- |
| NIP, REGON | podane, sumy kontrolne poprawne |
| Adres | podany; numer „717” do potwierdzenia (717 czy 7/17) |
| Domena, e-mail kontaktowy | nie podano |
| Pełna nazwa podmiotu | nie podano |
| Deklaracje | odpowiedź w 1 dzień roboczy; stała cena za uzgodniony zakres |
| Referencje | zaznaczono „mam”, treści nie podano — na stronie zamienniki oparte na faktach |
| Higgsfield | zaznaczono „mam klucz i budżet”, budżetu nie podano — nie użyto |

Bramka publikacji (`npm run gate`) blokuje do czasu uzupełnienia `src/config/company.ts`.

## Czego nie sprawdzono

- płynności animacji i wyglądu na sprzęcie z GPU (headless tego nie pokaże),
- Safari i Firefoksa (audyt działa w Chromium),
- otwierania wiadomości w programie pocztowym odwiedzającego,
- treści prawnych: polityka prywatności i zasady autoryzacji testów wymagają przeczytania przez właściciela.

## Uwagi

- Rejestr decyzji `kono-state/decisions/REJESTR_DECYZJI_BIZNESOWYCH.md` nie istnieje w tym
  repozytorium (repozytorium było puste) — nie było czego stosować.
- Numeracja karty nadana lokalnie zgodnie z poleceniem.
- Gałąź `main` założona pustym commitem, zgodnie z poleceniem.
- Dokumentacja i zestawienia: `docs/art-direction.md`.
