const { kvConfigured, listConversations, getConversation } = require("../lib/kv.js");

function isAuthorized(req) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false; // fail closed if no password is set at all
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
    res.status(200).json({ configured: false, conversations: [] });
    return;
  }

  try {
    const id = req.query && req.query.id;
    if (id) {
      const conversation = await getConversation(id);
      res.status(200).json({ configured: true, conversation });
      return;
    }
    const conversations = await listConversations(100);
    res.status(200).json({ configured: true, conversations });
  } catch (err) {
    console.error("conversations endpoint error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};
