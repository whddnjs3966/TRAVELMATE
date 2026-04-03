import type { Env } from "../index";
import type { Redis } from "@upstash/redis";

interface AmadeusToken {
  access_token: string;
  expires_in: number;
}

const AMADEUS_BASE = "https://test.api.amadeus.com";

async function getAccessToken(env: Env, redis: Redis): Promise<string> {
  const cached = await redis.get<string>("amadeus:token");
  if (cached) return cached;

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.AMADEUS_CLIENT_ID,
      client_secret: env.AMADEUS_CLIENT_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);

  const data: AmadeusToken = await res.json();
  await redis.set("amadeus:token", data.access_token, {
    ex: data.expires_in - 60,
  });
  return data.access_token;
}

export async function amadeusGet(
  env: Env,
  redis: Redis,
  path: string,
  params: Record<string, string>
): Promise<unknown> {
  const token = await getAccessToken(env, redis);
  const url = new URL(`${AMADEUS_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Amadeus API error ${res.status}: ${body}`);
  }

  return res.json();
}
