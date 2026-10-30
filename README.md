# michalszeniak.emes.dev

Jednostronicowa wizytówka. Astro 7 + TypeScript + Tailwind CSS 4, statyczny build, bez cookies i zewnętrznych zapytań. Domyślnie bez JavaScriptu po stronie klienta; jedyny skrypt składa adres e-mail (w hero i w sekcji „Kontakt”) i trafia na stronę dopiero wtedy, gdy adres jest ustawiony.

## Polecenia

| Polecenie         | Co robi                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `npm run dev`     | serwer deweloperski na http://localhost:4321 (pokazuje też szkice projektów) |
| `npm run build`   | sprawdzenie typów (`astro check`) i build do `dist/`                    |
| `npm run preview` | podgląd zbudowanej strony                                               |
| `npm run brand`   | generuje favicony i `og.png` z `src/assets/brand/*.svg` i `src/content.ts` (wymaga lokalnego Chrome, ścieżkę można podać w `CHROME_PATH`) |

Wymagany Node ≥ 22.23.4 (wersja dla hostingu jest w `.node-version`).

## Przed wdrożeniem do uzupełnienia

W `src/content.ts` szukaj `[DO UZUPEŁNIENIA]`:

- `site.projects` i `projects.items`: 2–3 projekty (nazwa, link, stack, jedno zdanie). Wpisy z `draft: true` widać tylko w `npm run dev`; dopóki nie ma żadnego gotowego projektu, sekcja „Projekty” nie trafia do builda.
- `site.email`: opcjonalny alias na domenie. Adres nie pojawia się w HTML; składa go skrypt po załadowaniu strony. Ustawiony: kontakt@emes.dev (wymaga aliasu w Cloudflare Email Routing).

## Gdzie co jest

- `src/content.ts`: cała treść i fakty (stanowiska z datami, projekty, linki). Liczby lat są liczone z dat przy buildzie.
- `src/pages/index.astro`: kolejność sekcji; z tej samej listy powstaje nawigacja.
- `src/components/`: nagłówek, stopka, hero z osią czasu, `Section.astro` (wspólny moduł sekcji) i po jednym komponencie na sekcję.
- `src/lib/`: daty i oś lat (`career.ts`), wspólne propsy sekcji, wygląd przycisków, filtr szkiców projektów.
- `src/styles/global.css`: tokeny (kolory jasne i ciemne, kratka 24 px, przesunięcia linii bazowych).
- `src/assets/brand/`: logo emes (wordmark i monogram, czysty SVG z `currentColor`); `brand/concepts/` to koncepcje z etapu 1.
- `src/pages/llms.txt.ts` i `src/pages/404.astro`: podsumowanie dla modeli językowych i strona 404.

Po zmianie imienia, roli lub logo uruchom `npm run brand`, żeby odświeżyć `og.png` i ikony.

Wersja EN: tekst jest kompletny per język (`SiteContent`), więc TypeScript wskaże brakujące tłumaczenia. Strona korzysta dziś z jednego języka (`defaultLocale`); druga wersja wymaga osobnej trasy (np. `src/pages/en/index.astro`), angielskich kotwic sekcji i drugiego obrazu OG.

## Wdrożenie

Cloudflare Pages lub Netlify: polecenie budowania `npm run build`, katalog wyjściowy `dist`. Plik `public/_headers` ustawia nagłówki bezpieczeństwa i cache (GitHub Pages go ignoruje); reszta CSP jest w znaczniku `<meta>` generowanym przez Astro.

Lata doświadczenia i „dziś” na osi są liczone w momencie buildu. Żeby nie starzały się między wdrożeniami, warto ustawić comiesięczny build (np. build hook Cloudflare/Netlify wywoływany przez GitHub Actions z `schedule`).
