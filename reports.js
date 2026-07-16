const express = require("express");
const { addReport, getTrending } = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
  const { message, platform, category, country, notes } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: "A scam message is required to submit a report." });
  }

  const group = addReport({ message, platform, category, country, notes });
  res.json({
    success: true,
    message: "Thanks — this helps warn others. You've helped protect the community.",
    groupId: group.id,
  });
});

router.get("/trending", (req, res) => {
  const { category, search } = req.query;
  const trending = getTrending({ category, search });
  res.json({ trending });
});

module.exports = router;
