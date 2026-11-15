# Grafiki — źródła

Wszystkie pliki w `public/art/` powstają z kodu, tym samym shaderem, który rysuje tło hero.
Nie użyto żadnego modelu generującego obraz ani film. Koszt: 0.

| Plik | Zestaw parametrów (`src/lib/streaks/shader.ts`) | Wymiary | Gdzie użyty |
| --- | --- | --- | --- |
| `hero-1200.webp` | `hero` | 1200×895 | statyczny kadr hero (komputer), także bez JS i przy ograniczonym ruchu |
| `hero-780.webp` | `heroMobile` | 780×1120 | statyczny kadr hero (telefon) |
| `card-wide.webp` | `cardWide` | 1200×432 | rama konsoli, karta „Kod i opis działania” |
| `card-tall.webp` | `cardTall` | 720×900 | tło nagłówka podstron |
| `footer.webp` | `footer` | 1200×420 | szczyt smug nad stopką |

Odtworzenie: `npm run art` (Playwright uruchamia Chromium, rysuje shader na płótnie i zapisuje
WebP). Po zmianie shadera albo parametrów trzeba uruchomić to polecenie ponownie, żeby kadr
statyczny zgadzał się z animacją.

Higgsfield: nieużyty, klucz nie był pobierany, rejestr wydatków jest pusty.
