// In-memory store mapping Stripe checkout session IDs to resume+JD payloads.
// Fine for a single-instance deploy; swap for Redis/KV for multi-instance.

interface Payload {
  resume: string;
  jd: string;
  createdAt: number;
}

const store = new Map<string, Payload>();

const TTL_MS = 60 * 60 * 1000; // 1 hour

export function save(sessionId: string, resume: string, jd: string) {
  store.set(sessionId, { resume, jd, createdAt: Date.now() });
}

export function get(sessionId: string): Payload | undefined {
  const entry = store.get(sessionId);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(sessionId);
    return undefined;
  }
  return entry;
}

export function del(sessionId: string) {
  store.delete(sessionId);
}
