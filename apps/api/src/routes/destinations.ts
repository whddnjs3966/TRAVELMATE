import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient } from "../lib/supabase";
import { createRedisClient, getCachedOrFetch } from "../lib/redis";
import { CACHE_TTL } from "@tripflow/core";

export const destinationRoutes = new Hono<{ Bindings: Env }>();

// 조건 기반 여행지 추천
destinationRoutes.get("/recommend", async (c) => {
  const { budget, styles, companion, month } = c.req.query();

  const supabase = createSupabaseClient(c.env);
  let query = supabase.from("destinations").select("*").eq("is_active", true);

  // 예산 필터
  if (budget) {
    const budgetMap: Record<string, [number, number]> = {
      low: [0, 80000],
      mid: [30000, 130000],
      high: [70000, 999999],
    };
    const range = budgetMap[budget];
    if (range) {
      query = query.gte("avg_budget_per_day", range[0]).lte("avg_budget_per_day", range[1]);
    }
  }

  // 동반자 필터
  if (companion) {
    query = query.contains("companion_fit", [companion]);
  }

  // 월 필터
  if (month) {
    query = query.contains("best_months", [parseInt(month)]);
  }

  const { data: destinations, error } = await query;
  if (error) return c.json({ error: error.message }, 400);

  // 스타일 태그 매칭 점수 계산
  let results = destinations || [];
  if (styles) {
    const styleList = styles.split(",");
    results = results
      .map((dest) => {
        const matchCount = styleList.filter((s) => dest.tags?.includes(s)).length;
        return { ...dest, matchScore: matchCount / styleList.length };
      })
      .filter((d) => d.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  return c.json({ results: results.slice(0, 10) });
});

// 인기 여행지
destinationRoutes.get("/popular", async (c) => {
  const redis = createRedisClient(c.env);
  const cacheKey = "destinations:popular";

  const results = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.AI_SCHEDULE, async () => {
    const supabase = createSupabaseClient(c.env);
    const currentMonth = new Date().getMonth() + 1;

    const { data } = await supabase
      .from("destinations")
      .select("*")
      .eq("is_active", true)
      .contains("best_months", [currentMonth])
      .limit(6);

    return data || [];
  });

  return c.json({ results });
});

// 여행지 상세
destinationRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return c.json({ error: "Destination not found" }, 404);
  return c.json(data);
});
