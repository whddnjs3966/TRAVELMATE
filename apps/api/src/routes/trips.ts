import { Hono } from "hono";
import type { Env } from "../index";

export const tripRoutes = new Hono<{ Bindings: Env }>();

tripRoutes.post("/generate", async (c) => {
  // TODO: AI trip generation (Gemini + weather + places)
  return c.json({ message: "trip generated" });
});

tripRoutes.get("/", async (c) => {
  // TODO: List my trips
  return c.json({ message: "my trips" });
});

tripRoutes.get("/:id", async (c) => {
  // TODO: Get trip detail
  return c.json({ message: "trip detail", id: c.req.param("id") });
});

tripRoutes.put("/:id", async (c) => {
  // TODO: Update trip
  return c.json({ message: "trip updated" });
});

tripRoutes.delete("/:id", async (c) => {
  // TODO: Delete trip
  return c.json({ message: "trip deleted" });
});

tripRoutes.post("/:id/share", async (c) => {
  // TODO: Generate share link
  return c.json({ message: "share link created" });
});

tripRoutes.get("/shared/:token", async (c) => {
  // TODO: View shared trip (no auth required)
  return c.json({ message: "shared trip", token: c.req.param("token") });
});

tripRoutes.get("/:id/export/pdf", async (c) => {
  // TODO: PDF export
  return c.json({ message: "pdf export" });
});

tripRoutes.get("/:id/checklist", async (c) => {
  // TODO: Get checklist
  return c.json({ message: "checklist" });
});

tripRoutes.put("/:id/checklist", async (c) => {
  // TODO: Update checklist
  return c.json({ message: "checklist updated" });
});
