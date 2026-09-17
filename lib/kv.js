// Thin wrapper around Upstash's REST API (what Vercel KV is backed by).
// Uses plain fetch — no @vercel/kv dependency needed, keeping this project
// dependency-free. Requires KV_REST_API_URL and KV_REST_API_TOKEN, which
// Vercel injects automatically once a KV database is attached to the
// project (Storage tab -> Create Database -> KV).

const CONVERSATION_INDEX_KEY = "conversation:index";
const CONVERSATION_COUNTER_KEY = "conversation:counter";
const MAX_INDEXED_CONVERSATIONS = 500;

const AVAILABILITY_KEY = "talknow:availability";
const PING_INDEX_KEY = "talknow:ping:index";
const PING_COUNTER_KEY = "talknow:ping:counter";
const MAX_INDEXED_PINGS = 50;

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(...args) {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KV command failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.result;
}

function formatConversationId(n) {
  return String(n).padStart(5, "0");
}

// Creates a new conversation record, assigns it the next sequential ID, and
// adds it to the recency-ordered index. Returns the zero-padded ID (e.g.
// "00004"). Never throws to the caller — logging is best-effort and must
// never break the actual chat response.
async function startConversation(firstUserMessage) {
  if (!kvConfigured()) return null;
  try {
    const n = await kvCommand("INCR", CONVERSATION_COUNTER_KEY);
    const id = formatConversationId(n);
    const record = {
      id,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exchanges: [],
    };
    await kvCommand("SET", `conversation:${id}`, JSON.stringify(record));
    await kvCommand("LPUSH", CONVERSATION_INDEX_KEY, id);
    await kvCommand("LTRIM", CONVERSATION_INDEX_KEY, 0, MAX_INDEXED_CONVERSATIONS - 1);
    return id;
  } catch (err) {
    console.error("startConversation failed:", err);
    return null;
  }
}

// Appends one exchange to an existing conversation record. Best-effort —
// logging failures must never break the actual chat response.
async function logExchange(conversationId, userMessage, assistantReply, meta) {
  if (!kvConfigured() || !conversationId) return;
  try {
    const raw = await kvCommand("GET", `conversation:${conversationId}`);
    const record = raw
      ? JSON.parse(raw)
      : { id: conversationId, startedAt: new Date().toISOString(), exchanges: [] };
    record.exchanges.push({
      turn: record.exchanges.length + 1,
      userMessage,
      assistantReply,
      timestamp: new Date().toISOString(),
      ...meta,
    });
    record.updatedAt = new Date().toISOString();
    await kvCommand("SET", `conversation:${conversationId}`, JSON.stringify(record));
  } catch (err) {
    console.error("logExchange failed:", err);
  }
}

async function listConversations(limit) {
  if (!kvConfigured()) return [];
  const ids = await kvCommand("LRANGE", CONVERSATION_INDEX_KEY, 0, (limit || 50) - 1);
  if (!ids || !ids.length) return [];
  const records = await Promise.all(
    ids.map(async (id) => {
      const raw = await kvCommand("GET", `conversation:${id}`);
      return raw ? JSON.parse(raw) : null;
    })
  );
  return records.filter(Boolean);
}

async function getConversation(id) {
  if (!kvConfigured()) return null;
  const raw = await kvCommand("GET", `conversation:${id}`);
  return raw ? JSON.parse(raw) : null;
}

// Rob's "I'm at my computer and available for a live call" toggle, flipped
// from the control room page. Defaults to unavailable (fail closed) when KV
// isn't configured or the key has never been set, so the widget never
// offers a live call nobody will answer.
async function setAvailability(available) {
  if (!kvConfigured()) return;
  const record = { available: Boolean(available), updatedAt: new Date().toISOString() };
  await kvCommand("SET", AVAILABILITY_KEY, JSON.stringify(record));
}

async function getAvailability() {
  if (!kvConfigured()) return { available: false, updatedAt: null };
  const raw = await kvCommand("GET", AVAILABILITY_KEY);
  if (!raw) return { available: false, updatedAt: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { available: false, updatedAt: null };
  }
}

// Records a "talk now" button click so the control room page can alert Rob.
// Best-effort — a failure here must never block the visitor from reaching
// the Meet link, so callers should treat this as fire-and-forget.
async function recordTalkNowPing(meta) {
  if (!kvConfigured()) return null;
  try {
    const n = await kvCommand("INCR", PING_COUNTER_KEY);
    const record = { id: n, timestamp: new Date().toISOString(), ...meta };
    await kvCommand("SET", `talknow:ping:${n}`, JSON.stringify(record));
    await kvCommand("LPUSH", PING_INDEX_KEY, String(n));
    await kvCommand("LTRIM", PING_INDEX_KEY, 0, MAX_INDEXED_PINGS - 1);
    return record;
  } catch (err) {
    console.error("recordTalkNowPing failed:", err);
    return null;
  }
}

async function listTalkNowPings(limit) {
  if (!kvConfigured()) return [];
  const ids = await kvCommand("LRANGE", PING_INDEX_KEY, 0, (limit || 20) - 1);
  if (!ids || !ids.length) return [];
  const records = await Promise.all(
    ids.map(async (id) => {
      const raw = await kvCommand("GET", `talknow:ping:${id}`);
      return raw ? JSON.parse(raw) : null;
    })
  );
  return records.filter(Boolean);
}

module.exports = {
  kvConfigured,
  startConversation,
  logExchange,
  listConversations,
  getConversation,
  setAvailability,
  getAvailability,
  recordTalkNowPing,
  listTalkNowPings,
};
