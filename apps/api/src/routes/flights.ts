import { Hono } from "hono";
import type { Env } from "../index";

export const flightRoutes = new Hono<{ Bindings: Env }>();

flightRoutes.get("/search", async (c) => {
  // TODO: Amadeus Flight Offers Search + Redis caching
  const { origin, destination, month, duration } = c.req.query();
  return c.json({ message: "flight search", origin, destination, month, duration });
});

flightRoutes.get("/cheapest-dates", async (c) => {
  // TODO: Monthly cheapest dates for a route
  return c.json({ message: "cheapest dates" });
});

flightRoutes.get("/inspiration", async (c) => {
  // TODO: Amadeus Inspiration - cheapest destinations from origin
  return c.json({ message: "flight inspiration" });
});

flightRoutes.post("/alerts", async (c) => {
  // TODO: Create price alert
  return c.json({ message: "alert created" });
});

flightRoutes.delete("/alerts/:id", async (c) => {
  // TODO: Delete price alert
  return c.json({ message: "alert deleted" });
});

flightRoutes.get("/alerts", async (c) => {
  // TODO: List my price alerts
  return c.json({ message: "my alerts" });
});
