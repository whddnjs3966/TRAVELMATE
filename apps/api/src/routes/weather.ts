import { Hono } from "hono";
import type { Env } from "../index";
import { createSupabaseClient } from "../lib/supabase";
import { createRedisClient, getCachedOrFetch } from "../lib/redis";
import { CACHE_TTL } from "@tripflow/core";

export const weatherRoutes = new Hono<{ Bindings: Env }>();

// 과거 날씨 데이터 조회
weatherRoutes.get("/history", async (c) => {
  const { location, month, year } = c.req.query();

  if (!location || !month) {
    return c.json({ error: "location and month are required" }, 400);
  }

  const targetYear = year || String(new Date().getFullYear() - 1);
  const supabase = createSupabaseClient(c.env);

  // DB 캐시 확인
  const startDate = `${targetYear}-${month.padStart(2, "0")}-01`;
  const endDate = `${targetYear}-${month.padStart(2, "0")}-31`;

  const { data: cached } = await supabase
    .from("weather_cache")
    .select("*")
    .eq("location", location.toLowerCase())
    .gte("date", startDate)
    .lte("date", endDate);

  if (cached && cached.length > 0) {
    return c.json({
      location,
      month: parseInt(month),
      year: parseInt(targetYear),
      data: cached.map((w) => ({
        date: w.date,
        ...w.data as Record<string, unknown>,
      })),
    });
  }

  // OpenWeatherMap History API 호출
  const redis = createRedisClient(c.env);
  const cacheKey = `weather:history:${location}:${targetYear}:${month}`;

  const weatherData = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.WEATHER_CURRENT, async () => {
    // 해당 월의 대표 날짜 5개 샘플링으로 과거 날씨 조회
    const monthNum = parseInt(month);
    const sampleDays = [1, 7, 14, 21, 28].filter((d) => d <= new Date(parseInt(targetYear), monthNum, 0).getDate());

    const results = await Promise.allSettled(
      sampleDays.map(async (day) => {
        const date = new Date(parseInt(targetYear), monthNum - 1, day);
        const timestamp = Math.floor(date.getTime() / 1000);

        const res = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=0&lon=0&dt=${timestamp}&appid=${c.env.OPENWEATHER_API_KEY}&units=metric&lang=kr`
        );

        if (!res.ok) return null;
        const data = await res.json() as {
          data: Array<{
            temp: number;
            humidity: number;
            weather: Array<{ main: string; description: string }>;
          }>;
        };

        return {
          date: date.toISOString().split("T")[0],
          temp: data.data?.[0]?.temp,
          humidity: data.data?.[0]?.humidity,
          condition: data.data?.[0]?.weather?.[0]?.main,
          description: data.data?.[0]?.weather?.[0]?.description,
        };
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<{
        date: string;
        temp: number;
        humidity: number;
        condition: string;
        description: string;
      } | null> => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value!);
  });

  // DB에 영구 저장
  if (Array.isArray(weatherData) && weatherData.length > 0) {
    try {
      await supabase.from("weather_cache").upsert(
        (weatherData as Array<{ date: string; temp: number; humidity: number; condition: string; description: string }>).map((w) => ({
          location: location.toLowerCase(),
          date: w.date,
          source: "openweather",
          data: { temp: w.temp, humidity: w.humidity, condition: w.condition, description: w.description },
        })),
        { onConflict: "location,date,source" }
      );
    } catch {
      // ignore DB errors
    }
  }

  return c.json({
    location,
    month: parseInt(month),
    year: parseInt(targetYear),
    data: weatherData,
  });
});

// 현재/단기 예보
weatherRoutes.get("/forecast", async (c) => {
  const { lat, lng, location } = c.req.query();

  if (!lat || !lng) {
    return c.json({ error: "lat and lng are required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const cacheKey = `weather:forecast:${lat}:${lng}`;

  const forecast = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.WEATHER_CURRENT, async () => {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${c.env.OPENWEATHER_API_KEY}&units=metric&lang=kr&cnt=40`
    );

    if (!res.ok) throw new Error(`OpenWeather forecast failed: ${res.status}`);

    const data = await res.json() as {
      list: Array<{
        dt: number;
        main: { temp: number; temp_min: number; temp_max: number; humidity: number };
        weather: Array<{ main: string; description: string; icon: string }>;
        pop: number;
      }>;
    };

    // 일별로 그룹핑
    const byDate = new Map<string, Array<typeof data.list[0]>>();
    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toISOString().split("T")[0];
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(item);
    }

    return Array.from(byDate.entries()).map(([date, items]) => ({
      date,
      temp_high: Math.max(...items.map((i) => i.main.temp_max)),
      temp_low: Math.min(...items.map((i) => i.main.temp_min)),
      humidity: Math.round(items.reduce((s, i) => s + i.main.humidity, 0) / items.length),
      rain_prob: Math.max(...items.map((i) => i.pop)),
      condition: items[Math.floor(items.length / 2)].weather[0].main,
      description: items[Math.floor(items.length / 2)].weather[0].description,
      icon: items[Math.floor(items.length / 2)].weather[0].icon,
    }));
  });

  return c.json({ location: location || `${lat},${lng}`, forecast });
});
