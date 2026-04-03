import { Hono } from "hono";
import type { Env } from "../index";

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post("/kakao", async (c) => {
  // TODO: Kakao OAuth login
  return c.json({ message: "kakao login" });
});

authRoutes.post("/google", async (c) => {
  // TODO: Google OAuth login
  return c.json({ message: "google login" });
});

authRoutes.post("/logout", async (c) => {
  // TODO: Logout
  return c.json({ message: "logged out" });
});

authRoutes.get("/me", async (c) => {
  // TODO: Get current user
  return c.json({ message: "current user" });
});
