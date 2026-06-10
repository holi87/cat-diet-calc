# CatCal (cat-diet-calc)

Prywatna aplikacja PWA do kontrolowania dziennej kaloryczności jedzenia kota:
dziennik posiłków, kalkulator „domknięcia dnia" kolacją, waga, historia
z wykresami, backup/restore JSON.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind + TanStack Query (PWA, nginx w prod)
- **Backend:** Node.js 20 + Fastify + Drizzle ORM
- **Baza:** PostgreSQL 16
- **Deploy:** Docker Compose (w produkcji za Traefik / Cloudflare Tunnel)

## Szybki start

```bash
cp .env.example .env          # ustaw POSTGRES_PASSWORD i DATABASE_URL
# pierwsze uruchomienie na świeżej bazie: w .env ustaw RUN_SEED=true
docker compose up --build -d
```

| Usługa | Adres |
|---|---|
| Aplikacja (web) | http://localhost:8100 |
| API | http://localhost:8101/api/health |
| PostgreSQL | localhost:5433 |

## Rozwój lokalny

```bash
# API (wymaga działającego Postgresa, np. z compose)
cd packages/api && npm install && npm run dev        # port 4000

# Web (proxy /api → localhost:4000)
cd packages/web && npm install && npm run dev        # port 5173
```

## Testy

```bash
cd packages/api && npm test          # unit + integracyjne (wymaga DATABASE_URL)
cd packages/web && npm test          # vitest
```

## Dokumentacja

- `AGENTS.md` — instrukcje dla agentów AI (CLAUDE.md to symlink)
- `docs/ARCHITECTURE.md` — architektura, model danych, API
- `docs/DEPLOYMENT.md` — deploy, porty, rollback
- `docs/DATABASE.md` — migracje, backup
- `docs/VERSIONING.md` — wersjonowanie i changelog

Backup bazy: `scripts/backup.sh` (cron: `scripts/crontab.example`).
