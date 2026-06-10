# CatCal — Instrukcje dla Claude Code

## O projekcie

CatCal to prywatna aplikacja webowa do kontrolowania dziennej kaloryczności jedzenia kota.
Aplikacja liczy kalorie, prowadzi dziennik posiłków i pomaga "domknąć dzień" kolacją.

## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (SPA, docelowo PWA)
- **Backend:** Node.js + TypeScript + Fastify
- **Baza danych:** PostgreSQL 16
- **ORM:** Drizzle ORM (lekki, type-safe, migracje SQL)
- **Konteneryzacja:** Docker Compose
- **Routing:** Jeden host, frontend na `/`, backend na `/api` — **zero CORS**

## Struktura repozytorium

```
cat-diet/                  (repo: holi87/cat-diet-calc)
├── AGENTS.md              ← ten plik (instrukcje dla agentów; CLAUDE.md = symlink → AGENTS.md)
├── README.md              ← szybki start, porty, testy
├── .github/
│   ├── workflows/ci.yml   ← CI: testy API (z Postgresem), testy+lint web, build obrazów Docker
│   └── dependabot.yml
├── docs/
│   ├── ARCHITECTURE.md    ← architektura, model danych, API
│   ├── FRONTEND.md        ← ekrany, komponenty, UX
│   ├── PLAN.md            ← plan wdrożenia (HISTORYCZNY — zrealizowany, nie odhaczany)
│   ├── DATABASE.md        ← baza produkcyjna, migracje, backup
│   ├── DEPLOYMENT.md      ← jak deployować, porty, rollback
│   ├── VERSIONING.md      ← wersjonowanie, changelog, konwencje git
│   └── PWA-TRAEFIK-GUIDE.md
├── docker-compose.yml
├── packages/
│   ├── api/               ← backend Fastify
│   │   ├── package.json / tsconfig.json / Dockerfile / .dockerignore
│   │   ├── drizzle.config.ts
│   │   ├── drizzle/               ← migracje SQL + meta/ (snapshoty — NIE edytować ręcznie)
│   │   ├── start.sh               ← migrate → (seed gdy RUN_SEED=true) → serwer
│   │   └── src/
│   │       ├── index.ts           ← entrypoint serwera
│   │       ├── app.ts             ← buildApp(): rejestracja route'ów, error handler
│   │       ├── db/
│   │       │   ├── client.ts      ← współdzielona pula połączeń
│   │       │   ├── schema.ts      ← Drizzle schema (wszystkie tabele + indeksy)
│   │       │   ├── migrate.ts     ← runner migracji
│   │       │   └── seed.ts        ← dane startowe (kot + produkty, w tym BASE)
│   │       ├── routes/
│   │       │   ├── cats.ts / foods.ts / feed-entries.ts
│   │       │   ├── day-summary.ts / close-day.ts / weight.ts
│   │       │   ├── history.ts / day-notes.ts
│   │       │   ├── export.ts      ← CSV
│   │       │   └── backup.ts      ← eksport/import JSON (pełny backup)
│   │       ├── lib/
│   │       │   ├── calc.ts        ← logika obliczeń kcal
│   │       │   ├── dates.ts       ← granice dnia w Europe/Warsaw
│   │       │   └── feed-entry.ts  ← rozliczanie gramy/sztuki
│   │       └── test/              ← testy integracyjne (wymagają DATABASE_URL)
│   └── web/               ← frontend React (PWA przez vite-plugin-pwa)
│       ├── package.json / tsconfig*.json / Dockerfile / .dockerignore
│       ├── vite.config.ts         ← PWA manifest + define __APP_VERSION__
│       ├── nginx.conf             ← prod: proxy /api, SPA fallback, cache, security headers
│       ├── eslint.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx / App.tsx ← routing, QueryClient z globalnym onError
│           ├── api/client.ts      ← fetch wrapper (`/api/...`)
│           ├── changelog.ts       ← CHANGELOG wyświetlany w aplikacji
│           ├── pages/
│           │   ├── Today.tsx      ← główny ekran dnia
│           │   ├── CloseDayPage.tsx ← domknięcie dnia kolacją
│           │   ├── CatsAdmin.tsx / FoodsAdmin.tsx
│           │   ├── WeightPage.tsx / HistoryPage.tsx
│           │   ├── DataPage.tsx   ← backup/restore JSON
│           │   └── NotFound.tsx
│           ├── components/
│           │   ├── DaySummaryCard.tsx / WeeklySummaryCard.tsx
│           │   ├── DayNoteInput.tsx / FeedEntryList.tsx / AddMealForm.tsx
│           │   ├── CloseDayCalc.tsx / DecimalInput.tsx
│           │   ├── ErrorBoundary.tsx / ErrorToasts.tsx / OfflineBanner.tsx
│           │   └── Layout.tsx     ← nawigacja, wersja (z __APP_VERSION__)
│           ├── lib/               ← dates, mealAmount, toast, useCurrentDate, useDebouncedValue
│           ├── constants/categories.ts
│           └── types/index.ts
└── scripts/
    ├── backup.sh          ← pg_dump przez docker exec
    └── crontab.example
```

