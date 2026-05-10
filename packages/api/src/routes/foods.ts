import { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { foods, NewFood } from '../db/schema';

type FoodBody = {
  name: string;
  category: string;
  kcalPer100g: number;
  unit?: 'GRAM' | 'PIECE';
  kcalPerPiece?: number | null;
};

const bodyProperties = {
  name: { type: 'string', minLength: 1 },
  category: { type: 'string', enum: ['BASE', 'KIBBLE', 'WET_FOOD', 'MEAT', 'TREAT'] },
  kcalPer100g: { type: 'number', minimum: 0 },
  unit: { type: 'string', enum: ['GRAM', 'PIECE'] },
  kcalPerPiece: { type: ['number', 'null'], minimum: 0 },
};

export async function foodsRoutes(fastify: FastifyInstance) {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // GET /api/foods
  fastify.get<{ Querystring: { category?: string; archived?: string } }>(
    '/foods',
    async (req, reply) => {
      const { category, archived } = req.query;
      const conditions = [];

      if (archived !== 'true') {
        conditions.push(eq(foods.archived, false));
      }
      if (category) {
        conditions.push(eq(foods.category, category));
      }

      const result =
        conditions.length > 0
          ? await db.select().from(foods).where(and(...conditions))
          : await db.select().from(foods);

      return reply.send(result);
    },
  );

  // POST /api/foods
  fastify.post<{ Body: FoodBody }>(
    '/foods',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'category', 'kcalPer100g'],
          properties: bodyProperties,
        },
      },
    },
    async (req, reply) => {
      const unit = req.body.unit ?? 'GRAM';
      if (unit === 'PIECE' && (req.body.kcalPerPiece == null || req.body.kcalPerPiece <= 0)) {
        return reply.code(400).send({ error: 'kcalPerPiece is required for PIECE unit' });
      }
      const [food] = await db
        .insert(foods)
        .values({
          name: req.body.name,
          category: req.body.category,
          kcalPer100g: String(req.body.kcalPer100g),
          unit,
          kcalPerPiece:
            unit === 'PIECE' && req.body.kcalPerPiece != null
              ? String(req.body.kcalPerPiece)
              : null,
        })
        .returning();
      return reply.code(201).send(food);
    },
  );

  // PUT /api/foods/:id
  fastify.put<{
    Params: { id: string };
    Body: Partial<FoodBody>;
  }>(
    '/foods/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: bodyProperties,
        },
      },
    },
    async (req, reply) => {
      const updateData: Partial<NewFood> = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.kcalPer100g !== undefined)
        updateData.kcalPer100g = String(req.body.kcalPer100g);
      if (req.body.unit !== undefined) updateData.unit = req.body.unit;
      if (req.body.kcalPerPiece !== undefined) {
        updateData.kcalPerPiece =
          req.body.kcalPerPiece == null ? null : String(req.body.kcalPerPiece);
      }
      // If switching to PIECE, ensure kcal_per_piece is set
      if (updateData.unit === 'PIECE') {
        const existingPiece =
          updateData.kcalPerPiece ??
          (await db.select().from(foods).where(eq(foods.id, req.params.id)))[0]?.kcalPerPiece;
        if (existingPiece == null || parseFloat(String(existingPiece)) <= 0) {
          return reply.code(400).send({ error: 'kcalPerPiece is required for PIECE unit' });
        }
      }

      const [food] = await db
        .update(foods)
        .set(updateData)
        .where(eq(foods.id, req.params.id))
        .returning();
      if (!food) return reply.code(404).send({ error: 'Food not found' });
      return reply.send(food);
    },
  );

  // POST /api/foods/:id/archive
  fastify.post<{ Params: { id: string } }>(
    '/foods/:id/archive',
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
      const [food] = await db
        .update(foods)
        .set({ archived: true })
        .where(eq(foods.id, req.params.id))
        .returning();
      if (!food) return reply.code(404).send({ error: 'Food not found' });
      return reply.send(food);
    },
  );
}
