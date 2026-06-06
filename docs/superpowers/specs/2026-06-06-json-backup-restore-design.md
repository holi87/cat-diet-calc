# JSON Backup / Restore — design

Data: 2026-06-06
Status: zatwierdzony

## Cel

Umożliwić eksport wszystkich danych aplikacji do pliku JSON i import z takiego
pliku — pełny backup/restore oraz migracja między urządzeniami.

## Zakres danych

Pełny snapshot 5 tabel: `cats`, `foods`, `feed_entries`, `weight_entries`,
`day_notes`. Eksportowane są dokładne wartości kolumn (UUID, `numeric` jako
stringi tak jak zwraca Drizzle, `timestamp` jako ISO 8601, `date` jako
`YYYY-MM-DD`).

## Format koperty

```json
{
  "format": "catcal-backup",
  "version": 1,
  "exportedAt": "2026-06-06T10:00:00.000Z",
  "data": {
    "cats": [ /* wiersze */ ],
    "foods": [ ... ],
    "feedEntries": [ ... ],
    "weightEntries": [ ... ],
    "dayNotes": [ ... ]
  }
}
```

## Backend

Nowy moduł `packages/api/src/routes/backup.ts`, rejestrowany w `app.ts` z
prefiksem `/api`. CSV export zostaje osobno w `export.ts`.

### `GET /api/export/json`

Czyta wszystkie 5 tabel, buduje kopertę, zwraca jako załącznik
`catcal-backup-<YYYY-MM-DD>.json` (`Content-Disposition: attachment`).

### `POST /api/import/json`

- Walidacja: `format === "catcal-backup"`, `version === 1`, `data` zawiera 5
  tablic. Niepoprawna koperta → `400`.
- Tryb **replace-all** w jednej transakcji Drizzle:
  1. `DELETE` w kolejności bezpiecznej dla FK: `feed_entries`,
     `weight_entries`, `day_notes`, `foods`, `cats`.
  2. `INSERT` w kolejności parent-first: `cats`, `foods`, `feed_entries`,
     `weight_entries`, `day_notes`.
  3. Zachowane oryginalne `id` i wszystkie kolumny (relacje FK pozostają
     spójne). Pola `timestamp` rzutowane z ISO stringa na `Date` przed insertem.
- Dowolny błąd → rollback (baza nietknięta) + `400`.
- Odpowiedź: liczby wstawionych rekordów per tabela.
- `bodyLimit` podniesiony na tej trasie (duże backupy > 1 MB).

UUID jako PK → brak sekwencji do resetu po imporcie.

## Frontend

Nowa strona `packages/web/src/pages/DataPage.tsx`, trasa `/admin/data`, wpis
„Dane" 💾 w `moreNav` (Layout).

- **Pobierz backup** — `fetch` → blob → pobranie pliku `.json`.
- **Wgraj backup** — `<input type="file">` → parse JSON → dialog potwierdzenia
  („To zastąpi wszystkie dane…") → `POST /api/import/json` → po sukcesie
  komunikat z liczbami + `queryClient.invalidateQueries()` (odświeżenie cache).
- Helper `apiDownload(path)` w `api/client.ts`.

## Testy

Integration test (Node test runner, realny Postgres jak w
`app.integration.test.ts`): round-trip — utwórz dane, `GET /export/json`,
wyczyść/podmień, `POST /import/json`, weryfikuj liczby i zachowanie UUID/relacji.
Plus test odrzucenia niepoprawnej koperty (`400`).

## Dostawa

Branch `feat/json-backup-restore` z `origin/main` → commity tematyczne → PR do
`main`.
