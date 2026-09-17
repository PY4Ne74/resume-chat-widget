const { kvConfigured, getAvailability, setAvailability } = require("../lib/kv.js");

function isAuthorized(req) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false; // fail closed if no password is set at all
  const provided =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    (req.query && req.query.password) ||
    "";
  return provided === expected;
}

function setCors(res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // GET is intentionally public — the visitor-facing widget needs to know
  // whether to offer a live call, and this leaks nothing beyond a boolean.
  if (req.method === "GET") {
    if (!kvConfigured()) {
      res.status(200).json({ available: false, updatedAt: null });
      return;
    }
    try {
      const status = await getAvailability();
      res.status(200).json(status);
    } catch (err) {
      console.error("availability GET error:", err);
      res.status(200).json({ available: false, updatedAt: null });
    }
    return;
  }

  if (req.method === "POST") {
    if (!isAuthorized(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!kvConfigured()) {
      res.status(200).json({ configured: false });
      return;
    }
    const { available } = req.body || {};
    if (typeof available !== "boolean") {
      res.status(400).json({ error: "Missing or invalid 'available' boolean" });
      return;
    }
    try {
      await setAvailability(available);
      const status = await getAvailability();
      res.status(200).json({ configured: true, ...status });
    } catch (err) {
      console.error("availability POST error:", err);
      res.status(500).json({ error: "Something went wrong" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
