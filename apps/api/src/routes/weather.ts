import { Hono } from "hono";
import type { Env } from "../index";

export const weatherRoutes = new Hono<{ Bindings: Env }>();

weatherRoutes.get("/history", async (c) => {
  // TODO: Past weather data (KMA / OpenWeather)
  return c.json({ message: "weather history" });
});

weatherRoutes.get("/forecast", async (c) => {
  // TODO: Current/short-term forecast
  return c.json({ message: "weather forecast" });
});
