const { kvConfigured, getAvailability, recordTalkNowPing } = require("../lib/kv.js");

const MAX_PAGE_LENGTH = 300;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

// Same in-memory, per-instance approach as api/chat.js — proportionate for a
// personal resume site, just stops a script from spamming pings.
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (rateLimitStore.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitStore.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function setCors(res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const { page } = req.body || {};
  const safePage = typeof page === "string" ? page.slice(0, MAX_PAGE_LENGTH) : null;

  let available = false;
  try {
    if (kvConfigured()) {
      available = Boolean((await getAvailability()).available);
    }
  } catch (err) {
    console.error("talk-now availability check failed:", err);
  }

  // Record the click regardless of availability — Rob still wants to see a
  // missed attempt in the control room, and this must never block the
  // visitor-facing response.
  recordTalkNowPing({ page: safePage, wasAvailable: available, ip }).catch(() => {});

  res.status(200).json({ available });
};
