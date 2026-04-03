import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseAdmin, createSupabaseClient } from "../lib/supabase";
import { authMiddleware } from "../lib/middleware";

export const authRoutes = new Hono<{ Bindings: Env }>();

// 카카오 OAuth - 프론트엔드에서 받은 토큰으로 Supabase 세션 생성
authRoutes.post("/kakao", async (c) => {
  const { access_token } = await c.req.json<{ access_token: string }>();
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "kakao",
    token: access_token,
  });

  if (error) return c.json({ error: error.message }, 400);

  // users 테이블에 프로필 upsert
  const user = data.user;
  if (user) {
    await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      provider: "kakao",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  }

  return c.json({
    session: data.session,
    user: data.user,
  });
});

// 구글 OAuth
authRoutes.post("/google", async (c) => {
  const { access_token } = await c.req.json<{ access_token: string }>();
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: access_token,
  });

  if (error) return c.json({ error: error.message }, 400);

  const user = data.user;
  if (user) {
    await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      provider: "google",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  }

  return c.json({
    session: data.session,
    user: data.user,
  });
});

// 로그아웃
authRoutes.post("/logout", authMiddleware, async (c) => {
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;
  await supabase.auth.signOut();
  return c.json({ message: "logged out" });
});

// 현재 사용자 정보
authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return c.json({ error: "User not found" }, 404);
  return c.json(data);
});
