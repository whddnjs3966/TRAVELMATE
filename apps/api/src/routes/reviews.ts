import { Hono } from "hono";
import type { Env } from "../index";

export const reviewRoutes = new Hono<{ Bindings: Env }>();

reviewRoutes.get("/", async (c) => {
  // TODO: List reviews by destination
  return c.json({ message: "reviews" });
});

reviewRoutes.post("/", async (c) => {
  // TODO: Create review
  return c.json({ message: "review created" });
});
