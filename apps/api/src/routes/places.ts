import { Hono } from "hono";
import type { Env } from "../index";

export const placeRoutes = new Hono<{ Bindings: Env }>();

placeRoutes.get("/restaurants", async (c) => {
  // TODO: Google Places restaurant search
  return c.json({ message: "restaurants" });
});

placeRoutes.get("/attractions", async (c) => {
  // TODO: Google Places attraction search
  return c.json({ message: "attractions" });
});

placeRoutes.get("/:id", async (c) => {
  // TODO: Place detail
  return c.json({ message: "place detail", id: c.req.param("id") });
});
