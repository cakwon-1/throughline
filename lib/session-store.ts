import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true });

const TTL_SECS = 60 * 60; // 1 hour

export async function save(sessionId: string, resume: string, jd: string) {
  await redis.set(sessionId, JSON.stringify({ resume, jd }), "EX", TTL_SECS);
}

export async function get(sessionId: string): Promise<{ resume: string; jd: string } | undefined> {
  const val = await redis.get(sessionId);
  if (!val) return undefined;
  return JSON.parse(val);
}

export async function del(sessionId: string) {
  await redis.del(sessionId);
}
