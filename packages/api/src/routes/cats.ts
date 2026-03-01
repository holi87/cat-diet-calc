import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { cats, NewCat } from '../db/schema';

export async function catsRoutes(fastify: FastifyInstance) {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // GET /api/cats — list active cats
  fastify.get('/cats', async (_req, reply) => {
    const result = await db.select().from(cats).where(eq(cats.active, true));
    return reply.send(result);
  });

  // POST /api/cats — create cat
  fastify.post<{ Body: Pick<NewCat, 'name' | 'dailyKcalTarget'> }>(
    '/cats',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'dailyKcalTarget'],
          properties: {
            name: { type: 'string', minLength: 1 },
            dailyKcalTarget: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const [cat] = await db
        .insert(cats)
        .values({ name: req.body.name, dailyKcalTarget: req.body.dailyKcalTarget })
        .returning();
      return reply.code(201).send(cat);
    },
  );

  // DELETE /api/cats/:id — soft-delete (set active = false)
  fastify.delete<{ Params: { id: string } }>(
    '/cats/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
      },
    },
    async (req, reply) => {
      const [cat] = await db
        .update(cats)
        .set({ active: false })
        .where(eq(cats.id, req.params.id))
        .returning();
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });
      return reply.code(204).send();
    },
  );

  // PUT /api/cats/:id — update cat
  fastify.put<{
    Params: { id: string };
    Body: Partial<Pick<NewCat, 'name' | 'dailyKcalTarget' | 'active'>>;
  }>(
    '/cats/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            dailyKcalTarget: { type: 'integer', minimum: 1 },
            active: { type: 'boolean' },
          },
        },
      },
    },
    async (req, reply) => {
      const [cat] = await db
        .update(cats)
        .set(req.body)
        .where(eq(cats.id, req.params.id))
        .returning();
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });
      return reply.send(cat);
    },
  );
}
