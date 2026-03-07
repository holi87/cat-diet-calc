# CatCal — Plan wdrożenia

## Etap 0: Przygotowanie projektu

### Krok 0.1 — Inicjalizacja repo i struktury
- [ ] Utwórz strukturę katalogów (`packages/api`, `packages/web`, `docs`, `scripts`)
- [ ] Zainicjalizuj `packages/api` (npm init, tsconfig, Dockerfile)
- [ ] Zainicjalizuj `packages/web` (Vite + React + TS + Tailwind, Dockerfile)
- [ ] Utwórz `docker-compose.yml` z trzema usługami: web, api, db
- [ ] Utwórz `.env.example` z wymaganymi zmiennymi

### Krok 0.2 — Baza danych i migracje
- [ ] Skonfiguruj Drizzle ORM w `packages/api`
- [ ] Zdefiniuj schemat (`src/db/schema.ts`): cats, foods, feed_entries, weight_entries
- [ ] Wygeneruj i uruchom pierwszą migrację
- [ ] Napisz seed (`src/db/seed.ts`): domyślny kot + podstawowe produkty
- [ ] Sprawdź, czy `docker compose up` startuje bazę i migruje

### Krok 0.3 — Serwer Fastify (szkielet)
- [ ] Podstawowy `src/index.ts`: Fastify z CORS off, prefix `/api` nie potrzebny (Traefik routuje)
- [ ] Healthcheck: `GET /api/health` → `{ status: "ok" }`
- [ ] Połączenie z bazą (Drizzle + pg)
- [ ] Sprawdź, czy `docker compose up` startuje API i odpowiada na health

---

## Etap 1: MVP — działa i liczy

### Krok 1.1 — API: Koty
- [ ] `GET /api/cats` — lista aktywnych kotów
- [ ] `POST /api/cats` — dodaj kota (name, daily_kcal_target)
- [ ] `PUT /api/cats/:id` — edytuj (name, daily_kcal_target, active)
- [ ] Testy: curl / httpie / Insomnia

### Krok 1.2 — API: Produkty (Foods)
- [ ] `GET /api/foods` — lista (filtry: category, archived)
- [ ] `POST /api/foods` — dodaj (name, category, kcal_per_100g)
- [ ] `PUT /api/foods/:id` — edytuj
- [ ] `POST /api/foods/:id/archive` — archiwizuj (archived=true)

### Krok 1.3 — API: Dziennik jedzenia + podsumowanie dnia
- [ ] `POST /api/feed-entries` — dodaj wpis (catId, foodId, grams, datetime)
  - Oblicz i zapisz `kcal_calculated`
- [ ] `DELETE /api/feed-entries/:id` — usuń wpis
- [ ] `GET /api/day-summary?catId=...&date=YYYY-MM-DD` — podsumowanie:
  - Lista wpisów dnia
  - Suma kcal
  - Limit kota
  - Pozostało kcal

### Krok 1.4 — API: Domknięcie dnia (close-day)
- [ ] `POST /api/close-day` — oblicz bez zapisu:
  - Input: catId, date, meatFoodId, meatGrams, kibbleFoodId (opcjonalny)
  - Output: CloseDayResult (kibbleGrams, overLimitKcal, ...)
- [ ] `POST /api/close-day/commit` — oblicz i zapisz:
  - Transakcja: dodaj 1-2 wpisów feed_entry
  - Zwróć wynik + zapisane wpisy

### Krok 1.5 — Frontend: Layout i nawigacja
- [ ] Komponent `<Layout>` z bottom navigation
- [ ] React Router: `/`, `/close-day`, `/admin/cats`, `/admin/foods`
- [ ] API client (`src/api/client.ts`)
- [ ] Zainstaluj i skonfiguruj React Query

### Krok 1.6 — Frontend: Ekran "Dzisiaj"
- [ ] Dropdown wyboru kota
- [ ] `<DaySummaryCard>` — 3 kafelki (zjedzone / limit / zostało)
- [ ] `<FeedEntryList>` — lista wpisów dnia z usuwaniem
- [ ] `<AddMealForm>` — dropdown produktu + gramatura + "Dodaj"
- [ ] Integracja z React Query (auto-refresh po mutacji)

### Krok 1.7 — Frontend: Ekran "Kolacja" (close-day)
- [ ] Podsumowanie dnia (read-only)
- [ ] Formularz: wybór mięsa + gramatura
- [ ] Obliczenie na żywo (wynik aktualizowany przy zmianie)
- [ ] CTA: warianty (zielony / zamknięty / czerwony)
- [ ] Zapis i feedback po kliknięciu
- [ ] Tryb ręczny (pole + przycisk)

### Krok 1.8 — Frontend: Admin Koty
- [ ] Lista kotów z edycją inline
- [ ] Formularz dodawania kota
- [ ] Toggle aktywności

### Krok 1.9 — Frontend: Admin Produkty
- [ ] Lista z filtrem kategorii
- [ ] Formularz dodawania/edycji
- [ ] Przycisk archiwizacji (z potwierdzeniem)
- [ ] Toggle: pokaż zarchiwizowane

### Krok 1.10 — Deploy i test
- [ ] Skonfiguruj Traefik labels w docker-compose (prod)
- [ ] Deploy na Maca (Docker Desktop)
- [ ] Przetestuj przez `cat.sh.info.pl` z iPhone (Safari)
- [ ] Sprawdź: dodawanie posiłków, domknięcie dnia, admin
- [ ] Skrypt backup (`scripts/backup.sh`)

---

## Etap 2: PWA i wygoda (po stabilnym MVP)

- [ ] `manifest.json` + service worker + ikony
- [ ] "Dodaj do ekranu głównego" na iPhone
- [ ] Szybkie dodawanie: ulubione produkty / ostatnio używane
- [ ] Szablony posiłków (np. "poranny zestaw": karma + mokra)
- [ ] Lepsza obsługa offline (cache API responses)

---

## Etap 3: Analityka i rozszerzenia

- [ ] Ekran wagi: dodawanie + historia
- [ ] Wykres kcal/dzień (ostatnie 7/30 dni)
- [ ] Wykres wagi w czasie (trend, średnia krocząca)
- [ ] Alerty: przekroczenie limitu (notification)
- [ ] Logowanie: JWT + login/hasło (zamiast / oprócz Cloudflare Access)
- [ ] Wielu kotów: globalny przełącznik, osobne dashboardy
