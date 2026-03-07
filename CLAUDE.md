# CatCal — Instrukcje dla Claude Code

## O projekcie

CatCal to prywatna aplikacja webowa do kontrolowania dziennej kaloryczności jedzenia kota.
Aplikacja liczy kalorie, prowadzi dziennik posiłków i pomaga "domknąć dzień" kolacją.
P
## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (SPA, docelowo PWA)
- **Backend:** Node.js + TypeScript + Fastify
- **Baza danych:** PostgreSQL 16
- **ORM:** Drizzle ORM (lekki, type-safe, migracje SQL)
- **Konteneryzacja:** Docker Compose
- **Routing:** Jeden host, frontend na `/`, backend na `/api` — **zero CORS**

## Struktura repozytorium

```
catcal/
├── CLAUDE.md              ← ten plik (instrukcje dla Claude Code)
├── docs/
│   ├── ARCHITECTURE.md    ← architektura, model danych, API
│   ├── FRONTEND.md        ← ekrany, komponenty, UX
│   ├── PLAN.md            ← plan wdrożenia krok po kroku
│   ├── DATABASE.md        ← baza produkcyjna, migracje, backup
│   ├── DEPLOYMENT.md      ← jak deployować, porty, rollback
│   └── VERSIONING.md      ← wersjonowanie, changelog, konwencje git
├── docker-compose.yml
├── packages/
│   ├── api/               ← backend Fastify
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts           ← serwer Fastify
│   │       ├── db/
│   │       │   ├── schema.ts      ← Drizzle schema (wszystkie tabele)
│   │       │   ├── migrate.ts     ← runner migracji
│   │       │   └── seed.ts        ← dane startowe (produkty, kot)
│   │       ├── routes/
│   │       │   ├── cats.ts
│   │       │   ├── foods.ts
│   │       │   ├── feed-entries.ts
│   │       │   ├── day-summary.ts
│   │       │   ├── close-day.ts
│   │       │   ├── weight.ts
│   │       │   ├── history.ts
│   │       │   ├── day-notes.ts
│   │       │   └── export.ts
│   │       └── lib/
│   │           └── calc.ts        ← logika obliczeń kcal
│   └── web/               ← frontend React
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/
│           │   └── client.ts      ← fetch wrapper (`/api/...`)
│           ├── pages/
│           │   ├── Today.tsx      ← główny ekran dnia
│           │   ├── CloseDayPage.tsx ← domknięcie dnia kolacją
│           │   ├── CatsAdmin.tsx
│           │   ├── FoodsAdmin.tsx
│           │   ├── WeightPage.tsx
│           │   └── HistoryPage.tsx ← wykresy spożycia i wagi
│           ├── components/
│           │   ├── DaySummaryCard.tsx
│           │   ├── WeeklySummaryCard.tsx ← podsumowanie 7 dni
│           │   ├── DayNoteInput.tsx     ← notatka dnia (auto-save)
│           │   ├── FeedEntryList.tsx
│           │   ├── AddMealForm.tsx
│           │   ├── CloseDayCalc.tsx
│           │   ├── OfflineBanner.tsx
│           │   └── Layout.tsx
│           ├── constants/
│           │   └── categories.ts  ← kolory i nazwy kategorii
│           └── types/
│               └── index.ts      ← wspólne typy TS
└── scripts/
    └── backup.sh
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
cd catcal
docker compose up --build
```

Aplikacja dostępna na `http://localhost:3000` (w produkcji za Traefik na `cat.sh.info.pl`).

## Kolejność implementacji

Zawsze sprawdź `docs/PLAN.md` przed rozpoczęciem pracy. Realizuj etapy po kolei.

## Ważne zasady

1. **Zero CORS** — frontend i backend pod jednym hostem, fetch po ścieżce `/api`
2. **Zapisuj `kcal_calculated`** na każdym wpisie feed_entry
3. **Kolacja = transakcja** — zapis mięsa + karmy w jednej transakcji DB
4. **Archiwizuj, nie usuwaj** — produkty i koty nigdy nie są kasowane z bazy
5. **Karma standardowa** w MVP: 1 kcal = 1 g (100 kcal/100g), stała systemowa
6. **Migracje** — każda zmiana schematu przez plik migracji Drizzle, nigdy ręcznie
7. **Git** - po kazdej fazie, wiekszym kawalku kodu, rob commit i push na repo.
