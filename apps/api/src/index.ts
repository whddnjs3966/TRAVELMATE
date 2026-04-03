import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { flightRoutes } from "./routes/flights";
import { tripRoutes } from "./routes/trips";
import { destinationRoutes } from "./routes/destinations";
import { weatherRoutes } from "./routes/weather";
import { placeRoutes } from "./routes/places";
import { reviewRoutes } from "./routes/reviews";

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  AMADEUS_CLIENT_ID: string;
  AMADEUS_CLIENT_SECRET: string;
  OPENWEATHER_API_KEY: string;
  GEMINI_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
  KMA_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://tripflow.pages.dev"],
    credentials: true,
  })
);

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "tripflow-api" }));

// Routes
app.route("/auth", authRoutes);
app.route("/flights", flightRoutes);
app.route("/trips", tripRoutes);
app.route("/destinations", destinationRoutes);
app.route("/weather", weatherRoutes);
app.route("/places", placeRoutes);
app.route("/reviews", reviewRoutes);

export default app;
