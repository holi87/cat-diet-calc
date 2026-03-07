# CatCal — Architektura

## Konteneryzacja (Docker Compose)

### Usługi

| Kontener       | Obraz / Build        | Port wewnętrzny | Opis                        |
|----------------|----------------------|------------------|-----------------------------|
| `catcal-web`   | build: `packages/web`| 3000             | Frontend React (Vite dev / nginx prod) |
| `catcal-api`   | build: `packages/api`| 4000             | Backend Fastify             |
| `catcal-db`    | postgres:16-alpine   | 5432 (tylko wewnętrznie) | PostgreSQL           |

### Sieć

- Wszystkie kontenery w jednej sieci Docker (`catcal-net`).
- Port Postgresa **nie** jest wystawiony na host w produkcji.
- W dev: opcjonalnie wystawiony na `localhost:5433` do debugowania.

### Zmienne środowiskowe (.env)

```env
POSTGRES_USER=catcal
POSTGRES_PASSWORD=<silne_hasło>
POSTGRES_DB=catcal
DATABASE_URL=postgresql://catcal:<hasło>@catcal-db:5432/catcal
```

---

## Model danych (PostgreSQL + Drizzle ORM)

### Tabela: cats

| Kolumna            | Typ          | Opis                          |
|--------------------|--------------|-------------------------------|
| id                 | uuid PK      | `gen_random_uuid()`           |
| name               | text NOT NULL | Imię kota                    |
| daily_kcal_target  | integer NOT NULL | Dzienny limit kcal         |
| active             | boolean      | Default `true`                |
| created_at         | timestamptz  | Default `now()`               |

### Tabela: foods

| Kolumna       | Typ              | Opis                              |
|---------------|------------------|-----------------------------------|
| id            | uuid PK          | `gen_random_uuid()`               |
| name          | text NOT NULL     | Nazwa produktu                   |
| category      | text NOT NULL     | Enum: `KIBBLE`, `WET_FOOD`, `MEAT`, `TREAT` |
| kcal_per_100g | numeric NOT NULL  | Wartość energetyczna              |
| archived      | boolean          | Default `false`                   |
| created_at    | timestamptz      | Default `now()`                   |

### Tabela: feed_entries

| Kolumna         | Typ              | Opis                                   |
|-----------------|------------------|----------------------------------------|
| id              | uuid PK          | `gen_random_uuid()`                    |
| cat_id          | uuid FK → cats   |                                         |
| datetime        | timestamptz      | Kiedy kot jadł                         |
| food_id         | uuid FK → foods  |                                         |
| grams           | numeric NOT NULL  | Ile gramów                            |
| kcal_calculated | numeric NOT NULL  | Obliczone w momencie zapisu            |
| note            | text             | Opcjonalna notatka                     |
| created_at      | timestamptz      | Default `now()`                        |

**Ważne:** `kcal_calculated = grams * kcal_per_100g / 100` — obliczane i zapisywane przy tworzeniu wpisu. Dzięki temu historia nie zmienia się po edycji produktu.

### Tabela: weight_entries

| Kolumna   | Typ              | Opis               |
|-----------|------------------|---------------------|
| id        | uuid PK          | `gen_random_uuid()` |
| cat_id    | uuid FK → cats   |                     |
| date      | date NOT NULL     | Data pomiaru       |
| weight_kg | numeric NOT NULL  | Waga w kg          |
| note      | text             |                     |
| created_at| timestamptz      | Default `now()`     |

### Dane startowe (seed)

Przy pierwszym uruchomieniu wstaw:

```
Kot: "Puszek" (lub inna nazwa), limit 220 kcal, active=true

Produkty:
- "Karma standardowa"   | KIBBLE   | 100 kcal/100g  ← 1g = 1kcal
- "Karma mokra Animonda" | WET_FOOD | 85 kcal/100g
- "Królik surowy"        | MEAT     | 114 kcal/100g
- "Wołowina chuda"       | MEAT     | 121 kcal/100g
- "Drób surowy"          | MEAT     | 110 kcal/100g
```

---

## Logika obliczeń

### Kalorie wpisu

```typescript
function calculateKcal(grams: number, kcalPer100g: number): number {
  return Math.round((grams * kcalPer100g / 100) * 10) / 10; // 1 decimal
}
```

### Podsumowanie dnia

