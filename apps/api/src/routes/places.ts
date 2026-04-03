import { Hono } from "hono";
import type { Env } from "../index";
import { createRedisClient, getCachedOrFetch } from "../lib/redis";
import { CACHE_TTL } from "@tripflow/core";

export const placeRoutes = new Hono<{ Bindings: Env }>();

interface GooglePlacesResponse {
  places: Array<{
    id: string;
    displayName: { text: string; languageCode: string };
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    rating: number;
    userRatingCount: number;
    types: string[];
    photos?: Array<{ name: string }>;
    regularOpeningHours?: { openNow: boolean };
    priceLevel?: string;
  }>;
}

async function searchPlaces(
  env: Env,
  query: string,
  type: string,
  lat?: string,
  lng?: string
): Promise<unknown[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "ko",
    maxResultCount: 10,
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 5000,
      },
    };
  }

  if (type) {
    body.includedType = type;
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos,places.priceLevel",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error(`Google Places API error: ${res.status}`);

  const data: GooglePlacesResponse = await res.json();
  return (data.places || []).map((place) => ({
    id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    lat: place.location.latitude,
    lng: place.location.longitude,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    types: place.types,
    priceLevel: place.priceLevel,
    photoRef: place.photos?.[0]?.name,
  }));
}

// 맛집 검색
placeRoutes.get("/restaurants", async (c) => {
  const { location, category, lat, lng } = c.req.query();

  if (!location) {
    return c.json({ error: "location is required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const query = category ? `${location} ${category} 맛집` : `${location} 맛집`;
  const cacheKey = `places:restaurants:${query}:${lat || ""}:${lng || ""}`;

  const results = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.PLACES, async () => {
    return searchPlaces(c.env, query, "restaurant", lat, lng);
  });

  return c.json({ results });
});

// 관광지 검색
placeRoutes.get("/attractions", async (c) => {
  const { location, lat, lng } = c.req.query();

  if (!location) {
    return c.json({ error: "location is required" }, 400);
  }

  const redis = createRedisClient(c.env);
  const query = `${location} 관광지 명소`;
  const cacheKey = `places:attractions:${query}:${lat || ""}:${lng || ""}`;

  const results = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.PLACES, async () => {
    return searchPlaces(c.env, query, "tourist_attraction", lat, lng);
  });

  return c.json({ results });
});

// 장소 상세
placeRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const redis = createRedisClient(c.env);
  const cacheKey = `places:detail:${id}`;

  const result = await getCachedOrFetch(redis, cacheKey, CACHE_TTL.PLACES, async () => {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${id}`,
      {
        headers: {
          "X-Goog-Api-Key": c.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,types,photos,regularOpeningHours,reviews,websiteUri,nationalPhoneNumber,priceLevel,editorialSummary",
        },
      }
    );

    if (!res.ok) throw new Error(`Google Places detail error: ${res.status}`);
    return res.json();
  });

  return c.json(result);
});
