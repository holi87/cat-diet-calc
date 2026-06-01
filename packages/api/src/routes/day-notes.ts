import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { dayNotes } from '../db/schema';
import { createDbClient } from '../db/client';

export async function dayNotesRoutes(fastify: FastifyInstance) {
  const db = createDbClient(fastify);

  // GET /api/day-notes?catId=UUID&date=YYYY-MM-DD
  fastify.get<{ Querystring: { catId: string; date: string } }>(
    '/day-notes',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['catId', 'date'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (req, reply) => {
      const { catId, date } = req.query;

      const [note] = await db
        .select()
        .from(dayNotes)
        .where(and(eq(dayNotes.catId, catId), eq(dayNotes.date, date)));

      if (!note) {
        return reply.send({ catId, date, content: '' });
      }

      return reply.send(note);
    },
  );

  // PUT /api/day-notes — upsert (create or update)
  fastify.put<{
    Body: { catId: string; date: string; content: string };
  }>(
    '/day-notes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['catId', 'date', 'content'],
          properties: {
            catId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            content: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { catId, date, content } = req.body;

      const [note] = await db
        .insert(dayNotes)
        .values({ catId, date, content, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [dayNotes.catId, dayNotes.date],
          set: { content, updatedAt: new Date() },
        })
        .returning();

      return reply.send(note);
    },
  );
}
