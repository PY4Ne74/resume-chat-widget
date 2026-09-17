const { kvConfigured, listTalkNowPings } = require("../lib/kv.js");

function isAuthorized(req) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  const provided =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    (req.query && req.query.password) ||
    "";
  return provided === expected;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!kvConfigured()) {
    res.status(200).json({ configured: false, pings: [] });
    return;
  }

  try {
    const pings = await listTalkNowPings(20);
    res.status(200).json({ configured: true, pings });
  } catch (err) {
    console.error("talk-now-poll endpoint error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};
