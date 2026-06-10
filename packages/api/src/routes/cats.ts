import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { cats, NewCat } from '../db/schema';
import { createDbClient } from '../db/client';

export async function catsRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  // Increase body limit for Base64 photo uploads
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.method === 'POST' || routeOptions.method === 'PUT') {
      routeOptions.bodyLimit = 5 * 1024 * 1024; // 5 MB
    }
  });

  // GET /api/cats — list active cats; ?includeInactive=true lists all so the
  // admin view can re-activate a hidden cat
  fastify.get<{ Querystring: { includeInactive?: boolean } }>(
    '/cats',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: { includeInactive: { type: 'boolean' } },
        },
      },
    },
    async (req, reply) => {
      const result = req.query.includeInactive
        ? await db.select().from(cats)
        : await db.select().from(cats).where(eq(cats.active, true));
      return reply.send(result);
    },
  );

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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            dailyKcalTarget: { type: 'integer', minimum: 1, maximum: 2000 },
            targetWeightKg: { type: ['number', 'null'], minimum: 0.1, maximum: 30 },
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            dailyKcalTarget: { type: 'integer', minimum: 1, maximum: 2000 },
            active: { type: 'boolean' },
            targetWeightKg: { type: ['number', 'null'], minimum: 0.1, maximum: 30 },
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
