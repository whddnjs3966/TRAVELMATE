import { Hono } from "hono";
import type { Env } from "../index";
import { createRedisClient, getCachedOrFetch } from "../lib/redis";
import { amadeusGet } from "../lib/amadeus";
import { createSupabaseClient } from "../lib/supabase";
import { authMiddleware } from "../lib/middleware";
import { CACHE_TTL } from "@tripflow/core";

export const flightRoutes = new Hono<{ Bindings: Env }>();

// 항공권 검색
flightRoutes.get("/search", async (c) => {
  const { origin, destination, departureDate, returnDate, adults } = c.req.query();

  if (!origin || !destination || !departureDate) {
    return c.json({ error: "origin, destination, departureDate are required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const cacheKey = `flights:${origin}:${destination}:${departureDate}:${returnDate || "oneway"}`;

  const results = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.FLIGHTS, async () => {
    const params: Record<string, string> = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: adults || "1",
      currencyCode: "KRW",
      max: "10",
    };
    if (returnDate) params.returnDate = returnDate;

    const data = await amadeusGet(c.env, redis, "/v2/shopping/flight-offers", params) as {
      data: Array<{
        id: string;
        source: string;
        instantTicketingRequired: boolean;
        itineraries: Array<{
          duration: string;
          segments: Array<{
            departure: { iataCode: string; at: string };
            arrival: { iataCode: string; at: string };
            carrierCode: string;
            number: string;
            numberOfStops: number;
            duration: string;
          }>;
        }>;
        price: { total: string; currency: string };
        validatingAirlineCodes: string[];
      }>;
      dictionaries?: { carriers?: Record<string, string> };
    };

    const carriers = data.dictionaries?.carriers || {};

    return data.data.map((offer) => ({
      id: offer.id,
      price: Math.round(parseFloat(offer.price.total)),
      currency: offer.price.currency,
      airline: carriers[offer.validatingAirlineCodes[0]] || offer.validatingAirlineCodes[0],
      airlineCode: offer.validatingAirlineCodes[0],
      itineraries: offer.itineraries.map((itin) => ({
        duration: itin.duration,
        segments: itin.segments.map((seg) => ({
          departure: seg.departure,
          arrival: seg.arrival,
          carrier: carriers[seg.carrierCode] || seg.carrierCode,
          flightNumber: `${seg.carrierCode}${seg.number}`,
          stops: seg.numberOfStops,
          duration: seg.duration,
        })),
      })),
    }));
  });

  // DB에 검색 기록 저장 (비동기, 실패해도 무시)
  try {
    const supabase = createSupabaseClient(c.env);
    const cheapest = Array.isArray(results) && results.length > 0
      ? (results as Array<{ price: number }>)[0].price
      : null;
    await supabase.from("flight_searches").insert({
      origin,
      destination,
      departure_date: departureDate,
      return_date: returnDate || null,
      cheapest_price: cheapest,
      results: JSON.stringify(results),
    });
  } catch {
    // ignore DB errors for search logging
  }

  return c.json({ results });
});

// 월별 최저가 날짜
flightRoutes.get("/cheapest-dates", async (c) => {
  const { origin, destination, month, duration } = c.req.query();

  if (!origin || !destination || !month) {
    return c.json({ error: "origin, destination, month are required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const cacheKey = `cheapest:${origin}:${destination}:${month}:${duration || "3"}`;
  const durationNights = parseInt(duration || "3");

  const results = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.FLIGHTS, async () => {
    // 해당 월의 날짜들을 생성하여 검색
    const year = new Date().getFullYear();
    const monthNum = parseInt(month);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const dateOptions: Array<{ departureDate: string; returnDate: string }> = [];
    for (let d = 1; d <= endDate.getDate() - durationNights; d += 3) {
      const dep = new Date(year, monthNum - 1, d);
      const ret = new Date(year, monthNum - 1, d + durationNights);
      dateOptions.push({
        departureDate: dep.toISOString().split("T")[0],
        returnDate: ret.toISOString().split("T")[0],
      });
    }

    const searchResults = await Promise.allSettled(
      dateOptions.map(async ({ departureDate, returnDate }) => {
        const data = await amadeusGet(c.env, redis, "/v2/shopping/flight-offers", {
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate,
          returnDate,
          adults: "1",
          currencyCode: "KRW",
          max: "1",
        }) as { data: Array<{ price: { total: string } }> };

        return {
          departureDate,
          returnDate,
          price: data.data[0] ? Math.round(parseFloat(data.data[0].price.total)) : null,
        };
      })
    );

    return searchResults
      .filter((r): r is PromiseFulfilledResult<{ departureDate: string; returnDate: string; price: number | null }> =>
        r.status === "fulfilled" && r.value.price !== null
      )
      .map((r) => r.value)
      .sort((a, b) => (a.price || 0) - (b.price || 0));
  });

  return c.json({ results });
});

// 출발지 기준 최저가 목적지 추천
flightRoutes.get("/inspiration", async (c) => {
  const { origin, month } = c.req.query();

  if (!origin) {
    return c.json({ error: "origin is required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const cacheKey = `inspiration:${origin}:${month || "any"}`;

  const results = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.AI_SCHEDULE, async () => {
    const params: Record<string, string> = {
      origin,
      maxPrice: "500000",
    };
    if (month) {
      const year = new Date().getFullYear();
      params.departureDate = `${year}-${month.padStart(2, "0")}-01`;
    }

    const data = await amadeusGet(
      c.env, redis,
      "/v1/shopping/flight-destinations",
      params
    ) as { data: Array<{ destination: string; departureDate: string; returnDate: string; price: { total: string } }> };

    return data.data.map((d) => ({
      destination: d.destination,
      departureDate: d.departureDate,
      returnDate: d.returnDate,
      price: Math.round(parseFloat(d.price.total)),
    }));
  });

  return c.json({ results });
});

// 가격 알림 등록
flightRoutes.post("/alerts", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const body = await c.req.json<{
    origin: string;
    destination: string;
    month: number;
    duration_nights: number;
    target_price: number;
  }>();

  const supabase = createSupabaseClient(c.env);
  const { data, error } = await supabase.from("price_alerts").insert({
    user_id: userId,
    ...body,
  }).select().single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

// 가격 알림 삭제
flightRoutes.delete("/alerts/:id", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const id = c.req.param("id");

  const supabase = createSupabaseClient(c.env);
  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ message: "deleted" });
});

// 내 가격 알림 목록
flightRoutes.get("/alerts", authMiddleware, async (c) => {
  const userId = c.get("userId" as never) as string;
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});
