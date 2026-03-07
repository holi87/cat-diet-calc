# CatCal — Deployment

## Architektura produkcyjna

```
Internet → Traefik (reverse proxy) → catcal-web (nginx :80) → /api → catcal-api (:4000) → catcal-db (Postgres :5432)
```

- Domena: `cat.sh.info.pl`
- SSL: automatyczny Let's Encrypt przez Traefik
- Frontend: nginx serwuje statyczny build Vite
- Backend: Node.js Fastify na porcie 4000
- Baza: PostgreSQL 16 w Docker volume

## Jak deployować

```bash
ssh serwer
cd /path/to/catcal
git pull
docker compose up --build -d
```

### Co się dzieje po `docker compose up --build`:

1. **catcal-web** — Vite build → nginx z plikami statycznymi
2. **catcal-api** — TypeScript compile → start.sh:
   - `migrate.js` — wykonuje nowe migracje SQL
   - `seed.js` — sprawdza czy dane startowe istnieją
   - `index.js` — startuje serwer Fastify
3. **catcal-db** — Postgres z volume (dane przeżywają restart)

### Przed deployem

1. **Sprawdź czy TypeScript się kompiluje:**
   ```bash
   cd packages/api && npx tsc --noEmit
   cd packages/web && npx tsc --noEmit
   ```
2. **Sprawdź build frontendu:** `cd packages/web && npx vite build`
3. **Zrób backup bazy:** `./scripts/backup.sh`

## Porty

| Usługa | Port wewnętrzny | Port na hoście |
|--------|----------------|----------------|
| web (nginx) | 80 | 8100 |
| api (Fastify) | 4000 | 8101 |
| db (Postgres) | 5432 | 5433 (dev only) |

## Zmienne środowiskowe (.env)

```
POSTGRES_USER=catcal
POSTGRES_PASSWORD=***
POSTGRES_DB=catcal
DATABASE_URL=postgresql://catcal:***@catcal-db:5432/catcal
```

Plik `.env` nie jest w repo (w `.gitignore`).

## Rollback

W razie problemów:

1. `docker compose down`
2. `git revert HEAD` lub `git checkout <commit>`
3. Przywróć backup bazy: `gunzip -c backup.sql.gz | docker exec -i catcal-db psql -U catcal -d catcal`
4. `docker compose up --build -d`
