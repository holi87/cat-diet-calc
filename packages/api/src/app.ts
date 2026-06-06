import Fastify from 'fastify';
import { catsRoutes } from './routes/cats';
import { foodsRoutes } from './routes/foods';
import { feedEntriesRoutes } from './routes/feed-entries';
import { daySummaryRoutes } from './routes/day-summary';
import { closeDayRoutes } from './routes/close-day';
import { weightRoutes } from './routes/weight';
import { historyRoutes } from './routes/history';
import { dayNotesRoutes } from './routes/day-notes';
import { exportRoutes } from './routes/export';
import { backupRoutes } from './routes/backup';

export function buildApp() {
  const fastify = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            transport:
              process.env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
          },
  });

  fastify.get('/api/health', async () => {
    return { status: 'ok' };
  });

  fastify.register(catsRoutes, { prefix: '/api' });
  fastify.register(foodsRoutes, { prefix: '/api' });
  fastify.register(feedEntriesRoutes, { prefix: '/api' });
  fastify.register(daySummaryRoutes, { prefix: '/api' });
  fastify.register(closeDayRoutes, { prefix: '/api' });
  fastify.register(weightRoutes, { prefix: '/api' });
  fastify.register(historyRoutes, { prefix: '/api' });
  fastify.register(dayNotesRoutes, { prefix: '/api' });
  fastify.register(exportRoutes, { prefix: '/api' });
  fastify.register(backupRoutes, { prefix: '/api' });

  fastify.setErrorHandler((error, _req, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode ?? 500;
    return reply.code(statusCode).send({
      error: error.message ?? 'Internal Server Error',
    });
  });

  return fastify;
}
