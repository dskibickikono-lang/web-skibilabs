# Kroje — źródła

| Plik w `public/fonts/` | Źródło | Wersja | Licencja |
| --- | --- | --- | --- |
| `inter-var-pl.woff2` (32 kB) | pakiet npm `inter-ui`, plik `variable/InterVariable.woff2` | 4.1.1 | SIL OFL 1.1 — `Inter-LICENSE.txt` |
| `geist-mono-var-pl.woff2` (9 kB) | pakiet npm `geist`, plik `dist/fonts/geist-mono/GeistMono-Variable.woff2` | 1.9.2 | SIL OFL 1.1 — `Geist-LICENSE.txt` |

Pliki nie pochodzą ze strony wzorca. Zostały przycięte narzędziami `fonttools`:

```sh
# oś grubości i (dla Intera) rozmiaru optycznego
fonttools varLib.instancer InterVariable.woff2 wght=400:600 opsz=14:32 -o inter.ttf
fonttools varLib.instancer GeistMono-Variable.woff2 wght=400:500 -o geist.ttf

# znaki: ASCII, polskie litery, cudzysłowy, pauzy, strzałki, kilka symboli
U="U+0020-007E,U+00A0,U+00A9,U+00B0,U+00B1,U+00B7,U+00D3,U+00F3,U+00D7,U+0104-0107,U+0118,U+0119,U+0141-0144,U+015A,U+015B,U+0179-017C,U+2011,U+2013,U+2014,U+2018,U+2019,U+201C-201E,U+2022,U+2026,U+2190-2193,U+2197,U+21B5,U+2318,U+2325,U+2713,U+2715,U+2212,U+2265"
pyftsubset inter.ttf --unicodes="$U" --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,zero,ss03,cv11' --flavor=woff2 --no-hinting --desubroutinize --output-file=inter-var-pl.woff2
pyftsubset geist.ttf --unicodes="$U" --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum,zero' --flavor=woff2 --no-hinting --output-file=geist-mono-var-pl.woff2
```

Znak spoza tej listy wyświetli się krojem zastępczym — przy dopisywaniu treści z nowymi
symbolami trzeba powtórzyć przycinanie.
