import { Context, Next } from "hono";
import { createSupabaseAdmin } from "./supabase";
import type { Env } from "../index";

export async function errorHandler(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error("API Error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return c.json({ error: message }, 500);
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const supabase = createSupabaseAdmin(c.env, authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  c.set("userId" as never, user.id);
  c.set("supabase" as never, supabase);
  await next();
}
