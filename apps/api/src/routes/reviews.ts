import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient, createSupabaseAdmin } from "../lib/supabase";
import { authMiddleware } from "../lib/middleware";

export const reviewRoutes = new Hono<{ Bindings: Env }>();

// 여행지별 후기 목록
reviewRoutes.get("/", async (c) => {
  const { destination, limit, offset } = c.req.query();
  const supabase = createSupabaseClient(c.env);

  let query = supabase
    .from("reviews")
    .select("*, users(name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(parseInt(limit || "20"))
    .range(parseInt(offset || "0"), parseInt(offset || "0") + parseInt(limit || "20") - 1);

  if (destination) {
    query = query.eq("destination", destination);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// 후기 작성
reviewRoutes.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;
  const body = await c.req.json<{
    trip_id: string;
    destination: string;
    rating: number;
    content: string;
    photos?: string[];
  }>();

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      user_id: userId,
      trip_id: body.trip_id,
      destination: body.destination,
      rating: body.rating,
      content: body.content,
      photos: body.photos || [],
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});