## Konwencje kodu

### Ogólne
- Język kodu: **angielski** (nazwy zmiennych, funkcji, komentarze)
- Język UI: **polski** (etykiety, komunikaty dla użytkownika)
- TypeScript: strict mode, żadnych `any`
- Formatowanie: Prettier (default config)

### Backend (Fastify)
- Każdy plik w `routes/` rejestruje plugin Fastify z prefiksem
- Walidacja request/response przez JSON Schema (Fastify built-in) lub Zod + fastify-type-provider-zod
- Wszystkie endpointy pod `/api/...`
- Obsługa błędów: Fastify error handler, kody HTTP 4xx/5xx
- Transakcje DB tam, gdzie trzeba (np. zapis kolacji = 2 wpisy)

### Frontend (React)
- Funkcyjne komponenty + hooks
- Stan: React Query (TanStack Query) do cachowania i synchronizacji z API
- Routing: React Router v6
- Formularze: kontrolowane komponenty, walidacja po stronie klienta
- Responsywność: mobile-first (Tailwind breakpoints)
- Fetch: prosty wrapper wokół `fetch('/api/...')` — bez axios

### Baza danych
- UUID jako primary key (generowane przez Postgres: `gen_random_uuid()`)
- Timestamps: `created_at` z defaultem `now()`
- Soft delete: `archived` boolean zamiast usuwania (foods, cats)
- `kcal_calculated` zapisywane przy tworzeniu wpisu — historia nie zmienia się po edycji produktu

## Jak uruchomić

```bash
cp .env.example .env   # ustaw hasła; przy pierwszym starcie na świeżej bazie: RUN_SEED=true
docker compose up --build
```

Aplikacja dostępna na `http://localhost:8100`, API na `http://localhost:8101/api`
(w produkcji za Traefik na `cat.sh.info.pl`).

## Kolejność implementacji

`docs/PLAN.md` to dokument **historyczny** — plan został w całości zrealizowany.
Nie traktuj jego checkboxów jako zadań. Stan projektu opisują `README.md`,
`docs/ARCHITECTURE.md` i changelog w `packages/web/src/changelog.ts`.

## Ważne zasady

1. **Zero CORS** — frontend i backend pod jednym hostem, fetch po ścieżce `/api`
2. **Zapisuj `kcal_calculated`** na każdym wpisie feed_entry
3. **Kolacja = transakcja** — zapis mięsa + karmy w jednej transakcji DB
4. **Archiwizuj, nie usuwaj** — produkty i koty nigdy nie są kasowane z bazy
5. **Karma standardowa** w MVP: 1 kcal = 1 g (100 kcal/100g), stała systemowa
6. **Migracje** — każda zmiana schematu przez plik migracji Drizzle, nigdy ręcznie
7. **Git** — po każdej zmianie w kodzie wykonaj commit i push.
8. **Wersjonowanie** — każdy user-facing feature lub fix podbija wersję (`version` w `packages/web/package.json` — Layout czyta ją przez `__APP_VERSION__` z vite define) i dodaje wpis do `CHANGELOG` w `changelog.ts`. Procedura i schemat: `docs/VERSIONING.md`.

## Git workflow

Każdy folder, który jest repo gita (`ls .git` zwraca obecny katalog), wymaga po zakończonych zmianach:

1. `git status` — sanity check
2. `git add <pliki>` — staging (nie używaj `git add .` bezmyślnie)
3. `git commit -m "krótki temat w trybie rozkazującym"`
4. `git push` (lub `git push -u origin <branch>` dla nowej gałęzi)

Zasady:
- **Każda nowa praca rusza ze świeżego `main`** — przed nową gałęzią: `git checkout main && git pull`, dopiero potem `git checkout -b <branch>`. Nigdy nie dokładaj nowych zmian do gałęzi z już zmergowanym PR.
- Jeden temat = jeden commit. Nie mieszaj refactoru z fixem.
- Wiadomość: po polsku lub angielsku zgodnie z konwencją repo.
- Pre-commit hooki: jeśli failują — popraw przyczynę, nie skipuj `--no-verify`.
- Po zmianach w sub-projekcie sprawdź też repo nadrzędne (czasem są to osobne repa, czasem submodule, czasem ten sam tree).
