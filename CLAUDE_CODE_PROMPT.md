# Prompt dla Claude Code

Skopiuj poniższy tekst (od "Zbuduj..." do końca) jako wiadomość do Claude Code w folderze,
gdzie leży plik `trip-data.json`. Najpierw upewnij się, że `trip-data.json` jest w tym samym
katalogu co repo, które chcesz stworzyć.

---

Zbuduj statyczną, mobile-first stronę internetową prezentującą plan wycieczki po Szwajcarii,
na podstawie danych w pliku `trip-data.json` (jest w tym samym katalogu). Strona ma być
"ziobrem" całej wycieczki — jeden widok, który wygodnie przegląda się na telefonie.

## Wymagania techniczne

- Czysty HTML/CSS/JS, **bez frameworka i bez kroku budowania** (żadnego Reacta/Vite/npm build) —
  ma działać jako statyczne pliki bezpośrednio na GitHub Pages, zero konfiguracji.
- Mapy: Leaflet.js + kafelki OpenStreetMap (przez CDN, bez klucza API). Dla każdego dnia
  narysuj mapkę z pinezkami dla wszystkich przystanków tego dnia (użyj `lat`/`lon` z JSON)
  oraz linią łączącą je w kolejności (`polyline`).
- Zdjęcia: dla każdego głównego przystanku (tam gdzie ma sens, pomiń czyste punkty logistyczne
  typu "lądowanie"/"wylot") spróbuj pobrać miniaturkę z Wikipedia REST API:
  `https://en.wikipedia.org/api/rest_v1/page/summary/<nazwa_miejsca>` (pole `thumbnail.source`
  lub `originalimage.source`). Zrób to raz, w skrypcie budującym (np. Python/Node), i zapisz
  wynikowe URL-e bezpośrednio w wygenerowanym HTML/JSON — nie odpytuj Wikipedii przy każdym
  wejściu na stronę. Jeśli dla danego miejsca nie znajdziesz obrazka, pokaż estetyczną kartę
  zastępczą z nazwą miejsca zamiast pustego miejsca czy błędu.
- Struktura: nagłówek z tytułem/datami wycieczki, zakładki/przełącznik dni (Dzień 1–4), dla
  każdego dnia: mapka na górze + lista przystanków (godzina, nazwa, krótki opis, link "Więcej
  info" jeśli `link` jest w danych, plakietka z `notes` jeśli są ważne — np. "⚠️ wymagana
  rezerwacja"). Osobna sekcja "Noclegi" (z `accommodation`), osobna zwijana sekcja "Ważne info"
  (z `practical_info` i `weather_snapshot`, wyraźnie oznaczona jako migawka sprzed wyjazdu).
- Mobile-first: duże, wygodne do kciuka zakładki dni, czytelna typografia, brak poziomego
  przewijania. Dodaj prosty `manifest.json` + ikonę, żeby dało się dodać stronę do ekranu
  głównego telefonu jak aplikację (nice-to-have, nie blokuj się na tym jeśli będzie problem).
- Zanim opublikujesz, zweryfikuj przez wyszukiwarkę/fetch te linki, które w JSON są oznaczone
  jako "do zweryfikowania" (Lucerna, Zurych, Wengernalpbahn) i uzupełnij prawdziwymi, aktualnymi
  URL-ami do oficjalnych stron. Nie zgaduj URL-i na sztywno.
- Design: czysty, nowoczesny, ale nie generyczny — spójna paleta kolorów nawiązująca do
  szwajcarskich gór/jezior (np. odcienie granatu/turkusu/kremu), wyraźna hierarchia typografii.
  Unikaj domyślnego wyglądu "bootstrap template".

## Struktura plików (dla GitHub Pages)

Wszystko w katalogu głównym repo (albo w `/docs`, wskaż które wybrałeś):
- `index.html`
- `style.css` (lub inline, jeśli wolisz jeden plik)
- `app.js` (logika zakładek + renderowanie mapek Leaflet)
- `data.json` (finalna wersja danych, z uzupełnionymi linkami i URL-ami zdjęć)
- `manifest.json`, ikona (opcjonalnie)

## Wdrożenie na GitHub Pages

Po zbudowaniu strony:
1. Zainicjuj repo git w tym katalogu (jeśli jeszcze nie jest), zrób commit.
2. Jeśli masz dostęp do `gh` CLI i jestem zalogowany — utwórz nowe **publiczne** repo na GitHubie
   (np. `szwajcaria-2026`), wypchnij kod, włącz GitHub Pages (branch `main`, root) przez
   `gh api` lub wskazówkę, żebym zrobił to ręcznie w ustawieniach repo.
3. Jeśli nie masz `gh` CLI / nie jestem zalogowany — przygotuj mi dokładne polecenia
   (`git remote add`, `git push`) i listę kroków do zrobienia ręcznie na github.com, tak żebym
   mógł to dokończyć sam w 2 minuty.
4. Na końcu podaj mi finalny adres URL strony (`https://<user>.github.io/<repo>/`).

Pytaj mnie tylko, jeśli czegoś naprawdę brakuje (np. nazwy repo albo mojego loginu na GitHubie) —
poza tym działaj samodzielnie i pokaż efekt na koniec.
