import { Hono } from "hono";
import type { Env } from "../index";

export const destinationRoutes = new Hono<{ Bindings: Env }>();

destinationRoutes.get("/recommend", async (c) => {
  // TODO: Condition-based recommendation
  return c.json({ message: "recommendations" });
});

destinationRoutes.get("/popular", async (c) => {
  // TODO: Popular destinations
  return c.json({ message: "popular destinations" });
});

destinationRoutes.get("/:id", async (c) => {
  // TODO: Destination detail
  return c.json({ message: "destination detail", id: c.req.param("id") });
});