```typescript
interface DaySummary {
  catId: string;
  date: string;              // YYYY-MM-DD
  dailyKcalTarget: number;
  entries: FeedEntry[];
  totalKcal: number;         // suma kcal_calculated
  remainingKcal: number;     // dailyKcalTarget - totalKcal
}
```

### Domknięcie dnia (close-day)

Użytkownik podaje:
- `catId` — który kot
- `date` — jaki dzień (domyślnie dziś)
- `meatFoodId` — jaki dodatek mięsny (opcjonalny)
- `meatGrams` — ile gramów mięsa (opcjonalny, 0 jeśli brak)
- `kibbleFoodId` — opcjonalny; jeśli brak, backend używa karmy standardowej (100 kcal/100g)

Obliczenie:

```
kcalToday = suma kcal_calculated z wpisów danego dnia
kcalMeat = meatGrams * meat.kcalPer100g / 100
kcalLeftForKibble = dailyKcalTarget - kcalToday - kcalMeat
kibbleGrams = kcalLeftForKibble * 100 / kibble.kcalPer100g
```

Odpowiedź:

```typescript
interface CloseDayResult {
  kcalToday: number;
  kcalMeat: number;
  kcalLeftForKibble: number;
  kibbleGrams: number;       // może być ujemne (przekroczenie)
  overLimitKcal: number;     // max(0, -kcalLeftForKibble)
}
```

Zapis (commit): tworzy 1-2 wpisów feed_entry w jednej transakcji DB:
1. Mięso (jeśli meatGrams > 0)
2. Karma (jeśli kibbleGrams > 0; jeśli ujemne — nie dodaje karmy, ale dodaje mięso)

---

## API — Endpointy

Wszystkie pod prefiksem `/api`. Odpowiedzi JSON.

### Koty

| Metoda | Ścieżka           | Opis                        |
|--------|--------------------|-----------------------------|
| GET    | `/api/cats`        | Lista kotów (active=true)   |
| POST   | `/api/cats`        | Dodaj kota                  |
| PUT    | `/api/cats/:id`    | Edytuj (nazwa, limit, active) |

### Produkty (Foods)

| Metoda | Ścieżka                  | Opis                              |
|--------|---------------------------|------------------------------------|
| GET    | `/api/foods`              | Lista (query: `category`, `archived`) |
| POST   | `/api/foods`              | Dodaj produkt                      |
| PUT    | `/api/foods/:id`          | Edytuj produkt                     |
| POST   | `/api/foods/:id/archive`  | Archiwizuj produkt                 |

### Dziennik jedzenia

| Metoda | Ścieżka                  | Opis                              |
|--------|---------------------------|------------------------------------|
| GET    | `/api/day-summary`        | Query: `catId`, `date` → DaySummary |
| POST   | `/api/feed-entries`       | Dodaj wpis                         |
| DELETE | `/api/feed-entries/:id`   | Usuń wpis                          |

### Domknięcie dnia

| Metoda | Ścieżka              | Opis                                    |
|--------|-----------------------|------------------------------------------|
| POST   | `/api/close-day`      | Oblicz (bez zapisu) → CloseDayResult     |
| POST   | `/api/close-day/commit` | Oblicz i zapisz wpisy (transakcja)     |

### Waga (Etap 2/3)

| Metoda | Ścieżka                   | Opis                    |
|--------|----------------------------|--------------------------|
| GET    | `/api/weight-entries`      | Query: `catId` → lista   |
| POST   | `/api/weight-entries`      | Dodaj pomiar wagi        |

---

## Routing produkcyjny

```
Internet → Cloudflare Tunnel → RPi5 → Traefik → Docker
                                                 ├── /      → catcal-web:3000
                                                 └── /api   → catcal-api:4000
```

### Traefik labels (docker-compose)

```yaml
catcal-web:
  labels:
    - "traefik.http.routers.catcal-web.rule=Host(`cat.sh.info.pl`)"
    - "traefik.http.routers.catcal-web.priority=1"

catcal-api:
  labels:
    - "traefik.http.routers.catcal-api.rule=Host(`cat.sh.info.pl`) && PathPrefix(`/api`)"
    - "traefik.http.routers.catcal-api.priority=2"
```

**Efekt:** brak CORS, frontend woła `fetch('/api/...')`.

---

## Bezpieczeństwo (Etap 1)

- Autoryzacja: **Cloudflare Access** (zero kodu w aplikacji)
- Postgres: port nie wystawiony na świat
- Backup: cron z `pg_dump` (skrypt `scripts/backup.sh`)
