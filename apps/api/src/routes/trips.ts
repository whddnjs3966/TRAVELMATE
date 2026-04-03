import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient, createSupabaseAdmin } from "../lib/supabase";
import { createRedisClient, getCachedOrFetch } from "../lib/redis";
import { authMiddleware } from "../lib/middleware";
import { CACHE_TTL } from "@tripflow/core";
import type { GenerateTripRequest } from "@tripflow/core";

export const tripRoutes = new Hono<{ Bindings: Env }>();

// AI 일정 생성
tripRoutes.post("/generate", async (c) => {
  const body = await c.req.json<GenerateTripRequest>();
  const { destination, duration, month, departureCity, startDate, styles } = body;

  if (!destination || !duration || !month) {
    return c.json({ error: "destination, duration, month are required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const cacheKey = `trip:gen:${destination}:${duration}:${month}:${departureCity || ""}:${startDate || ""}`;

  const result = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.AI_SCHEDULE, async () => {
    // 1. 과거 날씨 데이터 조회
    const supabase = createSupabaseClient(c.env);
    const lastYear = new Date().getFullYear() - 1;
    const { data: weatherData } = await supabase
      .from("weather_cache")
      .select("*")
      .eq("location", destination.toLowerCase())
      .gte("date", `${lastYear}-${String(month).padStart(2, "0")}-01`)
      .lte("date", `${lastYear}-${String(month).padStart(2, "0")}-31`);

    // 2. Gemini API로 일정 생성
    const weatherInfo = weatherData && weatherData.length > 0
      ? weatherData.map((w) => `${w.date}: ${JSON.stringify(w.data)}`).join("\n")
      : `${month}월 ${destination} 일반적인 날씨`;

    const prompt = `당신은 전문 여행 플래너입니다.
아래 조건에 맞는 여행 일정을 JSON 형식으로 생성해주세요.

[조건]
- 여행지: ${destination}
- 기간: ${duration}박 ${duration + 1}일
- 출발지: ${departureCity || "미정"}
- 여행 시작일: ${startDate || `${month}월 중`}
- 선호 스타일: ${styles?.join(", ") || "일반"}
- 날씨 데이터: ${weatherInfo}

[규칙]
1. 비올 확률 50% 이상인 날은 실내 위주 동선
2. 맑은 날은 야외 위주 동선
3. 각 일정에 점심, 저녁 맛집 1곳씩 포함
4. 이동 동선이 효율적이도록 같은 지역 스팟을 묶어서 배치
5. 첫날은 도착 시간 고려, 마지막 날은 출발 시간 고려

[출력 형식 - 반드시 유효한 JSON만 출력]
{
  "title": "여행 제목",
  "days": [
    {
      "day_number": 1,
      "theme": "테마",
      "weather_prediction": { "condition": "맑음", "temp_high": 20, "temp_low": 12, "rain_prob": 10 },
      "spots": [
        {
          "time": "10:30",
          "name": "장소명",
          "type": "attraction",
          "category": "해변",
          "duration_min": 60,
          "memo": "한 줄 팁",
          "indoor": false
        }
      ]
    }
  ],
  "packing_tips": ["우산", "썬크림"],
  "budget_estimate": {
    "food": 120000,
    "transport": 40000,
    "admission": 15000,
    "accommodation": 180000
  }
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json() as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
      }>;
    };

    const generatedText = geminiData.candidates[0]?.content?.parts[0]?.text;
    if (!generatedText) throw new Error("Gemini returned empty response");

    return JSON.parse(generatedText);
  });

  return c.json(result);
});

// 내 여행 일정 목록
tripRoutes.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// 일정 상세
tripRoutes.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;

  const [tripRes, daysRes, checklistRes] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).single(),
    supabase.from("trip_days").select("*").eq("trip_id", id).order("day_number"),
    supabase.from("checklists").select("*").eq("trip_id", id).single(),
  ]);

  if (tripRes.error) return c.json({ error: "Trip not found" }, 404);

  return c.json({
    ...tripRes.data,
    days: daysRes.data || [],
    checklist: checklistRes.data || null,
  });
});

// 일정 저장 (AI 생성 결과를 DB에 저장)
tripRoutes.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;
  const body = await c.req.json<{
    title: string;
    destination: string;
    destination_type: string;
    departure_city: string;
    start_date?: string;
    end_date?: string;
    duration_nights: number;
    total_budget_estimate?: number;
    days: Array<{
      day_number: number;
      date?: string;
      weather_summary?: Record<string, unknown>;
      spots: Array<Record<string, unknown>>;
      restaurants?: Array<Record<string, unknown>>;
    }>;
    checklist_items?: Array<Record<string, unknown>>;
  }>();

  // 트립 저장
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      title: body.title,
      destination: body.destination,
      destination_type: body.destination_type,
      departure_city: body.departure_city,
      start_date: body.start_date,
      end_date: body.end_date,
      duration_nights: body.duration_nights,
      total_budget_estimate: body.total_budget_estimate,
      status: "saved",
    })
    .select()
    .single();

  if (tripError) return c.json({ error: tripError.message }, 400);

  // 일별 일정 저장
  if (body.days?.length) {
    await supabase.from("trip_days").insert(
      body.days.map((day) => ({
        trip_id: trip.id,
        day_number: day.day_number,
        date: day.date,
        weather_summary: day.weather_summary,
        spots: day.spots,
        restaurants: day.restaurants || [],
      }))
    );
  }

  // 체크리스트 저장
  if (body.checklist_items?.length) {
    await supabase.from("checklists").insert({
      trip_id: trip.id,
      items: body.checklist_items,
    });
  }

  return c.json(trip, 201);
});

// 일정 수정
tripRoutes.put("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;
  const body = await c.req.json();

  const { data, error } = await supabase
    .from("trips")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// 일정 삭제
tripRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;

  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ message: "deleted" });
});

// 공유 링크 생성
tripRoutes.post("/:id/share", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;

  const shareToken = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const { data, error } = await supabase
    .from("trips")
    .update({ share_token: shareToken })
    .eq("id", id)
    .select("share_token")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ share_token: data.share_token });
});

// 공유된 일정 조회 (인증 불필요)
tripRoutes.get("/shared/:token", async (c) => {
  const token = c.req.param("token");
  const supabase = createSupabaseClient(c.env);

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error || !trip) return c.json({ error: "Shared trip not found" }, 404);

  const { data: days } = await supabase
    .from("trip_days")
    .select("*")
    .eq("trip_id", trip.id)
    .order("day_number");

  return c.json({ ...trip, days: days || [] });
});

// 체크리스트 조회
tripRoutes.get("/:id/checklist", authMiddleware, async (c) => {
  const tripId = c.req.param("id");
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;

  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .eq("trip_id", tripId)
    .single();

  if (error) return c.json({ items: [] });
  return c.json(data);
});

// 체크리스트 업데이트
tripRoutes.put("/:id/checklist", authMiddleware, async (c) => {
  const tripId = c.req.param("id");
  const supabase = c.get("supabase" as never) as ReturnType<typeof createSupabaseAdmin>;
  const { items } = await c.req.json<{ items: Array<Record<string, unknown>> }>();

  const { data, error } = await supabase
    .from("checklists")
    .upsert({
      trip_id: tripId,
      items,
      updated_at: new Date().toISOString(),
    }, { onConflict: "trip_id" })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});
