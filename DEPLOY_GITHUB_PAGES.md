# Wdrożenie na GitHub Pages — ściągawka

Claude Code powinien spróbować zrobić to sam (patrz `CLAUDE_CODE_PROMPT.md`), ale gdyby
utknął albo wolisz zrobić to ręcznie — oto pełna ścieżka.

## 1. Utwórz repozytorium na GitHubie

- Wejdź na https://github.com/new
- Nazwa np. `szwajcaria-2026`
- Ustaw jako **Public** (GitHub Pages za darmo działa dla repo publicznych; dla prywatnych
  wymaga płatnego planu)
- Nie zaznaczaj "Initialize with README" (masz już pliki lokalnie)

## 2. Wypchnij pliki ze strony

W katalogu z gotową stroną (tym, który zbuduje Claude Code):

```bash
git init
git add .
git commit -m "Strona z planem wycieczki do Szwajcarii"
git branch -M main
git remote add origin https://github.com/<TWOJ_LOGIN>/szwajcaria-2026.git
git push -u origin main
```

Jeśli git prosi o hasło — GitHub od dawna nie akceptuje zwykłego hasła do push przez HTTPS.
Najprościej:
- zainstaluj `gh` CLI i zrób `gh auth login`, albo
- użyj Personal Access Token (Settings → Developer settings → Personal access tokens) jako
  hasła przy pierwszym pushu.

## 3. Włącz GitHub Pages

- Wejdź w repo na GitHubie → **Settings** → **Pages** (w menu po lewej)
- Sekcja "Build and deployment" → **Source**: `Deploy from a branch`
- **Branch**: `main`, folder: `/ (root)` (albo `/docs`, jeśli tam wygenerowano pliki)
- Zapisz

## 4. Poczekaj i sprawdź

- Pierwszy deploy trwa zwykle 1–3 minuty
- Adres strony: `https://<TWOJ_LOGIN>.github.io/szwajcaria-2026/`
- Status wdrożenia widać w zakładce **Actions** w repo

## 5. Aktualizacje później

Każdy kolejny `git push` do brancha `main` automatycznie odświeży opublikowaną stronę
(zwykle w ciągu minuty).

## Częste problemy

- **404 na stronie głównej** — sprawdź, czy `index.html` faktycznie leży w katalogu głównym
  (albo w `/docs`, jeśli to wybrałeś jako źródło w ustawieniach Pages).
- **Mapa się nie ładuje** — sprawdź w konsoli przeglądarki (F12), czy skrypt Leaflet z CDN się
  wczytał; czasem trzeba chwilę odczekać po pierwszym deployu.
- **Zdjęcia nie działają** — jeśli URL-e do zdjęć są pobierane z Wikipedii "na żywo" w
  przeglądarce, mogą czasem nie zadziałać przez CORS; poproś Claude Code, żeby zamiast tego
  zapisał gotowe URL-e obrazków bezpośrednio w danych strony podczas budowania.
