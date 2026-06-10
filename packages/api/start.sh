#!/bin/sh
set -e
echo "Running migrations..."
node dist/db/migrate.js
# Seed only on demand (RUN_SEED=true) — running it on every container restart
# resurrected default data after the user intentionally cleared a table, and a
# seed failure blocked the server in a restart loop.
if [ "$RUN_SEED" = "true" ]; then
  echo "Running seed..."
  node dist/db/seed.js
fi
echo "Starting server..."
exec node dist/index.js
