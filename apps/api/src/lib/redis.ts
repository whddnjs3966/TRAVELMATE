import { Redis } from "@upstash/redis";
import type { Env } from "../index";

export function createRedisClient(env: Env): Redis {
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function getCachedOrFetch<T>(
  redis: Redis,
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  const data = await fetchFn();
  await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
  return data;
}
