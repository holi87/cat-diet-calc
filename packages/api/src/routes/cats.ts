import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { cats, NewCat } from '../db/schema';

export async function catsRoutes(fastify: FastifyInstance) {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // Increase body limit for Base64 photo uploads
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method === 'POST' || routeOptions.method === 'PUT') {
      routeOptions.bodyLimit = 5 * 1024 * 1024; // 5 MB
    }
  });

  // GET /api/cats — list active cats
  fastify.get('/cats', async (_req, reply) => {
    const result = await db.select().from(cats).where(eq(cats.active, true));
    return reply.send(result);
  });

  // POST /api/cats — create cat
  fastify.post<{
    Body: Pick<NewCat, 'name' | 'dailyKcalTarget'> & {
      targetWeightKg?: number | null;
      photo?: string | null;
    };
  }>(
    '/cats',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'dailyKcalTarget'],
          properties: {
            name: { type: 'string', minLength: 1 },
            dailyKcalTarget: { type: 'integer', minimum: 1 },
            targetWeightKg: { type: ['number', 'null'] },
            photo: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { name, dailyKcalTarget, targetWeightKg, photo } = req.body;
      const [cat] = await db
        .insert(cats)
        .values({
          name,
          dailyKcalTarget,
          targetWeightKg: targetWeightKg != null ? String(targetWeightKg) : null,
          photo: photo ?? null,
        })
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
    Body: Partial<
      Pick<NewCat, 'name' | 'dailyKcalTarget' | 'active'> & {
        targetWeightKg?: number | null;
        photo?: string | null;
      }
    >;
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
            targetWeightKg: { type: ['number', 'null'] },
            photo: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { targetWeightKg, ...rest } = req.body;
      const updateData: Record<string, unknown> = { ...rest };

      // Convert targetWeightKg number to string for numeric column
      if (targetWeightKg !== undefined) {
        updateData.targetWeightKg =
          targetWeightKg != null ? String(targetWeightKg) : null;
      }

      const [cat] = await db
        .update(cats)
        .set(updateData)
        .where(eq(cats.id, req.params.id))
        .returning();
      if (!cat) return reply.code(404).send({ error: 'Cat not found' });
      return reply.send(cat);
    },
  );
}
