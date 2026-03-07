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

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// Health check
fastify.get('/api/health', async (_req, _reply) => {
  return { status: 'ok' };
});

// Routes
fastify.register(catsRoutes, { prefix: '/api' });
fastify.register(foodsRoutes, { prefix: '/api' });
fastify.register(feedEntriesRoutes, { prefix: '/api' });
fastify.register(daySummaryRoutes, { prefix: '/api' });
fastify.register(closeDayRoutes, { prefix: '/api' });
fastify.register(weightRoutes, { prefix: '/api' });
fastify.register(historyRoutes, { prefix: '/api' });
fastify.register(dayNotesRoutes, { prefix: '/api' });
fastify.register(exportRoutes, { prefix: '/api' });

// Error handler
fastify.setErrorHandler((error, _req, reply) => {
  fastify.log.error(error);
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    error: error.message ?? 'Internal Server Error',
  });
});

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

fastify.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
