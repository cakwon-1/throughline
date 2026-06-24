import Redis from "ioredis";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  hkdfSync,
} from "crypto";

// Redis is initialized lazily on first use so the module can be imported
// during `next build` without REDIS_URL being present in the build environment.
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.REDIS_URL) throw new Error("REDIS_URL must be set");
    _redis = new Redis(process.env.REDIS_URL, { lazyConnect: true });
    _redis.on("error", (err) => console.error("[redis] connection error:", err));
  }
  return _redis;
}

const TTL_SECS = 60 * 60 * 2; // 2 hours
const NS = "tl:session:";
const CLAIM_NS = "tl:claimed:";

// Sliding-window rate limiter. Returns true if the request is allowed.
// EXPIRE is called unconditionally to avoid a permanent key if the process
// crashes between INCR and EXPIRE.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSecs: number
): Promise<boolean> {
  const r = getRedis();
  const rlKey = `tl:rl:${key}`;
  const count = await r.incr(rlKey);
  await r.expire(rlKey, windowSecs);
  return count <= limit;
}

function redisKey(sessionId: string) {
  return `${NS}${sessionId}`;
}

function claimKey(sessionId: string) {
  return `${CLAIM_NS}${sessionId}`;
}

// Derives a 32-byte AES key from accessToken + sessionId via HKDF-SHA256.
// accessToken is normalized to lowercase to guard against encoding drift.
// Fixed salt "tl-hkdf-v1" provides application-level domain separation.
// sessionId as `info` ties each derived key to one specific session.
function deriveKey(accessToken: string, sessionId: string): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(accessToken.toLowerCase(), "utf8"),
      "tl-hkdf-v1",
      `tl-session:${sessionId}`,
      32
    )
  );
}

function encrypt(plaintext: string, accessToken: string, sessionId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(accessToken, sessionId), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(ciphertext: string, accessToken: string, sessionId: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(accessToken, sessionId), iv);
  decipher.setAuthTag(tag);
  // Collect both halves as Buffers before decoding to UTF-8 — avoids
  // corruption of multi-byte characters split at a 16-byte AES block boundary.
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// Atomically claim the session and fetch the ciphertext in one round-trip.
// Returns:
//   "CLAIMED" string  — NX failed (another request already holds the claim)
//   null              — NX succeeded but session key is missing (not_found)
//   <ciphertext>      — NX succeeded and session data returned
//
// Using a sentinel string "CLAIMED" instead of Lua `false` because ioredis
// maps both Lua false and Lua nil to JS null, making them indistinguishable.
// On not_found the claim key is deleted so a retry gets not_found (not 409).
const CLAIM_AND_GET_SCRIPT = `
local claimed = redis.call('SET', KEYS[2], '1', 'NX', 'EX', 60)
if not claimed then return 'CLAIMED' end
local val = redis.call('GET', KEYS[1])
if not val then
  redis.call('DEL', KEYS[2])
  return nil
end
return val
`;

export type GetAndDeleteResult =
  | { status: "ok"; payload: { resume: string; jd: string } }
  | { status: "not_found" }
  | { status: "auth_failure" }
  | { status: "already_claimed" };

export async function markPaid(sessionId: string) {
  await getRedis().set(`tl:paid:${sessionId}`, "1", "EX", TTL_SECS);
}

export async function isPaid(sessionId: string): Promise<boolean> {
  return (await getRedis().exists(`tl:paid:${sessionId}`)) === 1;
}

export async function save(
  sessionId: string,
  resume: string,
  jd: string,
  accessToken: string
) {
  const plaintext = JSON.stringify({ resume, jd });
  const ciphertext = encrypt(plaintext, accessToken, sessionId);
  await getRedis().set(redisKey(sessionId), ciphertext, "EX", TTL_SECS);
}

export async function getAndDelete(
  sessionId: string,
  accessToken: string
): Promise<GetAndDeleteResult> {
  const r = getRedis();
  const val = (await r.eval(
    CLAIM_AND_GET_SCRIPT,
    2,
    redisKey(sessionId),
    claimKey(sessionId)
  )) as string | null;

  if (val === "CLAIMED") return { status: "already_claimed" };
  if (val === null) return { status: "not_found" };

  let payload: { resume: string; jd: string };
  try {
    const plaintext = decrypt(val, accessToken, sessionId);
    payload = JSON.parse(plaintext);
  } catch {
    // AES-GCM auth tag failure = wrong accessToken.
    // Delete the claim so the real user can retry immediately.
    await r.del(claimKey(sessionId));
    return { status: "auth_failure" };
  }

  // Decryption succeeded — delete session data and claim key.
  // The paid flag (tl:paid:<id>) is intentionally left to expire on its TTL
  // so that a 500 from the Anthropic call doesn't destroy payment evidence.
  await r.del(redisKey(sessionId), claimKey(sessionId));
  return { status: "ok", payload };
}
