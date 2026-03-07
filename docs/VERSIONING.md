# CatCal — Wersjonowanie

## Schemat wersji

Format: `MAJOR.MINOR.PATCH` (Semantic Versioning)

- **MAJOR** — zmiana łamiąca kompatybilność (nieużywane, bo prywatna apka)
- **MINOR** — nowa funkcjonalność (np. 1.3.0 = Historia, 1.4.0 = notatki + zdjęcia)
- **PATCH** — bugfix lub drobna poprawka (np. 1.3.1 = fix TypeScript)

## Gdzie żyje wersja

| Plik | Zmienna | Opis |
|------|---------|------|
| `packages/web/src/components/Layout.tsx` | `APP_VERSION` | Wyświetlana w stopce i modalu info |
| `packages/web/src/changelog.ts` | `CHANGELOG` | Historia zmian widoczna w apce |

## Procedura podbicia wersji

1. Zmień `APP_VERSION` w `Layout.tsx`
2. Dodaj wpis do `CHANGELOG` w `changelog.ts` (od najstarszego do najnowszego)
3. Commit z wiadomością typu: `v1.4.0 — opis zmian`

## Changelog — format

```typescript
{
  version: '1.4.0',
  changes: [
    'Opis zmiany 1',
    'Opis zmiany 2',
  ],
}
```

- Opisy po polsku (UI jest po polsku)
- Krótkie, zrozumiałe dla użytkownika
- W modalu wyświetlane są ostatnie 3 wersje

## Git — konwencje

- Commit po każdej fazie / większym kawałku kodu
- Wiadomości commitów mogą być po polsku lub angielsku
- Push na `main` po każdym commicie (prywatne repo, brak CI/CD gate)
- Tagi git nie są używane (wersja tylko w kodzie)
