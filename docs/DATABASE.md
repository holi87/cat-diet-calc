# CatCal — Baza danych (produkcyjna)

## Ważne

**Baza jest produkcyjna.** Dane użytkownika (posiłki, waga, koty) są prawdziwe i nie mogą zostać utracone. Nie ma środowiska staging.

## Stack

- PostgreSQL 16 (alpine) w kontenerze Docker
- Drizzle ORM 0.30 + drizzle-kit 0.21 do migracji
- Dane persystowane w Docker volume `catcal-db-data`

## Schemat (tabele)

| Tabela | Opis |
|--------|------|
| `cats` | Koty — imię, limit kcal, waga docelowa, zdjęcie (Base64), aktywny |
| `foods` | Produkty — nazwa, kategoria, kcal/100g, archived |
| `feed_entries` | Wpisy posiłków — kot, produkt, gramy, kcal_calculated, datetime |
| `weight_entries` | Pomiary wagi — kot, data, waga kg |
| `day_notes` | Notatki dzienne — kot, data, treść (unique na cat_id+date) |

## Migracje — jak to działa

### Generowanie migracji

```bash
cd packages/api
npx drizzle-kit generate
```

- Porównuje `src/db/schema.ts` z ostatnim stanem w `drizzle/meta/`
- Generuje nowy plik SQL w `drizzle/` (np. `0001_redundant_red_ghost.sql`)
- Plik SQL jest commitowany do repo

### Uruchamianie migracji

Migracje **uruchamiają się automatycznie** przy starcie kontenera API:

```
start.sh → node dist/db/migrate.js → node dist/db/seed.js → node dist/index.js
```

`migrate.ts` czyta pliki z `drizzle/` i wykonuje je w kolejności. Drizzle śledzi które migracje już były uruchomione (tabela `__drizzle_migrations`).

### Zasady bezpieczeństwa

1. **Nigdy nie edytuj ręcznie plików SQL w `drizzle/`** — zawsze generuj przez `drizzle-kit generate`
2. **Nigdy nie usuwaj danych z tabel** — archiwizuj (soft delete: `active=false` / `archived=true`)
3. **Nowe kolumny powinny być nullable** lub mieć default — inaczej migracja na produkcji się wysypie
4. **Testuj migrację lokalnie** przed deployem: `docker compose up --build`
5. **Backup przed deployem** — skrypt `scripts/backup.sh`

## Backup

```bash
./scripts/backup.sh
```

- Robi `pg_dump` z kontenera `catcal-db`
- Kompresuje gzip → `/var/backups/catcal/catcal_YYYYMMDD_HHMMSS.sql.gz`
- Trzyma ostatnie 30 backupów
- Konfigurowalny przez cron: `0 3 * * *`

## Dostęp do bazy (debug)

```bash
# Przez docker exec
docker exec -it catcal-db psql -U catcal -d catcal

# Przez port lokalny (dev, port 5433)
psql postgresql://catcal:catcal_secret_2024@localhost:5433/catcal
```

## Konwencje schematu

- UUID jako primary key (`gen_random_uuid()`)
- Timestamps: `created_at` z defaultem `now()`, `WITH TIME ZONE`
- Soft delete: `archived` (foods) / `active` (cats) — nigdy `DELETE`
- `kcal_calculated` snapshot — zapisywany przy tworzeniu wpisu, nie zmienia się po edycji produktu
- Kolumny numeryczne: `numeric(precision, scale)` — nie `float`
